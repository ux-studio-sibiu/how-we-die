import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { LessonWindow } from './lessons/lesson-window/lesson-window';
import { DockBar } from './ui/dock/dock-bar';

// Root component: a small floating header, then whichever page matches the URL, and the lesson window over it.
// Copied from The Carbon Divide (../data-viz) in lesson 00, with its explorer-specific parts left behind.
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, LessonWindow, DockBar],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private readonly router = inject(Router);

  // Is the home page underneath (primary outlet ''), whatever the lesson window shows?
  // routerLinkActive can't answer this: with "(lesson:…)" in the URL, the "/" link no longer matches exactly.
  protected readonly onHome = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(() => this.router.routerState.snapshot.root.children.find(c => c.outlet === 'primary')?.routeConfig?.path === '')
    ),
    { initialValue: false }
  );
}
