import { Component } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { SidebarComponent } from './layout/sidebar/sidebar.component';
import { TopBarComponent } from './layout/topbar/top-bar.component';
import { AsyncPipe } from '@angular/common';
import { filter } from 'rxjs/operators';
import { SidebarService } from '@services/sidebar.service';
import { LoginModalComponent } from '@shared/components/modals/login-modal/login-modal.component';
import { AuthService } from '@core/auth/auth.service';
import {NotificationComponent} from "@shared/components/notification/notification.component";

@Component({
  selector: 'app-root',
  standalone: true,
    imports: [
        RouterOutlet,
        SidebarComponent,
        TopBarComponent,
        AsyncPipe,
        LoginModalComponent,
        NotificationComponent
    ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'starlinger_inquiry_tool_admin_client';
  currentRoute: string = '';
  isAuthenticated: boolean = false

  constructor(
    public sidebarService: SidebarService,
    private router: Router,
    private authService: AuthService
  ) {
    // Subscribe to router events to keep track of current route
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.currentRoute = event.url;
    });

    // Initialize current route
    this.currentRoute = this.router.url;

    // Subscribe to authentication state changes
    this.authService.isAuthenticated$.subscribe(isAuth => {
      this.isAuthenticated = isAuth;
    });
  }

  onLoginSuccess(): void {
    // Handle successful login - e.g., redirect to dashboard
    this.router.navigate(['/dashboard']);
  }

}
