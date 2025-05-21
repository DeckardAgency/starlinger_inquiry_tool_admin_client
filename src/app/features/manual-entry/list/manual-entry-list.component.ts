import { Component, OnInit, OnDestroy, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { BreadcrumbsComponent } from "@shared/components/ui/breadcrumbs/breadcrumbs.component";
import { Inquiry } from '@models/manual-entry.model';
import { ManualEntryService } from '@services/http/manual-entry.service';
import { PaginationLinks } from '@models/pagination.model';

// Interfaces to represent component state
interface InquiriesState {
    inquiries: Inquiry[];
    loading: boolean;
    error: string | null;
    totalInquiries: number;
    currentPage: number;
    totalPages: number;
    pagination: PaginationLinks;
}

interface SearchState {
    term: string;
    params: Record<string, string>;
}

interface SortState {
    field: string | null;
    direction: 'asc' | 'desc' | null;
}

interface FilterState {
    activeTab: 'all' | 'completed' | 'cancelled' | 'rejected' | 'archived';
    statusFilters: Record<'all' | 'completed' | 'cancelled' | 'rejected' | 'archived', string[]>;
}

@Component({
    selector: 'app-manual-entry-list',
    standalone: true,
    imports: [CommonModule, BreadcrumbsComponent, FormsModule],
    templateUrl: './manual-entry-list.component.html',
    styleUrls: ['./manual-entry-list.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [ManualEntryService],
})
export class ManualEntryListComponent implements OnInit, OnDestroy {
    // Inject services
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private manualEntryService = inject(ManualEntryService);

    // UI state
    breadcrumbs = [{ label: 'Manual entry' }];
    showOptions = signal(false);
    selectedInquiryId = signal<string | null>(null);

    // State signals for reactive updates
    inquiriesState = signal<InquiriesState>({
        inquiries: [],
        loading: false,
        error: null,
        totalInquiries: 0,
        currentPage: 1,
        totalPages: 1,
        pagination: {}
    });

    searchState = signal<SearchState>({
        term: '',
        params: {}
    });

    sortState = signal<SortState>({
        field: 'createdAt',
        direction: 'desc'
    });

    filterState = signal<FilterState>({
        activeTab: 'all',
        statusFilters: {
            all: [], // Empty array means all statuses
            completed: ['completed'],
            cancelled: ['cancelled'],
            rejected: ['rejected'],
            archived: ['archived']
        }
    });

    // Map status values to display text
    statusDisplayMap: Record<string, string> = {
        'pending': 'Pending',
        'processing': 'Processing',
        'completed': 'Completed',
        'cancelled': 'Cancelled',
        'rejected': 'Rejected',
        'archived': 'Archived'
    };

    // Computed values
    pagesArray = computed(() => this.generatePagesArray());

    // Event subjects
    private searchInputSubject = new Subject<string>();
    private destroy$ = new Subject<void>();

    constructor() {
        // No effects needed as we're explicitly loading data
    }

    ngOnInit(): void {
        // Setup search term debounce
        this.setupSearchDebounce();

        // Subscribe to route parameters
        this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
            // Parse page parameter
            const page = params['page'] ? parseInt(params['page'], 10) : 1;

            // Update current page
            this.inquiriesState.update(state => ({
                ...state,
                currentPage: page
            }));

            // Update sort state if in params
            if (params['sortField'] && params['sortDirection']) {
                this.sortState.update(state => ({
                    ...state,
                    field: params['sortField'],
                    direction: params['sortDirection'] as 'asc' | 'desc'
                }));
            }

            // Update search state if in params
            if (params['query']) {
                const searchParams: Record<string, string> = {};
                searchParams['query'] = params['query'];

                this.searchState.update(state => ({
                    term: params['query'],
                    params: searchParams
                }));
            } else {
                this.searchState.update(state => ({
                    term: '',
                    params: {}
                }));
            }

            // Update tab/status filters if in params
            if (params['tab']) {
                if (['all', 'completed', 'cancelled', 'rejected', 'archived'].includes(params['tab'])) {
                    this.filterState.update(state => ({
                        ...state,
                        activeTab: params['tab'] as 'all' | 'completed' | 'cancelled' | 'rejected' | 'archived'
                    }));
                }
            }

            // Explicitly call loadInquiries with the current state
            this.loadInquiries(
                page,
                this.sortState().field,
                this.sortState().direction,
                this.searchState().params,
                { status: this.filterState().statusFilters[this.filterState().activeTab] }
            );
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Set up debounce for search to avoid too many API calls while typing
     */
    setupSearchDebounce(): void {
        this.searchInputSubject.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            takeUntil(this.destroy$)
        ).subscribe(term => {
            this.handleSearch(term);
        });
    }

    /**
     * Handle search input changes
     */
    onSearchInput(event: Event): void {
        const value = (event.target as HTMLInputElement).value;
        this.searchInputSubject.next(value);
    }

    /**
     * Handle search logic and navigate with search params
     */
    handleSearch(term: string): void {
        // Build query params object
        const queryParams: any = { page: 1 };
        const searchParams: Record<string, string> = {};

        // Add search term if not empty
        if (term.trim()) {
            queryParams.query = term.trim();
            searchParams['query'] = term.trim();
            this.searchState.update(state => ({
                term: term.trim(),
                params: searchParams
            }));
        } else {
            // Clear search params when empty
            this.searchState.update(state => ({
                term: '',
                params: {}
            }));
        }

        // Add tab parameter
        queryParams.tab = this.filterState().activeTab;

        // Add sorting params
        const { field, direction } = this.sortState();
        if (field && direction) {
            queryParams.sortField = field;
            queryParams.sortDirection = direction;
        }

        // Update URL with completely new parameters (not merging)
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: queryParams,
            replaceUrl: true
        });

        // Explicitly load inquiries with the search parameters
        this.loadInquiries(
            1,
            field,
            direction,
            searchParams,
            { status: this.filterState().statusFilters[this.filterState().activeTab] }
        );
    }

    /**
     * Execute search directly on button click
     */
    executeSearch(): void {
        this.handleSearch(this.searchState().term);
    }

    /**
     * Clear search and reset results
     */
    clearSearch(): void {
        this.searchState.update(state => ({
            term: '',
            params: {}
        }));

        // Reset URL but keep current tab and sort parameters
        const queryParams: any = { page: 1, tab: this.filterState().activeTab };

        // Add sort parameters
        const { field, direction } = this.sortState();
        if (field && direction) {
            queryParams.sortField = field;
            queryParams.sortDirection = direction;
        }

        // Navigate with complete replacement of query params
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: queryParams,
            replaceUrl: true
        });

        // Explicitly load inquiries with cleared search
        this.loadInquiries(
            1,
            this.sortState().field,
            this.sortState().direction,
            {},
            { status: this.filterState().statusFilters[this.filterState().activeTab] }
        );
    }

    /**
     * Load inquiries from the API
     */
    loadInquiries(
        page: number = 1,
        sortField: string | null = 'createdAt',
        sortDirection: 'asc' | 'desc' | null = 'desc',
        searchParams: Record<string, string> = {},
        filters: { status?: string[] } = {}
    ): void {
        // Store loading state outside effect
        this.inquiriesState.update(state => ({
            ...state,
            loading: true,
            error: null
        }));

        this.manualEntryService.getInquiries(
            page,
            sortField || undefined,
            sortDirection || undefined,
            searchParams,
            filters
        )
            .subscribe({
                next: (data) => {
                    if (!data || !data.inquiries) {
                        this.inquiriesState.update(state => ({
                            ...state,
                            inquiries: [],
                            totalInquiries: 0,
                            totalPages: 1,
                            pagination: {},
                            currentPage: 1,
                            error: 'Invalid response format from server',
                            loading: false
                        }));
                        return;
                    }

                    // Update inquiries state with data from API
                    this.inquiriesState.update(state => ({
                        ...state,
                        inquiries: data.inquiries,
                        totalInquiries: data.totalInquiries || 0,
                        totalPages: data.totalPages || 1,
                        pagination: data.pagination || {},
                        currentPage: data.currentPage || 1,
                        error: data.inquiries.length > 0 ? null :
                            (this.searchState().term ?
                                `No inquiries found matching "${this.searchState().term}"` :
                                'No inquiries found'),
                        loading: false
                    }));
                },
                error: (err) => {
                    this.inquiriesState.update(state => ({
                        ...state,
                        error: 'Failed to load inquiries. Please try again later.',
                        loading: false
                    }));
                    console.error('Error loading inquiries', err);
                }
            });
    }

    /**
     * Set active tab and update filters
     */
    setActiveTab(tab: 'all' | 'completed' | 'cancelled' | 'rejected' | 'archived'): void {
        if (tab === this.filterState().activeTab) {
            return; // No change needed
        }

        this.filterState.update(state => ({
            ...state,
            activeTab: tab
        }));

        // Update URL to include tab parameter
        const queryParams: any = {
            page: 1,
            tab: tab
        };

        // Add search term if present
        if (this.searchState().term) {
            queryParams.query = this.searchState().term;
        }

        // Add sort parameters
        const { field, direction } = this.sortState();
        if (field && direction) {
            queryParams.sortField = field;
            queryParams.sortDirection = direction;
        }

        // Update URL
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: queryParams,
            replaceUrl: true
        });

        // Explicitly load inquiries with the new tab's filters
        this.loadInquiries(
            1,
            field,
            direction,
            this.searchState().params,
            { status: this.filterState().statusFilters[tab] }
        );
    }

    /**
     * Sort inquiries by the specified field
     */
    sortBy(field: string): void {
        const currentSort = this.sortState();
        let newDirection: 'asc' | 'desc' | null = 'asc';

        // If clicking the same field, toggle direction
        if (currentSort.field === field) {
            newDirection = currentSort.direction === 'asc' ? 'desc' : 'asc';
        }

        // Update sort state
        this.sortState.update(state => ({
            field,
            direction: newDirection
        }));

        // Build complete query params object
        const queryParams: any = {
            page: 1,
            tab: this.filterState().activeTab,
            sortField: field,
            sortDirection: newDirection
        };

        // Add search params if they exist
        if (this.searchState().term) {
            queryParams.query = this.searchState().term;
        }

        // Update URL
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: queryParams,
            replaceUrl: true
        });

        // Load inquiries with new sort parameters
        this.loadInquiries(
            1,
            field,
            newDirection,
            this.searchState().params,
            { status: this.filterState().statusFilters[this.filterState().activeTab] }
        );
    }

    /**
     * Get the current sort icon class for a field
     */
    getSortIconClass(field: string): string {
        const { field: sortField, direction } = this.sortState();

        if (sortField !== field) {
            return 'manual-entry__sort-icon';
        }

        return direction === 'asc'
            ? 'manual-entry__sort-icon manual-entry__sort-icon--asc'
            : 'manual-entry__sort-icon manual-entry__sort-icon--desc';
    }

    /**
     * Toggle options menu for an inquiry
     */
    toggleOptions(inquiryId: string): void {
        if (this.selectedInquiryId() === inquiryId) {
            this.showOptions.update(value => !value);
        } else {
            this.selectedInquiryId.set(inquiryId);
            this.showOptions.set(true);
        }
    }

    /**
     * Generate an array of page numbers for pagination
     */
    generatePagesArray(): number[] {
        const { currentPage, totalPages } = this.inquiriesState();
        const maxPagesToShow = 5;

        if (totalPages <= maxPagesToShow) {
            // If we have 5 or fewer pages, show all of them
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        } else {
            // Calculate start and end page
            let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
            let endPage = startPage + maxPagesToShow - 1;

            // Adjust if we're near the end
            if (endPage > totalPages) {
                endPage = totalPages;
                startPage = Math.max(1, endPage - maxPagesToShow + 1);
            }

            // Create array of page numbers
            return Array.from(
                { length: endPage - startPage + 1 },
                (_, i) => startPage + i
            );
        }
    }

    /**
     * Change to a specific page
     */
    changePage(page: number): void {
        const { currentPage, totalPages } = this.inquiriesState();

        if (page < 1 || page > totalPages || page === currentPage) {
            return;
        }

        // Update URL with page parameter
        const queryParams: any = {
            page,
            tab: this.filterState().activeTab
        };

        // Add sorting params if they exist
        const { field, direction } = this.sortState();
        if (field && direction) {
            queryParams.sortField = field;
            queryParams.sortDirection = direction;
        }

        // Add search params if they exist
        if (this.searchState().term) {
            queryParams.query = this.searchState().term;
        }

        // Update URL
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: queryParams,
            replaceUrl: false
        });

        // Update current page in state
        this.inquiriesState.update(state => ({
            ...state,
            currentPage: page
        }));

        // Load inquiries for the new page
        this.loadInquiries(
            page,
            this.sortState().field,
            this.sortState().direction,
            this.searchState().params,
            { status: this.filterState().statusFilters[this.filterState().activeTab] }
        );
    }

    /**
     * Go to the next page
     */
    nextPage(): void {
        const { currentPage, totalPages } = this.inquiriesState();
        if (currentPage < totalPages) {
            this.changePage(currentPage + 1);
        }
    }

    /**
     * Navigate to inquiry details view
     */
    viewInquiryDetails(inquiryId: string): void {
        this.router.navigate(['/inquiries', inquiryId, 'view']);

        // Close the options menu
        this.showOptions.set(false);
        this.selectedInquiryId.set(null);
    }

    getResultsText(): string {
        const { currentPage, totalInquiries } = this.inquiriesState();
        const itemsPerPage = 30; // Assuming 30 items per page

        if (totalInquiries === 0) {
            return 'No results found';
        }

        const startItem = (currentPage - 1) * itemsPerPage + 1;
        const endItem = Math.min(currentPage * itemsPerPage, totalInquiries);
        return `Showing ${startItem} to ${endItem} from ${totalInquiries} results`;
    }

    /**
     * Format a date string to display format
     */
    formatDate(dateString: string): string {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }).replace(/\//g, '-');
    }

    /**
     * Get customer initials from user IRI
     * In a real app, you would fetch user data from API
     */
    getUserInitials(userIri: string): string {
        // Extract user ID from IRI
        const userId = userIri.split('/').pop() || '';

        // For demo purpose, return mock initials
        // In real application, you'd fetch user data
        return 'U' + userId.substring(0, 1).toUpperCase();
    }

    /**
     * Get customer name from user IRI
     * In a real app, you would fetch user data from API
     */
    getUserName(userIri: string): string {
        // Extract user ID from IRI
        const userId = userIri.split('/').pop() || '';

        // For demo purpose, return mock name
        // In real application, you'd fetch user data
        return 'User ' + userId.substring(0, 4);
    }

    /**
     * Count total parts across all machines in the inquiry
     */
    countTotalItems(inquiry: Inquiry): number {
        return inquiry.machines.reduce((total, machine) => {
            return total + machine.products.length;
        }, 0);
    }
}
