import { Injectable } from '@angular/core';
import {HttpClient, HttpParams, HttpErrorResponse, HttpHeaders} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '@env/environment';
import {
    ClientMachineInstalledBase,
    ClientMachineInstalledBaseResponse,
    CreateClientMachineInstalledBaseDto,
    UpdateClientMachineInstalledBaseDto
} from '@models/client-machine-installed-base.model';

@Injectable({
    providedIn: 'root'
})
export class ClientMachineInstalledBaseService {
    private readonly apiUrl = `${environment.apiBaseUrl}/api/v1/client_machine_installed_bases`;

    constructor(private http: HttpClient) {}

    /**
     * Get client machine installed bases with optional filters
     */
    getClientMachineInstalledBases(
        page: number = 1,
        filters?: { [key: string]: string }
    ): Observable<ClientMachineInstalledBaseResponse> {
        let params = new HttpParams()
            .set('page', page.toString());

        // Add filters if provided
        if (filters) {
            Object.keys(filters).forEach(key => {
                if (filters[key]) {
                    params = params.set(key, filters[key]);
                }
            });
        }

        return this.http.get<ClientMachineInstalledBaseResponse>(this.apiUrl, { params })
            .pipe(
                catchError(this.handleError)
            );
    }

    /**
     * Get client machine installed bases by client code
     */
    getClientMachineInstalledBasesByClientCode(clientCode: string): Observable<ClientMachineInstalledBase[]> {
        const params = new HttpParams().set('client.code', clientCode);

        console.log('Making API call to:', `${this.apiUrl}?${params.toString()}`);

        return this.http.get<any>(this.apiUrl, { params })
            .pipe(
                map(response => {
                    console.log('Raw API response:', response);

                    // Handle both possible response structures
                    let data: ClientMachineInstalledBase[] = [];

                    if (response.member) {
                        console.log('Using response.member, count:', response.member.length);
                        data = response.member;
                    } else if (response['hydra:member']) {
                        console.log('Using response[hydra:member], count:', response['hydra:member'].length);
                        data = response['hydra:member'];
                    } else {
                        console.log('No member data found in response');
                        data = [];
                    }

                    console.log('Returning data:', data);
                    return data;
                }),
                catchError(this.handleError)
            );
    }

    /**
     * Get a specific client machine installed base by ID
     */
    getClientMachineInstalledBase(id: string): Observable<ClientMachineInstalledBase> {
        return this.http.get<ClientMachineInstalledBase>(`${this.apiUrl}/${id}`)
            .pipe(
                catchError(this.handleError)
            );
    }

    /**
     * Create a new client machine installed base
     */
    createClientMachineInstalledBase(data: CreateClientMachineInstalledBaseDto): Observable<ClientMachineInstalledBase> {
        return this.http.post<ClientMachineInstalledBase>(this.apiUrl, data, {
            headers: new HttpHeaders({
                'Content-Type': 'application/ld+json',
                'Accept': 'application/ld+json'
            })
        })
            .pipe(
                catchError(this.handleError)
            );
    }

    /**
     * Update an existing client machine installed base
     */
    updateClientMachineInstalledBase(
        id: string,
        data: UpdateClientMachineInstalledBaseDto
    ): Observable<ClientMachineInstalledBase> {
        return this.http.put<ClientMachineInstalledBase>(`${this.apiUrl}/${id}`, data)
            .pipe(
                catchError(this.handleError)
            );
    }

    /**
     * Delete a client machine installed base
     */
    deleteClientMachineInstalledBase(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`)
            .pipe(
                catchError(this.handleError)
            );
    }

    /**
     * Handle HTTP errors
     */
    private handleError = (error: HttpErrorResponse): Observable<never> => {
        let errorMessage = 'An unknown error occurred';

        if (error.error instanceof ErrorEvent) {
            // Client-side error
            errorMessage = `Error: ${error.error.message}`;
        } else {
            // Server-side error
            if (error.status === 0) {
                errorMessage = 'Unable to connect to the server. Please check your internet connection.';
            } else if (error.status >= 400 && error.status < 500) {
                // Client errors (400-499)
                if (error.error && error.error.message) {
                    errorMessage = error.error.message;
                } else if (error.error && typeof error.error === 'string') {
                    errorMessage = error.error;
                } else {
                    errorMessage = `Client error: ${error.status} ${error.statusText}`;
                }
            } else if (error.status >= 500) {
                // Server errors (500-599)
                errorMessage = 'Server error. Please try again later.';
            } else {
                errorMessage = `HTTP error: ${error.status} ${error.statusText}`;
            }
        }

        console.error('ClientMachineInstalledBaseService Error:', error);
        return throwError(() => errorMessage);
    };

    /**
     * Get status badge class for styling
     */
    getStatusBadgeClass(status: string): string {
        switch (status) {
            case 'active':
                return 'status-badge--active';
            case 'inactive':
                return 'status-badge--inactive';
            case 'maintenance':
                return 'status-badge--maintenance';
            case 'decommissioned':
                return 'status-badge--decommissioned';
            default:
                return 'status-badge--default';
        }
    }

    /**
     * Format status text for display
     */
    formatStatusText(status: string): string {
        switch (status) {
            case 'active':
                return 'Active';
            case 'inactive':
                return 'Inactive';
            case 'maintenance':
                return 'Maintenance';
            case 'decommissioned':
                return 'Decommissioned';
            default:
                return status;
        }
    }
}
