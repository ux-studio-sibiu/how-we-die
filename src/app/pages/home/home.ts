import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Backdrop } from '../../ui/backdrop/backdrop';

// The product page. For now a title card on the paper: the charts arrive from lesson 02 ("if 100 people died").
@Component({
  selector: 'app-home',
  imports: [Backdrop, RouterLink],
  template: `
    <section class="nsc-home" aria-label="How we die, then and now">
      <app-backdrop class="backdrop" />
      <div class="card">
        <p class="kicker">A data story</p>
        <h1>How we die, then and now</h1>
        <p>What killed people a generation ago, what kills them now, where in life and where in the world.</p>
        <p class="note">The first chart, "if 100 people died", arrives in lesson 02. <a [routerLink]="[{ outlets: { lesson: ['lessons'] } }]">See the roadmap</a>.</p>
      </div>
    </section>
  `,
  styleUrl: './home.scss'
})
export class Home {}
