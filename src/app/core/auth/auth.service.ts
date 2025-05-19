import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { User } from '@core/models';
import { environment } from '@env/environment';
import { UserService } from '@services/http/user.service';

export interface AuthResponse {
  token: string;
  refresh_token: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiBaseUrl}/api/login_check`;
  private tokenKey = 'auth_token';
  private refreshTokenKey = 'refresh_token';
  private userKey = 'currentUser';

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$: Observable<User | null> = this.currentUserSubject.asObservable();

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasStoredToken());
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(
    private http: HttpClient,
    private userService: UserService
  ) {
    // Check if a user is already logged in from localStorage
    this.loadUserFromStorage();
  }

  login(username: string, password: string): Observable<boolean> {
    return this.http.post<AuthResponse>(this.apiUrl, { username, password })
      .pipe(
        switchMap(response => {
          // Store tokens temporarily
          this.setItemInStorage(this.tokenKey, response.token);
          this.setItemInStorage(this.refreshTokenKey, response.refresh_token);

          // Fetch user data from API using the token
          return this.userService.getUserByEmail(username).pipe(
            map(userData => {
              if (userData) {
                // Store complete user data with token information
                this.storeCompleteUserData(response, userData);
                return true;
              } else {
                // Fallback: Store basic user data if API doesn't return user details
                this.storeAuthData(response, username);
                return true;
              }
            }),
            catchError(userError => {
              console.error('Error fetching user data:', userError);
              // Fallback: Store basic user data if user fetch fails
              this.storeAuthData(response, username);
              return of(true);
            })
          );
        }),
        catchError(error => {
          console.error('Login error:', error);
          return throwError(() => error);
        })
      );
  }

  logout(): void {
    // Clear storage
    this.removeItemFromStorage(this.tokenKey);
    this.removeItemFromStorage(this.refreshTokenKey);
    this.removeItemFromStorage(this.userKey);

    // Update subjects
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
  }

  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  getToken(): string | null {
    return this.getItemFromStorage(this.tokenKey);
  }

  getRefreshToken(): string | null {
    return this.getItemFromStorage(this.refreshTokenKey);
  }

  /**
   * Get the current user from the behavior subject
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Get current user's full name
   * @returns Full name (first + last) or email if name not available
   */
  getUserFullName(): string {
    const user = this.getCurrentUser();
    if (user) {
      if (user.firstName && user.lastName) {
        return `${user.firstName} ${user.lastName}`;
      } else if (user.firstName) {
        return user.firstName;
      } else {
        return user.email;
      }
    }
    return '';
  }

  /**
   * Check if user has a specific role
   * @param role Role to check for
   * @returns True if user has the role
   */
  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return !!user?.roles && user.roles.includes(role);
  }

  // Parse JWT token to get user information
  private parseToken(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(window.atob(base64));
    } catch (e) {
      console.error('Error parsing JWT token:', e);
      return null;
    }
  }

  /**
   * Store basic auth data when user data is not available from API
   */
  private storeAuthData(authResponse: AuthResponse, email: string): void {
    try {
      // Store tokens
      this.setItemInStorage(this.tokenKey, authResponse.token);
      this.setItemInStorage(this.refreshTokenKey, authResponse.refresh_token);

      // Extract user info from token
      const tokenData = this.parseToken(authResponse.token);

      // Create a user object
      const user: User = {
        username: tokenData?.username || email,
        email: tokenData?.username || email,
        id: '',
        roles: [],
        firstName: '',
        lastName: '',
        // Client information will be empty until fetched from the API
        client: undefined
      };

      // Store user info
      this.setItemInStorage(this.userKey, JSON.stringify(user));

      // Update subjects
      this.currentUserSubject.next(user);
      this.isAuthenticatedSubject.next(true);
    } catch (error) {
      console.error('Could not save authentication data:', error);
      throw error;
    }
  }

  /**
   * Store complete user data from API along with auth tokens
   */
  private storeCompleteUserData(authResponse: AuthResponse, userData: User): void {
    try {
      // Store tokens
      this.setItemInStorage(this.tokenKey, authResponse.token);
      this.setItemInStorage(this.refreshTokenKey, authResponse.refresh_token);

      // Extract token data for any additional information
      const tokenData = this.parseToken(authResponse.token);

      // Ensure username field is set for compatibility with existing code
      if (!userData.username && userData.email) {
        userData.username = userData.email;
      }

      // Store complete user data
      this.setItemInStorage(this.userKey, JSON.stringify(userData));

      // Update subjects
      this.currentUserSubject.next(userData);
      this.isAuthenticatedSubject.next(true);

      console.log('User data stored successfully');
    } catch (error) {
      console.error('Could not save complete user data:', error);
      throw error;
    }
  }

  private loadUserFromStorage(): void {
    try {
      const storedUser = this.getItemFromStorage(this.userKey);
      if (storedUser) {
        this.currentUserSubject.next(JSON.parse(storedUser));
        this.isAuthenticatedSubject.next(true);
      }
    } catch (error) {
      console.error('Error loading user from storage:', error);
    }
  }

  private hasStoredToken(): boolean {
    try {
      return !!this.getItemFromStorage(this.tokenKey);
    } catch (error) {
      console.warn('Could not check authentication status:', error);
      return false;
    }
  }

  // Safe storage methods with fallbacks
  private isLocalStorageAvailable(): boolean {
    try {
      const testKey = '__test__';
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  private getItemFromStorage(key: string): string | null {
    if (this.isLocalStorageAvailable()) {
      return localStorage.getItem(key);
    }
    // Fallback to memory storage or return null
    return null;
  }

  private setItemInStorage(key: string, value: string): void {
    if (this.isLocalStorageAvailable()) {
      localStorage.setItem(key, value);
    }
  }

  private removeItemFromStorage(key: string): void {
    if (this.isLocalStorageAvailable()) {
      localStorage.removeItem(key);
    }
  }

  /**
   * Get client information if available
   * @returns Client information or null
   */
  getClientInfo(): { name: string, code: string } | null {
    const user = this.getCurrentUser();
    if (user?.client) {
      return {
        name: user.client.name,
        code: user.client.code
      };
    }
    return null;
  }

  /**
   * Check if user is associated with a client
   * @returns True if user has client information
   */
  hasClient(): boolean {
    const user = this.getCurrentUser();
    return !!user?.client;
  }

  /**
   * Get client name if available
   * @returns Client name or empty string
   */
  getClientName(): string {
    const client = this.getClientInfo();
    return client ? client.name : '';
  }
}
