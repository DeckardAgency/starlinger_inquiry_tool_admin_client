import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, map, of, catchError, tap } from 'rxjs';
import {
    Client,
    ClientDetail,
    ClientsResponse,
    TransformedClientsResponse,
    CreateClientDto,
    UpdateClientDto,
    ValidationError,
    ApiError
} from '@models/client.model';
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
export class ClientService {
    private apiUrl = `${environment.apiBaseUrl}/api/v1/clients`;
    private httpOptions = {
        headers: new HttpHeaders({
            'Content-Type': 'application/ld+json',
            'Accept': 'application/ld+json'
        })
    };

    constructor(private http: HttpClient) {}

    /**
     * Get clients with pagination, sorting and filtering
     * Transforms the API response format to match what components expect
     */
    getClients(
        page: number = 1,
        sortField?: string,
        sortDirection?: 'asc' | 'desc',
        searchParams: Record<string, string> = {}
    ): Observable<TransformedClientsResponse> {
        let params = new HttpParams()
            .set('page', page.toString());

        // Add sorting parameters
        if (sortField && sortDirection) {
            params = params.set(`order[${sortField}]`, sortDirection);
        }

        // Add search parameters
        // Based on the PHP entity's SearchFilter: name (partial), code (exact)
        if (searchParams['name']) {
            params = params.set('name', searchParams['name']);
        }
        if (searchParams['code']) {
            params = params.set('code', searchParams['code']);
        }

        // Add any other search parameters
        Object.keys(searchParams).forEach(key => {
            if (key !== 'name' && key !== 'code') {
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

        return this.http.get<ClientsResponse>(this.apiUrl, { params }).pipe(
            tap(response => console.log('Raw API response:', response)),
            map(response => this.transformClientsResponse(response, page)),
            catchError(error => {
                console.error('API error:', error);
                return of({
                    clients: [],
                    totalClients: 0,
                    pagination: {},
                    currentPage: page,
                    totalPages: 1
                });
            })
        );
    }

    /**
     * Get a single client by ID with full details
     */
    getClient(id: string): Observable<ClientDetail> {
        return this.http.get<ClientDetail>(`${this.apiUrl}/${id}`).pipe(
            tap(client => console.log('Client details:', client))
        );
    }

    /**
     * Get client by code
     * @param code The client's unique code
     * @returns Observable with the client data or null
     */
    getClientByCode(code: string): Observable<Client | null> {
        const params = new HttpParams().set('code', code);

        return this.http.get<ClientsResponse>(this.apiUrl, { params }).pipe(
            map(response => {
                if (response.member && response.member.length > 0) {
                    return response.member[0];
                }
                return null;
            })
        );
    }

    /**
     * Create a new client
     */
    createClient(clientData: CreateClientDto): Observable<Client> {
        return this.http.post<Client>(this.apiUrl, clientData, this.httpOptions).pipe(
            tap(client => console.log('Created client:', client))
        );
    }

    /**
     * Update an existing client (partial update)
     */
    updateClient(id: string, clientData: UpdateClientDto): Observable<Client> {
        return this.http.patch<Client>(`${this.apiUrl}/${id}`, clientData, {
            headers: new HttpHeaders({
                'Content-Type': 'application/merge-patch+json',
                'Accept': 'application/ld+json'
            })
        }).pipe(
            tap(client => console.log('Updated client:', client))
        );
    }

    /**
     * Replace an existing client (full update)
     */
    replaceClient(id: string, clientData: CreateClientDto): Observable<Client> {
        return this.http.put<Client>(`${this.apiUrl}/${id}`, clientData, this.httpOptions).pipe(
            tap(client => console.log('Replaced client:', client))
        );
    }

    /**
     * Delete a client
     */
    deleteClient(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }

    /**
     * Delete multiple clients in parallel
     */
    deleteClients(ids: string[]): Observable<DeleteResult> {
        if (ids.length === 0) {
            return of({
                deletedCount: 0,
                failedCount: 0,
                successIds: [],
                failedIds: []
            });
        }

        const deleteRequests = ids.map(id =>
            this.deleteClient(id).pipe(
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
     * Search clients by name (partial match)
     */
    searchClientsByName(name: string): Observable<Client[]> {
        const params = new HttpParams().set('name', name);

        return this.http.get<ClientsResponse>(this.apiUrl, { params }).pipe(
            map(response => response.member || [])
        );
    }

    /**
     * Validate client data before submission
     * This is a client-side validation helper
     */
    validateClientData(clientData: CreateClientDto | UpdateClientDto): string[] {
        const errors: string[] = [];

        if ('name' in clientData && !clientData.name) {
            errors.push('Name is required');
        }

        if ('code' in clientData) {
            if (!clientData.code) {
                errors.push('Code is required');
            } else if (clientData.code.length < 2 || clientData.code.length > 50) {
                errors.push('Code must be between 2 and 50 characters');
            }
        }

        if ('email' in clientData && clientData.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(clientData.email)) {
                errors.push('Invalid email format');
            }
        }

        return errors;
    }

    /**
     * Transform the API response to a more UI-friendly format
     */
    private transformClientsResponse(response: ClientsResponse, currentPage: number): TransformedClientsResponse {
        return {
            clients: response.member || [],
            totalClients: response.totalItems || 0,
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
    private extractTotalPages(response: ClientsResponse): number {
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
