import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, map, of, catchError, tap } from 'rxjs';
import { Machine, MachineCollection, MachineRequest, ErrorResponse, ValidationErrorResponse } from '@models/machine.model';
import { environment } from "@env/environment";

// Response interface for component compatibility
export interface MachinesResponse {
    machines: Machine[];
    totalItems: number;
    pagination: {
        first?: string;
        last?: string;
        next?: string;
        previous?: string;
    };
    currentPage: number;
    totalPages: number;
}

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
export class MachineService {
    private apiUrl = `${environment.apiBaseUrl}/api/v1/machines`;
    private httpOptions = {
        headers: new HttpHeaders({
            'Content-Type': 'application/ld+json',
            'Accept': 'application/ld+json'
        })
    };

    constructor(private http: HttpClient) {}

    /**
     * Get machines with pagination, sorting and filtering
     * Transforms the API response format to match what the component expects
     */
    getMachines(
        page: number = 1,
        sortField?: string,
        sortDirection?: 'asc' | 'desc',
        searchParams: Record<string, string> = {}
    ): Observable<MachinesResponse> {
        let params = new HttpParams()
            .set('page', page.toString());

        // Add sorting parameters
        if (sortField && sortDirection) {
            // Format as order[fieldName]=direction
            params = params.set(`order[${sortField}]`, sortDirection);
        }

        // Add search parameters
        if (searchParams['articleDescription']) {
            // If searching by articleDescription, add it as a filter parameter
            params = params.set('articleDescription', searchParams['articleDescription']);
        }

        // Add any other search parameters
        Object.keys(searchParams).forEach(key => {
            if (key !== 'articleDescription') { // Skip articleDescription as we've already added it above
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

        // Make the API request and transform the response
        return this.http.get<MachineCollection>(this.apiUrl, { params }).pipe(
            tap(response => console.log('Raw API response:', response)),
            map(response => {
                // Transform the API response format to match what the component expects
                const machinesResponse: MachinesResponse = {
                    // Use member array as machines
                    machines: response.member || [],
                    // Map other properties
                    totalItems: response.totalItems || 0,
                    // Extract pagination links from view property
                    pagination: {
                        first: response.view?.first,
                        last: response.view?.last,
                        next: response.view?.next,
                        previous: response.view?.previous
                    },
                    currentPage: page,
                    // Calculate total pages from last page link if available
                    totalPages: this.extractTotalPages(response)
                };

                console.log('Transformed response:', machinesResponse);
                return machinesResponse;
            }),
            catchError(error => {
                console.error('API error:', error);
                // Return a valid empty response on error
                return of({
                    machines: [],
                    totalItems: 0,
                    pagination: {},
                    currentPage: page,
                    totalPages: 1
                });
            })
        );
    }

    /**
     * Extract total pages from the response
     */
    private extractTotalPages(response: MachineCollection): number {
        // If view.last contains pagination info, try to extract page number
        if (response.view?.last) {
            const lastPageUrl = response.view.last;
            const pageMatch = lastPageUrl.match(/[?&]page=(\d+)/);
            if (pageMatch && pageMatch[1]) {
                return parseInt(pageMatch[1], 10);
            }
        }
        // Fallback: If we have totalItems and can estimate pages (assuming default page size)
        if (response.totalItems) {
            // Assuming 30 items per page as in the component's getResultsText method
            const itemsPerPage = 30;
            return Math.ceil(response.totalItems / itemsPerPage);
        }
        // Default to 1 if we can't determine
        return 1;
    }

    /**
     * Get a single machine by ID
     */
    getMachine(id: string): Observable<Machine> {
        return this.http.get<Machine>(`${this.apiUrl}/${id}`);
    }

    /**
     * Create a new machine
     */
    createMachine(machine: MachineRequest): Observable<Machine> {
        return this.http.post<Machine>(this.apiUrl, machine, this.httpOptions);
    }

    /**
     * Update an existing machine
     */
    updateMachine(id: string, machine: Partial<MachineRequest>): Observable<Machine> {
        return this.http.patch<Machine>(`${this.apiUrl}/${id}`, machine, {
            headers: new HttpHeaders({
                'Content-Type': 'application/merge-patch+json',
                'Accept': 'application/ld+json'
            })
        });
    }

    /**
     * Delete a machine
     */
    deleteMachine(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }

    /**
     * Delete multiple machines in parallel
     * This uses forkJoin to run multiple deletions concurrently
     */
    deleteMachines(ids: string[]): Observable<DeleteResult> {
        if (ids.length === 0) {
            return of({
                deletedCount: 0,
                failedCount: 0,
                successIds: [],
                failedIds: []
            });
        }

        // For each ID, create a delete request that returns success/failure status
        const deleteRequests = ids.map(id =>
            this.deleteMachine(id).pipe(
                map(() => ({ success: true, id })),
                catchError(error => of({ success: false, id, error }))
            )
        );

        // Execute all requests in parallel and summarize results
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
}
