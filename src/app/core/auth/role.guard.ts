import { Injectable } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';

@Injectable({
    providedIn: 'root'
})
export class RoleGuard {
    constructor(
        private authService: AuthService,
        private router: Router,
    ) {}

    canActivate(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot
    ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
        // First check if user is authenticated
        if (!this.authService.isAuthenticated()) {
            return this.router.createUrlTree(['/login'], {
                queryParams: { returnUrl: state.url }
            });
        }

        // Get current user
        const user = this.authService.getCurrentUser();

        // Check if user has both required roles (ROLE_USER and ROLE_ADMIN)
        if (user && user.roles &&
            user.roles.includes('ROLE_USER') &&
            user.roles.includes('ROLE_ADMIN')) {
            return true;
        }

        // User does not have the required roles - log them out and redirect to login with message
        this.authService.logout();
        return this.router.createUrlTree(['/login'], {
            queryParams: {
                returnUrl: state.url,
                error: 'insufficient_permissions'
            }
        });
    }
}
