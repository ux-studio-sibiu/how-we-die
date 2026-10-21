import { Component, computed, inject, signal } from '@angular/core';
import { CauseNode, Deaths } from '../../data/deaths';
import { figure, people } from '../../data/format';
import { LessonPage } from '../lesson-page/lesson-page';

@Component({
  selector: 'app-lesson-data',
  imports: [LessonPage],
  templateUrl: './lesson-data.html',
  styleUrl: './lesson-data.scss'
})
export class LessonData {
  protected readonly deaths = inject(Deaths);

  // The inspector: a place, a year, counts or rates; the cause tree with each node's value and its share of all deaths
  protected readonly placeId = signal('OWID_WRL');
  protected readonly year = signal(2021);
  protected readonly measure = signal<'count' | 'rate'>('count');

  protected readonly places = computed(() => {
    const order = { world: 0, continent: 1, country: 2 };
    return [...this.deaths.places().values()].sort((a, b) => order[a.kind] - order[b.kind] || a.name.localeCompare(b.name));
  });
  private readonly values = computed(() => (this.measure() === 'count' ? this.deaths.count() : this.deaths.rate())[this.placeId()]);
  private readonly index = computed(() => this.year() - (this.deaths.file()?.firstYear ?? 2000));

  protected value(id: string) { return this.values()?.[id]?.[this.index()] ?? null; }
  protected share(id: string) {
    const all = this.value('all'), v = this.value(id);
    return all && v !== null ? v / all : null;
  }
  protected children(id: string): CauseNode[] { return this.deaths.childrenOf().get(id) ?? []; }

  // The check the build script promises: the 4 families add up to all causes
  protected readonly familySum = computed(() => this.children('all').reduce((s, f) => s + (this.value(f.id) ?? 0), 0));

  protected format(v: number | null) {
    if (v === null) return '–';
    return this.measure() === 'count' ? people.format(v) : figure.format(v);
  }
  protected percent(v: number | null) { return v === null ? '' : `${(v * 100).toFixed(1)}%`; }
}
