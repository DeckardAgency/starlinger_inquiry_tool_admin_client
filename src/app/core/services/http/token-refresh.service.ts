import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import {AuthService} from '@core/auth/auth.service';

interface RefreshTokenResponse {
  token: string;
  refresh_token: string;
}

@Injectable({
  providedIn: 'root'
})
export class TokenRefreshService {
  private refreshUrl = '/api/token/refresh';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  refreshToken(): Observable<RefreshTokenResponse> {
    const refreshToken = this.authService.getRefreshToken();

    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    return this.http.post<RefreshTokenResponse>(this.refreshUrl, {
      refresh_token: refreshToken
    }).pipe(
      tap(response => {
        // Update tokens in storage
        localStorage.setItem('auth_token', response.token);
        localStorage.setItem('refresh_token', response.refresh_token);
      }),
      catchError(error => {
        console.error('Error refreshing token:', error);
        // If refresh fails, logout the user
        this.authService.logout();
        return throwError(() => error);
      })
    );
  }
}
