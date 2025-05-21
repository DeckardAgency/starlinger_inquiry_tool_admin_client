import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of, catchError, tap } from 'rxjs';
import { map } from 'rxjs/operators';
import { Inquiry, InquiriesResponse, TransformedInquiriesResponse } from '@models/manual-entry.model';

@Injectable({
    providedIn: 'root'
})
export class ManualEntryService {
    private apiUrl = 'https://127.0.0.1:8002/api/v1/inquiries';
    private httpOptions = {
        headers: new HttpHeaders({
            'Content-Type': 'application/ld+json',
            'Accept': 'application/ld+json'
        })
    };

    constructor(private http: HttpClient) {}

    /**
     * Get inquiries with pagination, sorting and filtering
     */
    getInquiries(
        page: number = 1,
        sortField?: string,
        sortDirection?: 'asc' | 'desc',
        searchParams: Record<string, string> = {},
        filters: { status?: string[] } = {}
    ): Observable<TransformedInquiriesResponse> {
        let params = new HttpParams().set('page', page.toString());

        // Add sorting parameters
        if (sortField && sortDirection) {
            // Format as order[fieldName]=direction
            params = params.set(`order[${sortField}]`, sortDirection);
        }

        // Add search parameters
        if (searchParams['query']) {
            // If general search query is provided, search in inquiryNumber
            params = params.set('inquiryNumber', searchParams['query']);
        }

        // Add status filters if provided
        if (filters.status && filters.status.length > 0) {
            filters.status.forEach(status => {
                params = params.append('status[]', status);
            });
        }

        // Add any other search parameters
        Object.keys(searchParams).forEach(key => {
            if (key !== 'query') { // Skip query as we've already handled it
                params = params.set(key, searchParams[key]);
            }
        });

        return this.http.get<InquiriesResponse>(this.apiUrl, { params }).pipe(
            tap(response => console.log('Raw API response:', response)),
            map(response => {
                // Transform the API response format to match what the component expects
                const inquiriesResponse: TransformedInquiriesResponse = {
                    inquiries: response.member || [],
                    totalInquiries: response.totalItems || 0,
                    pagination: {
                        first: response.view?.first,
                        last: response.view?.last,
                        next: response.view?.next,
                        previous: response.view?.previous
                    },
                    currentPage: page,
                    totalPages: this.extractTotalPages(response)
                };

                console.log('Transformed inquiries response:', inquiriesResponse);
                return inquiriesResponse;
            }),
            catchError(error => {
                console.error('API error:', error);
                // Return a valid empty response on error
                return of({
                    inquiries: [],
                    totalInquiries: 0,
                    pagination: {},
                    currentPage: page,
                    totalPages: 1
                });
            })
        );
    }

    /**
     * Get a single inquiry by ID
     */
    getInquiry(id: string): Observable<Inquiry> {
        return this.http.get<Inquiry>(`${this.apiUrl}/${id}`);
    }

    /**
     * Extract total pages from the response
     */
    private extractTotalPages(response: InquiriesResponse): number {
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
            // Assuming 30 items per page as default
            const itemsPerPage = 30;
            return Math.ceil(response.totalItems / itemsPerPage);
        }
        // Default to 1 if we can't determine
        return 1;
    }
}
