import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { User, UserCollectionResponse } from '@core/models';
import { environment } from '@env/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private baseUrl = `${environment.apiBaseUrl}${environment.apiPath}/users`;

  constructor(private http: HttpClient) {}

  /**
   * Get user by email
   * @param email The user's email
   * @returns Observable with the user data
   */
  getUserByEmail(email: string): Observable<User | null> {
    const params = new HttpParams().set('email', email);

    return this.http.get<UserCollectionResponse>(this.baseUrl, { params })
      .pipe(
        map(response => {
          // Check if a member array exists and has at least one user
          if (response.member && response.member.length > 0) {
            const userMember = response.member[0];

            // Convert from the API format to our User interface
            const user: User = {
              id: userMember.id,
              email: userMember.email,
              roles: userMember.roles,
              firstName: userMember.firstName,
              lastName: userMember.lastName,
              createdAt: userMember.createdAt,
              updatedAt: userMember.updatedAt,
              orders: userMember.orders,
              username: userMember.email, // Ensure the username is set for compatibility
              client: userMember.client  // Include the client information if available
            };

            return user;
          }
          return null;
        })
      );
  }
}
