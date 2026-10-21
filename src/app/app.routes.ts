import { Routes } from '@angular/router';
import { Home } from './pages/home/home';

// The product lives at '' and ships in the main bundle. Lessons are a lazy route subtree (their own chunks).
export const routes: Routes = [
  { path: '', component: Home, title: 'How we die, then and now' },
  { path: 'lessons', loadChildren: () => import('./lessons/lessons.routes').then(m => m.lessonRoutes) },
  // The same lesson routes again, for the named outlet in the lesson window → /(lesson:lessons/setup)
  { path: 'lessons', outlet: 'lesson', loadChildren: () => import('./lessons/lessons.routes').then(m => m.lessonRoutes) },
  { path: '**', redirectTo: '' }
];
