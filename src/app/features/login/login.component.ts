import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '@core/auth/auth.service';
import { animate, style, transition, trigger } from '@angular/animations';

@Component({
    selector: 'app-login',
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss'],
    animations: [
        trigger('fadeAnimation', [
            transition(':enter', [
                style({ opacity: 0 }),
                animate('200ms ease-out', style({ opacity: 1 }))
            ])
        ])
    ]
})
export class LoginComponent implements OnInit {
  username: string = '';
  password: string = '';
  errorMessage: string = '';
  isLoading: boolean = false;
  returnUrl: string = '/dashboard';
  rememberMe: boolean = false;
  showPassword: boolean = false;

  constructor(
      private authService: AuthService,
      private router: Router,
      private route: ActivatedRoute
  ) {
    // Get return URL from route parameters or default to '/dashboard'
    this.route.queryParams.subscribe(params => {
      this.returnUrl = params['returnUrl'] || '/dashboard';

      // Check for error parameter
      if (params['error'] === 'insufficient_permissions') {
        this.errorMessage = 'Your account does not have sufficient permissions to access the application.';
      }
    });

    // Redirect if already logged in
    if (this.authService.isAuthenticated()) {
      this.router.navigate([this.returnUrl]);
    }
  }

  ngOnInit(): void {
    // Check if user is already logged in and has required roles
    if (this.authService.isAuthenticated()) {
      const user = this.authService.getCurrentUser();

      if (user?.roles) {
        // Check for ROLE_USER + ROLE_ADMIN
        if (user.roles.includes('ROLE_USER') && user.roles.includes('ROLE_ADMIN')) {
          this.router.navigate([this.returnUrl]);
          return;
        }

        // Check for ROLE_USER + ROLE_SUPER_ADMIN
        if (user.roles.includes('ROLE_USER') && user.roles.includes('ROLE_SUPER_ADMIN')) {
          this.router.navigate([this.returnUrl]);
          return;
        }
      }

      // If we get here, user doesn't have the required roles
      this.authService.logout();
      this.errorMessage = 'Your account does not have sufficient permissions to access the application.';
    }
  }

  onSubmit(): void {
    if (!this.username || !this.password) {
      this.errorMessage = 'Please enter both email and password';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login(this.username, this.password).subscribe({
      next: (success) => {
        this.isLoading = false;
        if (success) {
          // Check user roles after successful login
          const user = this.authService.getCurrentUser();

          if (user?.roles) {
            // Check for ROLE_USER + ROLE_ADMIN
            if (user.roles.includes('ROLE_USER') && user.roles.includes('ROLE_ADMIN')) {
              this.router.navigate([this.returnUrl]);
              return;
            }

            // Check for ROLE_USER + ROLE_SUPER_ADMIN
            if (user.roles.includes('ROLE_USER') && user.roles.includes('ROLE_SUPER_ADMIN')) {
              this.router.navigate([this.returnUrl]);
              return;
            }
          }

          // If we get here, user doesn't have the required roles
          this.authService.logout();
          this.errorMessage = 'Your account does not have sufficient permissions to access the application.';
        } else {
          this.errorMessage = 'Invalid email or password';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'An error occurred. Please try again.';
        console.error('Login error:', error);
      }
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  resetPassword(): void {
    // Implement password reset functionality or navigate to reset page
    console.log('Password reset requested');
    // For example: this.router.navigate(['/reset-password']);
  }
}
