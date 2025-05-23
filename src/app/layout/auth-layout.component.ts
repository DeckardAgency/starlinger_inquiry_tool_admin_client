import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
    selector: 'app-auth-layout',
    imports: [RouterOutlet],
    template: `
    <div class="auth-layout">
      <router-outlet></router-outlet>
    </div>
  `,
    styles: [`
    .auth-layout {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
  `]
})
export class AuthLayoutComponent {}
