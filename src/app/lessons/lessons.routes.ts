import { Routes } from '@angular/router';

// One entry per lesson, in order (the lesson window's prev/next follow this order). Each page is its own lazy chunk.
export const lessonRoutes: Routes = [
  { path: '', loadComponent: () => import('./roadmap/roadmap').then(m => m.Roadmap), title: 'Roadmap' },
  { path: 'setup', loadComponent: () => import('./lesson-setup/lesson-setup').then(m => m.LessonSetup), title: '00 Setup' }
];
