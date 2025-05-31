import { Component, OnInit, OnDestroy, inject, signal, computed, effect, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { BreadcrumbsComponent } from "@shared/components/ui/breadcrumbs/breadcrumbs.component";
import { Order } from '@models/order.model';
import { OrderService } from '@services/http/order.service';
import { PaginationLinks } from '@models/pagination.model';
import {DateFilterPipe} from "@shared/pipes/date-filter.pipe";

// Interfaces to represent component state
interface OrdersState {
    orders: Order[];
    loading: boolean;
    error: string | null;
    totalOrders: number;
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
    activeTab: 'latest' | 'completed' | 'canceled';
    statusFilters: Record<'latest' | 'completed' | 'canceled', string[]>;
}

@Component({
    selector: 'app-orders-list',
    imports: [CommonModule, BreadcrumbsComponent, FormsModule, DateFilterPipe],
    templateUrl: './orders-list.component.html',
    styleUrls: ['./orders-list.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [OrderService]
})
export class OrdersListComponent implements OnInit, OnDestroy {
    // Inject services
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private orderService = inject(OrderService);

    // UI state
    breadcrumbs = [{ label: 'Shop Orders' }];
    showOptions = signal(false);
    selectedOrderId = signal<string | null>(null);

    // State signals for reactive updates
    ordersState = signal<OrdersState>({
        orders: [],
        loading: false,
        error: null,
        totalOrders: 0,
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
        activeTab: 'latest',
        statusFilters: {
            latest: [], // Empty array means all statuses
            completed: ['completed'],
            canceled: ['canceled']
        }
    });

    // Map status values to display text
    statusDisplayMap: Record<string, string> = {
        'completed': 'Completed',
        'dispatched': 'Dispatched',
        'confirmed': 'Confirmed',
        'submitted': 'Submitted',
        'canceled': 'Canceled'
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
            this.ordersState.update(state => ({
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
                if (['latest', 'completed', 'canceled'].includes(params['tab'])) {
                    this.filterState.update(state => ({
                        ...state,
                        activeTab: params['tab'] as 'latest' | 'completed' | 'canceled'
                    }));
                }
            }

            // Explicitly call loadOrders with the current state
            this.loadOrders(
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

        // Explicitly load orders with the search parameters
        this.loadOrders(
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

        // Explicitly load orders with cleared search
        this.loadOrders(
            1,
            this.sortState().field,
            this.sortState().direction,
            {},
            { status: this.filterState().statusFilters[this.filterState().activeTab] }
        );
    }

    /**
     * Load orders from the API
     */
    loadOrders(
        page: number = 1,
        sortField: string | null = 'createdAt',
        sortDirection: 'asc' | 'desc' | null = 'desc',
        searchParams: Record<string, string> = {},
        filters: { status?: string[] } = {}
    ): void {
        // Store loading state outside effect
        this.ordersState.update(state => ({
            ...state,
            loading: true,
            error: null
        }));

        this.orderService.getOrders(
            page,
            sortField || undefined,
            sortDirection || undefined,
            searchParams,
            filters
        )
            .subscribe({
                next: (data) => {
                    if (!data || !data.orders) {
                        this.ordersState.update(state => ({
                            ...state,
                            orders: [],
                            totalOrders: 0,
                            totalPages: 1,
                            pagination: {},
                            currentPage: 1,
                            error: 'Invalid response format from server',
                            loading: false
                        }));
                        return;
                    }

                    // Update orders state with data from API
                    this.ordersState.update(state => ({
                        ...state,
                        orders: data.orders,
                        totalOrders: data.totalOrders || 0,
                        totalPages: data.totalPages || 1,
                        pagination: data.pagination || {},
                        currentPage: data.currentPage || 1,
                        error: data.orders.length > 0 ? null :
                            (this.searchState().term ?
                                `No orders found matching "${this.searchState().term}"` :
                                'No orders found'),
                        loading: false
                    }));
                },
                error: (err) => {
                    this.ordersState.update(state => ({
                        ...state,
                        error: 'Failed to load orders. Please try again later.',
                        loading: false
                    }));
                    console.error('Error loading orders', err);
                }
            });
    }

    /**
     * Set active tab and update filters
     */
    setActiveTab(tab: 'latest' | 'completed' | 'canceled'): void {
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

        // Explicitly load orders with the new tab's filters
        this.loadOrders(
            1,
            field,
            direction,
            this.searchState().params,
            { status: this.filterState().statusFilters[tab] }
        );
    }

    /**
     * Sort orders by the specified field
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

        // Load orders with new sort parameters
        this.loadOrders(
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
            return 'orders__sort-icon';
        }

        return direction === 'asc'
            ? 'orders__sort-icon orders__sort-icon--asc'
            : 'orders__sort-icon orders__sort-icon--desc';
    }

    /**
     * Toggle options menu for an order
     */
    toggleOptions(orderId: string): void {
        if (this.selectedOrderId() === orderId) {
            this.showOptions.update(value => !value);
        } else {
            this.selectedOrderId.set(orderId);
            this.showOptions.set(true);
        }
    }

    /**
     * Generate an array of page numbers for pagination
     */
    generatePagesArray(): number[] {
        const { currentPage, totalPages } = this.ordersState();
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
        const { currentPage, totalPages } = this.ordersState();

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
        this.ordersState.update(state => ({
            ...state,
            currentPage: page
        }));

        // Load orders for the new page
        this.loadOrders(
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
        const { currentPage, totalPages } = this.ordersState();
        if (currentPage < totalPages) {
            this.changePage(currentPage + 1);
        }
    }

    /**
     * Navigate to order details view
     */
    viewOrderDetails(orderId: string): void {
        this.router.navigate(['/orders', orderId, 'view']);

        // Close the options menu
        this.showOptions.set(false);
        this.selectedOrderId.set(null);
    }
    getResultsText(): string {
        const { currentPage, totalOrders } = this.ordersState();
        const itemsPerPage = 30; // Assuming 30 items per page

        if (totalOrders === 0) {
            return 'No results found';
        }

        const startItem = (currentPage - 1) * itemsPerPage + 1;
        const endItem = Math.min(currentPage * itemsPerPage, totalOrders);
        return `Showing ${startItem} to ${endItem} from ${totalOrders} results`;
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
     * Count total items across all order items
     */
    countTotalItems(order: Order): number {
        return order.items.reduce((total, item) => total + item.quantity, 0);
    }
}
