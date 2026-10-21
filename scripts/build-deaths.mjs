// Lesson 01: builds the data the charts load.
//   npm run data            (uses the cached downloads)
//   npm run data -- --fresh (downloads again)
//
// Inputs (cached in scripts/.cache, git-ignored):
//   WHO Global Health Estimates 2021 (2000–2021), the full table republished by Our World in Data: country × year ×
//   age group × sex × cause → deaths and death rates. 20 million rows, 247 MB of Parquet. CC BY-NC-SA 3.0 IGO.
//   Our World in Data: child mortality (UN WPP, 1950–2023) and life expectancy (long-run). CC BY 4.0.
// Outputs (public/data):
//   causes.json           the cause tree, the places, sources and licences
//   deaths-count.json     deaths, both sexes, all ages: values[place][cause] = [2000 … 2021]
//   deaths-rate.json      age-standardised death rates per 100,000, both sexes
//   deaths-by-age.json    deaths by sex × age band × family, and the population of each band (for rates)
//   child-mortality.json  share of children dying before age 5, %
//   life-expectancy.json  life expectancy at birth, years

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { asyncBufferFromFile, parquetMetadataAsync, parquetReadObjects } from 'hyparquet';
import { compressors } from 'hyparquet-compressors';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cache = join(root, 'scripts/.cache');
const out = join(root, 'public/data');
const UA = { 'User-Agent': 'Mozilla/5.0 (how-we-die build script)' }; // OWID answers 403 to clients without one

const SOURCES = {
  ghe: {
    file: 'who-ghe-2024-07-30.parquet', // pinned: OWID's catalog version of WHO GHE 2021
    url: 'https://catalog.ourworldindata.org/garden/who/2024-07-30/ghe/ghe.parquet',
    citation: 'Global Health Estimates 2021: Deaths by Cause, Age, Sex, by Country and by Region, 2000–2021. Geneva, World Health Organization; 2024. Via Our World in Data.',
    license: 'CC BY-NC-SA 3.0 IGO'
  },
  childMortality: {
    file: 'owid-child-mortality.csv',
    url: 'https://ourworldindata.org/grapher/child-mortality-around-the-world.csv?v=1&csvType=full&useColumnShortNames=true',
    citation: 'UN, World Population Prospects (2024), processed by Our World in Data.',
    license: 'CC BY 4.0'
  },
  lifeExpectancy: {
    file: 'owid-life-expectancy.csv',
    url: 'https://ourworldindata.org/grapher/life-expectancy.csv?v=1&csvType=full&useColumnShortNames=true',
    citation: 'UN, World Population Prospects (2024); Human Mortality Database (2024); Zijdeman et al. (2015); Riley (2005). Processed by Our World in Data.',
    license: 'CC BY 4.0'
  }
};

// --- 1. Download (once) ---------------------------------------------------------------------------
for (const s of Object.values(SOURCES)) {
  const path = join(cache, s.file);
  if (process.argv.includes('--fresh') || !existsSync(path)) {
    console.log(`Downloading ${s.url}`);
    const res = await fetch(s.url, { headers: UA });
    if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
    await mkdir(cache, { recursive: true });
    await writeFile(path, Buffer.from(await res.arrayBuffer()));
  }
}

// --- 2. The cause tree ----------------------------------------------------------------------------
// WHO's causes come as a flat list of 216 names, at every level of its hierarchy at once. The tree is written out here:
// 4 families → groups → the main causes, each group closed by an "other" remainder so every level adds up.
//
// One change from WHO's own tree: COVID-19 is its own family. WHO files it under respiratory infections, inside
// communicable diseases, which would show infectious disease surging in 2020–21. And WHO keeps 1.84 million "other
// pandemic-related" deaths (2021) outside all three families; they join COVID-19 here. Families then sum to all causes.
//
// node: id, name, and either `who` (the WHO cause it reads), `sum` (children it adds up), or `minus` (subtracted).
const TREE = [
  { id: 'infectious', name: 'Infectious, maternal, newborn and nutritional', groups: [
    { id: 'infections', name: 'Infections and parasites', who: 'Infectious and parasitic diseases', causes: [
      ['tuberculosis', 'Tuberculosis'], ['hiv', 'HIV/AIDS'], ['diarrhoea', 'Diarrhoeal diseases'], ['malaria', 'Malaria'], ['meningitis', 'Meningitis']] },
    { id: 'respiratory-infections', name: 'Respiratory infections', who: 'Respiratory infections', minus: ['COVID-19'], causes: [
      ['lower-respiratory', 'Lower respiratory infections']] },
    { id: 'maternal', name: 'Maternal conditions', who: 'Maternal conditions', causes: [] },
    { id: 'neonatal', name: 'Newborn conditions', who: 'Neonatal conditions', causes: [
      ['preterm', 'Preterm birth complications'], ['birth-asphyxia', 'Birth asphyxia and birth trauma'], ['neonatal-sepsis', 'Neonatal sepsis and infections']] },
    { id: 'nutritional', name: 'Nutritional deficiencies', who: 'Nutritional deficiencies', causes: [
      ['malnutrition', 'Protein-energy malnutrition']] }
  ] },
  { id: 'noncommunicable', name: 'Non-communicable diseases', groups: [
    { id: 'cardiovascular', name: 'Heart disease and stroke', who: 'Cardiovascular diseases', causes: [
      ['ischaemic-heart', 'Ischaemic heart disease'], ['stroke', 'Stroke'], ['hypertensive-heart', 'Hypertensive heart disease'],
      ['cardiomyopathy', 'Cardiomyopathy, myocarditis, endocarditis'], ['rheumatic-heart', 'Rheumatic heart disease']] },
    { id: 'cancers', name: 'Cancers', who: 'Malignant neoplasms', causes: [
      ['lung-cancer', 'Trachea, bronchus, lung cancers'], ['colorectal-cancer', 'Colon and rectum cancers'], ['stomach-cancer', 'Stomach cancer'],
      ['liver-cancer', 'Liver cancer'], ['breast-cancer', 'Breast cancer'], ['pancreas-cancer', 'Pancreas cancer'], ['prostate-cancer', 'Prostate cancer'],
      ['oesophagus-cancer', 'Oesophagus cancer'], ['cervix-cancer', 'Cervix uteri cancer'], ['leukaemia', 'Leukaemia']] },
    { id: 'chronic-respiratory', name: 'Chronic respiratory diseases', who: 'Respiratory diseases', causes: [
      ['copd', 'Chronic obstructive pulmonary disease'], ['asthma', 'Asthma']] },
    { id: 'neurological', name: 'Neurological conditions', who: 'Neurological conditions', causes: [
      ['dementia', 'Alzheimer disease and other dementias'], ['parkinson', 'Parkinson disease'], ['epilepsy', 'Epilepsy']] },
    { id: 'digestive', name: 'Digestive diseases', who: 'Digestive diseases', causes: [['cirrhosis', 'Cirrhosis of the liver']] },
    { id: 'kidney', name: 'Kidney and urinary diseases', who: 'Genitourinary diseases', causes: [['kidney-disease', 'Kidney diseases']] },
    { id: 'diabetes', name: 'Diabetes', who: 'Diabetes mellitus', causes: [] },
    { id: 'other-ncd', name: 'Other non-communicable diseases', sum: ['Other neoplasms', 'Endocrine, blood, immune disorders', 'Mental and substance use disorders',
      'Sense organ diseases', 'Skin diseases', 'Musculoskeletal diseases', 'Congenital anomalies', 'Oral conditions', 'Sudden infant death syndrome'], causes: [] }
  ] },
  { id: 'injuries', name: 'Injuries', groups: [
    { id: 'unintentional', name: 'Accidents', who: 'Unintentional injuries', causes: [
      ['road', 'Road injury'], ['falls', 'Falls'], ['drowning', 'Drowning'], ['poisoning', 'Poisonings'], ['fire', 'Fire, heat and hot substances']] },
    { id: 'intentional', name: 'Violence and self-harm', who: 'Intentional injuries', causes: [
      ['self-harm', 'Self-harm'], ['interpersonal-violence', 'Interpersonal violence'], ['collective-violence', 'Collective violence and legal intervention']] }
  ] },
  { id: 'covid', name: 'COVID-19 pandemic', groups: [
    { id: 'covid-19', name: 'COVID-19', who: 'COVID-19', causes: [] },
    { id: 'covid-other', name: 'Other pandemic-related deaths', who: 'Other COVID-19 pandemic-related outcomes', causes: [] }
  ] }
];

// Every WHO cause name the tree reads, to filter the 20 million rows down to what's needed
const WANTED = new Set(['All Causes']);
for (const f of TREE) for (const g of f.groups) {
  for (const n of [g.who, ...(g.minus ?? []), ...(g.sum ?? [])]) if (n) WANTED.add(n);
  for (const [, who] of g.causes) WANTED.add(who);
}

// --- 3. Places ------------------------------------------------------------------------------------
// WHO's table names places the way Our World in Data does, so OWID's own files (which carry ISO3 codes) give the codes.
// The 7 aggregates (World and six continents, computed by OWID) get OWID-style codes of their own.
const AGGREGATES = { World: 'OWID_WRL', Africa: 'OWID_AFR', Asia: 'OWID_ASI', Europe: 'OWID_EUR', 'North America': 'OWID_NAM', Oceania: 'OWID_OCE', 'South America': 'OWID_SAM' };
const lifeRows = parseCsv(await readFile(join(cache, SOURCES.lifeExpectancy.file), 'utf8'));
const codeOf = new Map(Object.entries(AGGREGATES));
for (const r of lifeRows) if (r.code && !r.code.startsWith('OWID')) codeOf.set(r.entity, r.code);

// --- 4. Read the table, one row group at a time ----------------------------------------------------
// WHO's table has these 5 bands for every cause; the finer 10-year bands it lists exist for self-harm only
const AGES = ['YEARS0-4', 'YEARS5-14', 'YEARS15-49', 'YEARS50-69', 'YEARS70+'];
const AGE_LABELS = ['0–4', '5–14', '15–49', '50–69', '70+'];
const FIRST = 2000, LAST = 2021, YEARS = LAST - FIRST + 1;
// Families by WHO's own level-1 names, for the by-age file (the tree's families are rebuilt from these below)
const FAMILY_SOURCES = ['All Causes', 'Communicable, maternal, perinatal and nutritional conditions', 'Noncommunicable diseases', 'Injuries', 'COVID-19', 'Other COVID-19 pandemic-related outcomes'];
for (const n of FAMILY_SOURCES) WANTED.add(n);

const count = {}, rate = {}, byAge = {}; // place → WHO cause → year array; byAge: place → sex → age → cause → years
const series = (store, place, cause) => ((store[place] ??= {})[cause] ??= new Array(YEARS).fill(null));
const unknown = new Set(), seen = new Set();

const file = await asyncBufferFromFile(join(cache, SOURCES.ghe.file));
const metadata = await parquetMetadataAsync(file);
let start = 0;
for (const group of metadata.row_groups) {
  const end = start + Number(group.num_rows);
  const rows = await parquetReadObjects({ file, compressors, metadata, rowStart: start, rowEnd: end, columns: ['country', 'year', 'age_group', 'sex', 'cause', 'death_rate100k', 'death_count'] });
  for (const r of rows) {
    if (!WANTED.has(r.cause)) continue;
    seen.add(r.cause);
    const place = codeOf.get(r.country);
    if (!place) { unknown.add(r.country); continue; }
    const y = r.year - FIRST;
    if (r.sex === 'Both sexes') {
      if (r.age_group === 'ALLAges') series(count, place, r.cause)[y] = r.death_count;
      else if (r.age_group === 'Age-standardized') series(rate, place, r.cause)[y] = r.death_rate100k;
    } else if (FAMILY_SOURCES.includes(r.cause) && AGES.includes(r.age_group)) {
      const s = r.sex === 'Male' ? 'male' : 'female';
      const cell = (((byAge[place] ??= {})[s] ??= {})[r.age_group] ??= {});
      (cell[r.cause] ??= new Array(YEARS).fill(null))[y] = r.death_count;
      // The population of the band, from all causes: deaths ÷ (deaths per 100,000) × 100,000. Lets lesson 06 turn any
      // count into a rate without a second dataset.
      if (r.cause === 'All Causes' && r.death_rate100k > 0) (cell.population ??= new Array(YEARS).fill(null))[y] = (r.death_count / r.death_rate100k) * 1e5;
    }
  }
  start = end;
  process.stdout.write(`\rRead ${(end / 1e6).toFixed(1)} M of ${(Number(metadata.num_rows) / 1e6).toFixed(1)} M rows`);
}
console.log();
if (unknown.size) console.log(`Places without a code (skipped): ${[...unknown].join(', ')}`);
const missing = [...WANTED].filter(n => !seen.has(n));
if (missing.length) throw new Error(`Causes not in WHO's table (check the spelling): ${missing.join(', ')}`);

// --- 5. Values for the tree -----------------------------------------------------------------------
// Each node's yearly values from WHO's: read, add up, or subtract. Families add their groups; "other" nodes are a group
// minus its named causes. Works for counts and for age-standardised rates alike: rates standardised to the same
// population add up the same way counts do.
const nodes = []; // { id, name, parent, level, family }
for (const f of TREE) {
  nodes.push({ id: f.id, name: f.name, parent: null, level: 1, family: f.id });
  for (const g of f.groups) {
    nodes.push({ id: g.id, name: g.name, parent: f.id, level: 2, family: f.id });
    for (const [id, who] of g.causes) nodes.push({ id, name: shortName(who), parent: g.id, level: 3, family: f.id });
    if (g.causes.length) nodes.push({ id: `${g.id}-other`, name: `Other ${g.name.toLowerCase()}`, parent: g.id, level: 3, family: f.id, other: true });
  }
}

const round = (v, kind) => (v === null || !Number.isFinite(v) ? null : kind === 'count' ? Math.round(v) : Number(v.toPrecision(3)));
function treeValues(store, kind) {
  const values = {};
  for (const [place, causes] of Object.entries(store)) {
    const get = name => causes[name] ?? new Array(YEARS).fill(null);
    const combine = (parts, sign = 1) => parts.reduce((acc, arr) => acc.map((v, i) => (v === null || arr[i] === null ? null : v + sign * arr[i])));
    const row = {};
    for (const f of TREE) {
      const groupArrays = [];
      for (const g of f.groups) {
        let arr = g.sum ? combine(g.sum.map(get)) : get(g.who);
        if (g.minus) arr = combine([arr, ...g.minus.map(get)], -1);
        row[g.id] = arr;
        groupArrays.push(arr);
        if (g.causes.length) {
          const named = g.causes.map(([id, who]) => (row[id] = get(who)));
          row[`${g.id}-other`] = arr.map((v, i) => (v === null ? null : Math.max(0, v - named.reduce((s, c) => s + (c[i] ?? 0), 0))));
        }
      }
      row[f.id] = combine(groupArrays);
    }
    row.all = get('All Causes');
    values[place] = Object.fromEntries(Object.entries(row).map(([k, arr]) => [k, arr.map(v => round(v, kind))]));
  }
  return values;
}

// The by-age file, at family level: WHO's level-1 causes turned into the tree's 4 families (COVID-19 taken out of
// infectious, joined by the other pandemic deaths)
const ageValues = {};
for (const [place, sexes] of Object.entries(byAge)) {
  for (const [sex, ages] of Object.entries(sexes)) {
    for (const [age, c] of Object.entries(ages)) {
      const g = n => c[n] ?? new Array(YEARS).fill(null);
      const covid = g('COVID-19').map((v, i) => (v ?? 0) + (g('Other COVID-19 pandemic-related outcomes')[i] ?? 0));
      const cell = {
        all: g('All Causes'),
        infectious: g('Communicable, maternal, perinatal and nutritional conditions').map((v, i) => (v === null ? null : v - (g('COVID-19')[i] ?? 0))),
        noncommunicable: g('Noncommunicable diseases'),
        injuries: g('Injuries'),
        covid,
        population: c.population ?? new Array(YEARS).fill(null)
      };
      (((ageValues[place] ??= {})[sex] ??= {})[AGE_LABELS[AGES.indexOf(age)]] = Object.fromEntries(Object.entries(cell).map(([k, arr]) => [k, arr.map(v => round(v, 'count'))])));
    }
  }
}

// --- 6. Child mortality and life expectancy ---------------------------------------------------------
// OWID's own files: one column of values; keep our places, from each one's first year with data
function owidSeries(rows, column) {
  const values = {};
  for (const r of rows) {
    const place = r.code && !r.code.startsWith('OWID') ? r.code : AGGREGATES[r.entity];
    if (!place || r[column] === '' || r[column] === undefined) continue;
    (values[place] ??= {})[+r.year] = Number((+r[column]).toPrecision(4));
  }
  // { place: { first, values: [first … last] } }: compact even for life expectancy, which starts in 1751 for Sweden
  return Object.fromEntries(Object.entries(values).map(([place, byYear]) => {
    const years = Object.keys(byYear).map(Number).sort((a, b) => a - b);
    return [place, { first: years[0], values: years.length ? Array.from({ length: years[years.length - 1] - years[0] + 1 }, (_, i) => byYear[years[0] + i] ?? null) : [] }];
  }));
}
const childRows = parseCsv(await readFile(join(cache, SOURCES.childMortality.file), 'utf8'));

// --- 7. Write -----------------------------------------------------------------------------------
const names = new Map([...codeOf].map(([name, code]) => [code, name]));
const places = Object.keys(count).sort().map(id => ({ id, name: names.get(id) ?? id, kind: id === 'OWID_WRL' ? 'world' : id.startsWith('OWID_') ? 'continent' : 'country' }));
const write = (name, data) => writeFile(join(out, name), JSON.stringify(data));
await mkdir(out, { recursive: true });
await write('causes.json', {
  source: SOURCES.ghe.citation, license: SOURCES.ghe.license, url: 'https://www.who.int/data/global-health-estimates',
  firstYear: FIRST, lastYear: LAST, causes: nodes, places,
  note: 'COVID-19 is its own family here; WHO files it under respiratory infections. "Other …" causes are a group minus its named causes.'
});
await write('deaths-count.json', { measure: 'deaths', unit: 'deaths', firstYear: FIRST, values: treeValues(count, 'count') });
await write('deaths-rate.json', { measure: 'age-standardised death rate', unit: 'deaths per 100,000', firstYear: FIRST, values: treeValues(rate, 'rate') });
await write('deaths-by-age.json', { measure: 'deaths by sex and age, by family; population of each band', unit: 'deaths; people', firstYear: FIRST, ages: AGE_LABELS, values: ageValues });
await write('child-mortality.json', { measure: 'share of children who die before age 5', unit: '%', source: SOURCES.childMortality.citation, license: SOURCES.childMortality.license, values: owidSeries(childRows, 'mortality_rate__sex_all__age_0_4__variant_estimates') });
await write('life-expectancy.json', { measure: 'life expectancy at birth', unit: 'years', source: SOURCES.lifeExpectancy.citation, license: SOURCES.lifeExpectancy.license, values: owidSeries(lifeRows, 'life_expectancy_0') });

const world = treeValues(count, 'count').OWID_WRL;
const at = (id, y) => world[id][y - FIRST];
console.log(`${places.length} places, ${nodes.length} causes. World 2021: all ${(at('all', 2021) / 1e6).toFixed(2)} M = ${TREE.map(f => `${f.id} ${(at(f.id, 2021) / 1e6).toFixed(2)} M`).join(' + ')}`);

// Short display names for WHO's longer ones
function shortName(who) {
  return ({ 'Trachea, bronchus, lung cancers': 'Lung cancer', 'Colon and rectum cancers': 'Colorectal cancer', 'Cervix uteri cancer': 'Cervical cancer',
    'Chronic obstructive pulmonary disease': 'COPD', 'Alzheimer disease and other dementias': 'Alzheimer\'s and other dementias',
    'Cardiomyopathy, myocarditis, endocarditis': 'Cardiomyopathy and myocarditis', 'Collective violence and legal intervention': 'War and conflict',
    'Fire, heat and hot substances': 'Fire and heat', 'Protein-energy malnutrition': 'Malnutrition', 'Road injury': 'Road injuries' })[who] ?? who;
}

// The CSV reader from The Carbon Divide's scripts: quoted fields, "" for a quote inside one
function parseCsv(text) {
  const records = [];
  let record = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { record.push(field); field = ''; }
    else if (ch === '\n') { record.push(field); records.push(record); record = []; field = ''; }
    else if (ch !== '\r') field += ch;
  }
  if (field || record.length) { record.push(field); records.push(record); }
  const [header, ...body] = records;
  return body.filter(r => r.length > 1).map(r => Object.fromEntries(header.map((h, i) => [h, r[i]])));
}
