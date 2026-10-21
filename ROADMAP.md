# How we die, then and now — roadmap

A data story about causes of death: what killed people a generation ago, what kills them now, where in life and where
in the world. Built in Angular, one lesson at a time, like The Carbon Divide (`../data-viz`), whose foundations it starts
from (copied in, never linked).

## 1. The idea

One recurring picture, **"if 100 people died"**: a waffle of 100 squares, one per death, coloured by cause. It morphs as
the reader moves through time (1990 → 2021), place (world → regions → their country) and age. Around it, a few charts
that each answer one question: what changed, where, at what age, and why (wealth).

## 2. Decisions

| Topic | Choice | Why |
|---|---|---|
| Framework | Angular 21, standalone, zoneless, no SSR | Same as The Carbon Divide: its kit drops in |
| Shared kit | Copied from `../data-viz` in lesson 00: paper styles, lesson window, lesson page, URL state, flat map, legend, timeline | The workspace rule: shared code is copied in, never linked out |
| Data | Global Burden of Disease 2021 (IHME, via Our World in Data) by cause, country, region, income group, age, sex, 1990–2021; child mortality since 1800 (Gapminder / OWID); life tables (UN World Population Prospects) | Abundant, documented, consistent across countries |
| Licences | IHME data: non-commercial use, with attribution. OWID: CC BY 4.0. UN WPP: CC BY 3.0 IGO | Recorded in the data files and on the methodology page (lesson 09) |
| Default measure | Age-standardised death rates to compare places; counts for "how many" | Japan has many cancer deaths because its people are old, not because it is unhealthy |
| Grouping | 7 World Bank regions and 4 income groups for comparisons; countries in the explorer | Seven panels fit as small multiples; income tracks the change in causes almost perfectly |
| Cause tree | 3 families (infectious, maternal, neonatal and nutritional · non-communicable · injuries) → ~22 groups → main causes | GBD's own hierarchy: one colour family per branch |
| Tone | Calm palette (no red for death), slow transitions, plain wording ("deaths from", not "killers") | It is about people |
| Uncertainty | Kept in the data, shown in the country view | Most country figures are modelled estimates, not counts |

## 3. Lessons

| # | Lesson | Product change | Concepts |
|---|---|---|---|
| 00 | Setup | Angular 21 app; the kit copied in from data-viz; placeholder page; lesson window; roadmap | What to copy and what to leave behind; a starter kit from a finished project |
| 01 | Data pipeline | Node script: causes of death by country, region, income group, age, sex, 1990–2021; the cause tree; child mortality since 1800; UN life tables. All as compact JSON | Hierarchical data, counts vs age-standardised rates, uncertainty ranges, licences |
| 02 | "If 100 people died" | The hero waffle: 100 squares by cause family, morphing world 1990 ↔ 2021 | Unit charts, stable square identity, GSAP FLIP-style morphs, categorical colour |
| 03 | Causes over time | Small multiples: one 100% stacked area per region, 1990–2021, same scale; a region / income group switch | Small multiples, shared scales, d3 `stack()`, the COVID notch |
| 04 | Ranks and the cause tree | Bump chart of the top 10 causes 1990 → 2021, and a zoomable icicle of the cause tree | `d3-hierarchy` partition, rank crossings, linked hover |
| 05 | Who reaches 50, 70, 90 | Survival curves from life tables (1900 vs today; Japan, Nigeria, world) and child mortality since 1800 | Life tables, the "rectangularisation" of survival, area between curves as years gained |
| 06 | Where in life we die | Age pyramid of deaths (men / women mirrored), 1990 vs 2021, counts / rates toggle | Diverging bars, rates vs counts, young men's injury spike |
| 07 | What kills most, where | Map of the leading cause per country, then vs now; a Marimekko by region | Categorical choropleth, Marimekko |
| 08 | The transition | Connected scatter: GDP per person × share of infectious deaths, a trail per country 1990–2021, on the timeline | Trails, the epidemiological transition, log axes, clutter |
| 09 | Story and ship | Scroll story (waffle → survival → regions → transition → your country), country explorer with uncertainty, methodology page, static build | ScrollTrigger → store, uncertainty display, tone, attribution, deploy |

Lessons 02–08 each add one chart and don't depend on each other: they can be reordered or dropped. The story comes last
because it only arranges charts that already exist.

## 4. Lesson workflow

1. You ask for lesson N.
2. Claude implements only that lesson: the product change, its lesson page, its route and a roadmap tick.
3. Each lesson page ends with **"Files in this lesson"** and a **"Review checklist"**.
4. You review, ask questions or request changes, then commit it yourself.
