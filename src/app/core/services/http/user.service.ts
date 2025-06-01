import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, map, of, catchError, tap } from 'rxjs';
import {
  User,
  UserDetail,
  UserCollectionResponse,
  TransformedUsersResponse,
  CreateUserDto,
  UpdateUserDto,
  ValidationError,
  ApiError
} from '@models/auth.model';
import { environment } from '@env/environment';

// Result interface for bulk operations
export interface DeleteResult {
  deletedCount: number;
  failedCount: number;
  successIds: string[];
  failedIds: string[];
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = `${environment.apiBaseUrl}/api/v1/users`;
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/ld+json',
      'Accept': 'application/ld+json'
    })
  };

  constructor(private http: HttpClient) {}

  /**
   * Get users with pagination, sorting and filtering
   * Transforms the API response format to match what components expect
   */
  getUsers(
      page: number = 1,
      sortField?: string,
      sortDirection?: 'asc' | 'desc',
      searchParams: Record<string, string> = {}
  ): Observable<TransformedUsersResponse> {
    let params = new HttpParams()
        .set('page', page.toString());

    // Add sorting parameters
    if (sortField && sortDirection) {
      params = params.set(`order[${sortField}]`, sortDirection);
    }

    // Add search parameters
    // Based on the PHP entity's SearchFilter: email (exact), client.code (exact)
    if (searchParams['email']) {
      params = params.set('email', searchParams['email']);
    }
    if (searchParams['clientCode']) {
      params = params.set('client.code', searchParams['clientCode']);
    }

    // Add any other search parameters
    Object.keys(searchParams).forEach(key => {
      if (key !== 'email' && key !== 'clientCode') {
        params = params.set(key, searchParams[key]);
      }
    });

    // Log request parameters for debugging
    console.log('Request parameters:', {
      page,
      sortField,
      sortDirection,
      searchParams,
      httpParams: params.toString()
    });

    return this.http.get<UserCollectionResponse>(this.apiUrl, { params }).pipe(
        tap(response => console.log('Raw API response:', response)),
        map(response => this.transformUsersResponse(response, page)),
        catchError(error => {
          console.error('API error:', error);
          return of({
            users: [],
            totalUsers: 0,
            pagination: {},
            currentPage: page,
            totalPages: 1
          });
        })
    );
  }

  /**
   * Get a single user by ID with full details
   */
  getUser(id: string): Observable<UserDetail> {
    return this.http.get<UserDetail>(`${this.apiUrl}/${id}`).pipe(
        tap(user => console.log('User details:', user))
    );
  }

  /**
   * Get user by email
   * @param email The user's email
   * @returns Observable with the user data or null
   */
  getUserByEmail(email: string): Observable<User | null> {
    const params = new HttpParams().set('email', email);

    return this.http.get<UserCollectionResponse>(this.apiUrl, { params }).pipe(
        map(response => {
          if (response.member && response.member.length > 0) {
            return response.member[0];
          }
          return null;
        })
    );
  }

  /**
   * Get users by client code
   * @param clientCode The client's code
   * @returns Observable with array of users
   */
  getUsersByClientCode(clientCode: string): Observable<User[]> {
    const params = new HttpParams().set('client.code', clientCode);

    return this.http.get<UserCollectionResponse>(this.apiUrl, { params }).pipe(
        map(response => response.member || [])
    );
  }

  /**
   * Create a new user
   */
  createUser(userData: CreateUserDto): Observable<User> {
    return this.http.post<User>(this.apiUrl, userData, this.httpOptions).pipe(
        tap(user => console.log('Created user:', user))
    );
  }

  /**
   * Update an existing user (partial update)
   */
  updateUser(id: string, userData: UpdateUserDto): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/${id}`, userData, {
      headers: new HttpHeaders({
        'Content-Type': 'application/merge-patch+json',
        'Accept': 'application/ld+json'
      })
    }).pipe(
        tap(user => console.log('Updated user:', user))
    );
  }

  /**
   * Replace an existing user (full update)
   */
  replaceUser(id: string, userData: CreateUserDto): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${id}`, userData, this.httpOptions).pipe(
        tap(user => console.log('Replaced user:', user))
    );
  }

  /**
   * Delete a user
   */
  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * Delete multiple users in parallel
   */
  deleteUsers(ids: string[]): Observable<DeleteResult> {
    if (ids.length === 0) {
      return of({
        deletedCount: 0,
        failedCount: 0,
        successIds: [],
        failedIds: []
      });
    }

    const deleteRequests = ids.map(id =>
        this.deleteUser(id).pipe(
            map(() => ({ success: true, id })),
            catchError(error => of({ success: false, id, error }))
        )
    );

    return forkJoin(deleteRequests).pipe(
        map(results => {
          const successResults = results.filter(r => r.success);
          const failedResults = results.filter(r => !r.success);

          return {
            deletedCount: successResults.length,
            failedCount: failedResults.length,
            successIds: successResults.map(r => r.id),
            failedIds: failedResults.map(r => r.id)
          };
        })
    );
  }

  /**
   * Search users by partial email match
   * Note: The API uses exact match, so this might need backend adjustment
   */
  searchUsersByEmail(email: string): Observable<User[]> {
    const params = new HttpParams().set('email', email);

    return this.http.get<UserCollectionResponse>(this.apiUrl, { params }).pipe(
        map(response => response.member || [])
    );
  }

  /**
   * Validate user data before submission
   * This is a client-side validation helper
   */
  validateUserData(userData: CreateUserDto | UpdateUserDto): string[] {
    const errors: string[] = [];

    if ('email' in userData && userData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userData.email)) {
        errors.push('Invalid email format');
      }
    }

    if ('firstName' in userData) {
      if (!userData.firstName) {
        errors.push('First name is required');
      } else if (userData.firstName.length < 2 || userData.firstName.length > 100) {
        errors.push('First name must be between 2 and 100 characters');
      }
    }

    if ('lastName' in userData) {
      if (!userData.lastName) {
        errors.push('Last name is required');
      } else if (userData.lastName.length < 2 || userData.lastName.length > 100) {
        errors.push('Last name must be between 2 and 100 characters');
      }
    }

    if ('plainPassword' in userData && userData.plainPassword) {
      if (userData.plainPassword.length < 6) {
        errors.push('Password must be at least 6 characters long');
      }
    }

    return errors;
  }

  /**
   * Transform the API response to a more UI-friendly format
   */
  private transformUsersResponse(response: UserCollectionResponse, currentPage: number): TransformedUsersResponse {
    return {
      users: response.member || [],
      totalUsers: response.totalItems || 0,
      pagination: {
        first: response.view?.first,
        last: response.view?.last,
        next: response.view?.next,
        previous: response.view?.previous
      },
      currentPage: currentPage,
      totalPages: this.extractTotalPages(response)
    };
  }

  /**
   * Extract total pages from the response
   */
  private extractTotalPages(response: UserCollectionResponse): number {
    if (response.view?.last) {
      const lastPageUrl = response.view.last;
      const pageMatch = lastPageUrl.match(/[?&]page=(\d+)/);
      if (pageMatch && pageMatch[1]) {
        return parseInt(pageMatch[1], 10);
      }
    }

    // Fallback: calculate based on total items (assuming 30 items per page)
    if (response.totalItems) {
      const itemsPerPage = 30;
      return Math.ceil(response.totalItems / itemsPerPage);
    }

    return 1;
  }

  /**
   * Handle API errors and extract user-friendly messages
   */
  handleError(error: any): string {
    if (error.error) {
      // Check for validation errors (422)
      if (error.status === 422 && error.error.violations) {
        const validationError = error.error as ValidationError;
        return validationError.violations
            .map(v => `${v.propertyPath}: ${v.message}`)
            .join(', ');
      }

      // Check for general API errors
      if (error.error.detail) {
        const apiError = error.error as ApiError;
        return apiError.detail;
      }
    }

    // Default error message
    return 'An unexpected error occurred. Please try again.';
  }
}
