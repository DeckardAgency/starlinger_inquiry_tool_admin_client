import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarService } from '@services/sidebar.service';
import { NotificationComponent } from "@shared/components/notification/notification.component";
import { TopBarComponent } from "./topbar/top-bar.component";
import { SidebarComponent } from "./sidebar/sidebar.component";

@Component({
    selector: 'app-main-layout',
    imports: [
        RouterOutlet,
        SidebarComponent,
        TopBarComponent,
        NotificationComponent,
        TopBarComponent,
        SidebarComponent
    ],
    template: `
    <div class="app">
      <app-top-bar></app-top-bar>
      <app-sidebar></app-sidebar>
      <main class="app__main" [class.app__main--collapsed]="sidebarService.isCollapsed()">
        <router-outlet></router-outlet>
      </main>
      <app-notification></app-notification>
    </div>
  `,
    styleUrls: ['./main-layout.component.scss']
})
export class MainLayoutComponent {
    constructor(public sidebarService: SidebarService) {}
}
