import { httpResource } from '@angular/common/http';
import { computed, Injectable } from '@angular/core';

// The shape of the files scripts/build-deaths.mjs writes (lesson 01). TypeScript can't check a JSON file fetched at
// runtime, so each loader's `parse` checks the few things every chart relies on, and fails loudly if a rebuild changed
// them, instead of drawing a blank chart.

export type FamilyId = 'infectious' | 'noncommunicable' | 'injuries' | 'covid';
export const FAMILIES: FamilyId[] = ['infectious', 'noncommunicable', 'injuries', 'covid'];

export type CauseNode = {
  id: string;            // 'ischaemic-heart'; 'all' is the root, not listed
  name: string;          // display name ('Ischaemic heart disease')
  parent: string | null; // null for the 4 families
  level: 1 | 2 | 3;      // family, group, cause
  family: FamilyId;
  other?: true;          // a remainder: its group minus the group's named causes
};

export type Place = { id: string; name: string; kind: 'world' | 'continent' | 'country' }; // id: ISO3, or OWID_WRL, OWID_AFR …

export type CausesFile = {
  source: string;
  license: string;
  url: string;
  firstYear: number;
  lastYear: number;
  causes: CauseNode[];
  places: Place[];
  note: string;
};

// values[place][cause] = one number per year, firstYear … lastYear. Counts are whole deaths; rates are per 100,000,
// age-standardised (as if every place had the same age mix, so a young country and an old one compare fairly).
export type SeriesFile = { measure: string; unit: string; firstYear: number; values: Record<string, Record<string, number[]>> };

export type Sex = 'male' | 'female';
export type AgeCell = Record<FamilyId | 'all' | 'population', number[]>;
export type ByAgeFile = { measure: string; unit: string; firstYear: number; ages: string[]; values: Record<string, Record<Sex, Record<string, AgeCell>>> };

// Long-run series start in a different year per place: values[0] is `first`
export type LongSeries = { first: number; values: (number | null)[] };
export type LongRunFile = { measure: string; unit: string; source: string; license: string; values: Record<string, LongSeries> };

function check<T>(file: T, ok: boolean, name: string): T {
  if (!ok) throw new Error(`data/${name} doesn't have the expected shape: run npm run data`);
  return file;
}
const parseSeries = (name: string) => (raw: unknown) => {
  const f = raw as SeriesFile;
  return check(f, typeof f.firstYear === 'number' && Array.isArray(f.values?.['OWID_WRL']?.['all']), name);
};

// Causes, counts and rates: what almost every view needs. Loaded once for the app (providedIn: 'root'), when a view
// first injects it.
@Injectable({ providedIn: 'root' })
export class Deaths {
  private readonly meta = httpResource(() => 'data/causes.json', {
    parse: raw => {
      const f = raw as CausesFile;
      return check(f, Array.isArray(f.causes) && Array.isArray(f.places) && f.causes.some(c => c.level === 1), 'causes.json');
    }
  });
  private readonly counts = httpResource(() => 'data/deaths-count.json', { parse: parseSeries('deaths-count.json') });
  private readonly rates = httpResource(() => 'data/deaths-rate.json', { parse: parseSeries('deaths-rate.json') });

  readonly isLoading = computed(() => this.meta.isLoading() || this.counts.isLoading() || this.rates.isLoading());
  readonly error = computed(() => this.meta.error() ?? this.counts.error() ?? this.rates.error());

  readonly file = computed(() => this.meta.value());
  readonly years = computed(() => {
    const f = this.meta.value();
    return f ? Array.from({ length: f.lastYear - f.firstYear + 1 }, (_, i) => f.firstYear + i) : [];
  });
  readonly causes = computed(() => new Map((this.meta.value()?.causes ?? []).map(c => [c.id, c])));
  readonly places = computed(() => new Map((this.meta.value()?.places ?? []).map(p => [p.id, p])));
  readonly childrenOf = computed(() => {
    const map = new Map<string, CauseNode[]>();
    for (const c of this.meta.value()?.causes ?? []) {
      const parent = c.parent ?? 'all';
      map.set(parent, [...(map.get(parent) ?? []), c]);
    }
    return map;
  });

  readonly count = computed(() => this.counts.value()?.values ?? {});
  readonly rate = computed(() => this.rates.value()?.values ?? {});
}

// Deaths by sex and age band: lessons 06 and 09 only, so a service of its own that loads when one of them injects it
@Injectable({ providedIn: 'root' })
export class DeathsByAge {
  private readonly res = httpResource(() => 'data/deaths-by-age.json', {
    parse: raw => {
      const f = raw as ByAgeFile;
      return check(f, Array.isArray(f.ages) && !!f.values?.['OWID_WRL']?.male, 'deaths-by-age.json');
    }
  });
  readonly isLoading = this.res.isLoading;
  readonly error = this.res.error;
  readonly file = computed(() => this.res.value());
}

// Child mortality since 1950 and life expectancy since the 1700s: the long view behind 2000–2021
@Injectable({ providedIn: 'root' })
export class LongRun {
  private readonly parse = (name: string) => (raw: unknown) => {
    const f = raw as LongRunFile;
    return check(f, typeof f.values?.['OWID_WRL']?.first === 'number', name);
  };
  private readonly child = httpResource(() => 'data/child-mortality.json', { parse: this.parse('child-mortality.json') });
  private readonly life = httpResource(() => 'data/life-expectancy.json', { parse: this.parse('life-expectancy.json') });

  readonly isLoading = computed(() => this.child.isLoading() || this.life.isLoading());
  readonly error = computed(() => this.child.error() ?? this.life.error());
  readonly childMortality = computed(() => this.child.value());
  readonly lifeExpectancy = computed(() => this.life.value());
}

// The value for one year of a long-run series, or null outside it
export function at(series: LongSeries | undefined, year: number): number | null {
  return series?.values[year - series.first] ?? null;
}
