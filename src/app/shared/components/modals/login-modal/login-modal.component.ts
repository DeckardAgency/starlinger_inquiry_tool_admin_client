// login-modal.component.ts
import {Component, Input, Output, EventEmitter, OnInit, booleanAttribute} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { animate, style, transition, trigger } from '@angular/animations';
import {AuthService} from '@core/auth/auth.service';

@Component({
  selector: 'app-login-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login-modal.component.html',
  styleUrls: ['./login-modal.component.scss'],
  animations: [
    trigger('fadeAnimation', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0 }))
      ])
    ]),
    trigger('slideAnimation', [
      transition(':enter', [
        style({ transform: 'translateY(-50px)', opacity: 0 }),
        animate('300ms 100ms ease-out', style({ transform: 'translateY(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ transform: 'translateY(-50px)', opacity: 0 }))
      ])
    ])
  ]
})
export class LoginModalComponent implements OnInit {
  @Input({transform: booleanAttribute}) isOpen = false;
  @Input() allowClose = false; // Default to not allowing close
  @Output() isOpenChange = new EventEmitter<boolean>();
  @Output() loginSuccess = new EventEmitter<boolean>();

  username = '';
  password = '';
  rememberMe = false;
  showPassword = false;
  errorMessage = '';
  isLoading = false;
  returnUrl = '/dashboard';

  // Unique IDs for form elements
  usernameId = '';
  passwordId = '';
  rememberMeId = '';

  constructor(
    public authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Generate unique IDs for form elements to prevent duplicates
    const uniqueId = `login-modal-${Date.now()}`;
    this.usernameId = `username-${uniqueId}`;
    this.passwordId = `password-${uniqueId}`;
    this.rememberMeId = `remember-${uniqueId}`;
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  close(): void {
    // Only allow closing if explicitly permitted
    if (!this.allowClose) {
      return;
    }

    this.isOpen = false;
    this.isOpenChange.emit(false);
    // Reset form state
    this.username = '';
    this.password = '';
    this.errorMessage = '';
    this.isLoading = false;
  }

  closeOnBackdrop(event: MouseEvent): void {
    // Only allow backdrop closing if explicitly permitted
    if (!this.allowClose) {
      return;
    }

    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.close();
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
          this.loginSuccess.emit(true);
          // After successful login, we allow the modal to be closed
          this.allowClose = true;
          this.close();
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

  resetPassword(): void {
    // Implement password reset functionality or navigate to reset page
    console.log('Password reset requested');
  }
}
