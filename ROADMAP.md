# How we die, then and now — roadmap

A data story about causes of death: what killed people a generation ago, what kills them now, where in life and where
in the world. Built in Angular, one lesson at a time, like The Carbon Divide (`../data-viz`), whose foundations it starts
from (copied in, never linked).

## 1. The idea

One recurring picture, **"if 100 people died"**: a waffle of 100 squares, one per death, coloured by cause. It morphs as
the reader moves through time (2000 → 2021), place (world → continents → their country) and age. Around it, a few charts
that each answer one question: what changed, where, at what age, and why (wealth).

## 2. Decisions

| Topic | Choice | Why |
|---|---|---|
| Framework | Angular 21, standalone, zoneless, no SSR | Same as The Carbon Divide: its kit drops in |
| Shared kit | Copied from `../data-viz` in lesson 00: paper styles, lesson window, lesson page, URL state, flat map, legend, timeline | The workspace rule: shared code is copied in, never linked out |
| Data | WHO Global Health Estimates 2021 (via Our World in Data): deaths by cause, country, continent, age (5 bands), sex, 2000–2021. Child mortality since 1950 and life expectancy since 1751 (OWID). Life tables come in lesson 05 | Free to download and reuse. GBD (IHME) goes back to 1990, but it sits behind a registration form and OWID's GBD charts can't be downloaded |
| Licences | WHO GHE: CC BY-NC-SA 3.0 IGO (non-commercial, with attribution, share-alike). OWID: CC BY 4.0. UN WPP: CC BY 3.0 IGO | Recorded in the data files and on the methodology page (lesson 09) |
| Default measure | Age-standardised death rates to compare places; counts for "how many" | Japan has many cancer deaths because its people are old, not because it is unhealthy |
| Grouping | The world and 6 continents (summed by OWID, rates included); 4 income groups from summed counts; 194 countries in the explorer | Seven panels fit as small multiples. A group's age-standardised rate can't be rebuilt from its countries, so income groups compare counts and shares |
| Cause tree | 4 families (infectious, maternal, newborn and nutritional · non-communicable · injuries · the COVID-19 pandemic) → 17 groups → 40 named causes, with an "other" remainder in each group | WHO's hierarchy, with COVID-19 taken out of respiratory infections, so every level adds up. One colour family per branch |
| Tone | Calm palette (no red for death), slow transitions, plain wording ("deaths from", not "killers") | It is about people |
| Uncertainty | Not in WHO's republished table, so it is explained in words on the methodology page | Most country figures are modelled estimates, not counts |

## 3. Lessons

| # | Lesson | Product change | Concepts |
|---|---|---|---|
| 00 | Setup | Angular 21 app; the kit copied in from data-viz; placeholder page; lesson window; roadmap | What to copy and what to leave behind; a starter kit from a finished project |
| 01 | Data pipeline | Node script reading WHO's 20-million-row Parquet table: deaths and age-standardised rates by place and cause, 2000–2021; the cause tree; deaths by age and sex; child mortality and life expectancy. All as compact JSON | Hierarchical data, counts vs age-standardised rates, Parquet, licences |
| 02 | "If 100 people died" | The hero waffle: 100 squares by cause family, morphing world 2000 ↔ 2021 | Unit charts, stable square identity, GSAP FLIP-style morphs, categorical colour |
| 03 | Causes over time | Small multiples: one 100% stacked area per continent, 2000–2021, same scale; a continent / income group switch | Small multiples, shared scales, d3 `stack()`, the COVID notch |
| 04 | Ranks and the cause tree | Bump chart of the top 10 causes 2000 → 2021, and a zoomable icicle of the cause tree | `d3-hierarchy` partition, rank crossings, linked hover |
| 05 | Who reaches 50, 70, 90 | Survival curves from life tables (a new download: UN WPP; Japan, Nigeria, world) and child mortality since 1950 | Life tables, the "rectangularisation" of survival, area between curves as years gained |
| 06 | Where in life we die | Age pyramid of deaths (men / women mirrored) in 5 age bands, 2000 vs 2021, counts / rates toggle | Diverging bars, rates vs counts, young men's injury spike |
| 07 | What kills most, where | Map of the leading cause per country, then vs now; a Marimekko by continent | Categorical choropleth, Marimekko |
| 08 | The transition | Connected scatter: GDP per person × share of infectious deaths, a trail per country 2000–2021, on the timeline | Trails, the epidemiological transition, log axes, clutter |
| 09 | Story and ship | Scroll story (waffle → survival → continents → transition → your country), country explorer, methodology page, static build | ScrollTrigger → store, tone, attribution, deploy |

Lessons 02–08 each add one chart and don't depend on each other: they can be reordered or dropped. The story comes last
because it only arranges charts that already exist.

## 4. Lesson workflow

1. You ask for lesson N.
2. Claude implements only that lesson: the product change, its lesson page, its route and a roadmap tick.
3. Each lesson page ends with **"Files in this lesson"** and a **"Review checklist"**.
4. You review, ask questions or request changes, then commit it yourself.
