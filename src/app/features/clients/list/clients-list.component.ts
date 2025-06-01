import { Component, OnInit, OnDestroy, inject, signal, computed, effect, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { finalize, Subject, debounceTime, distinctUntilChanged, takeUntil, switchMap, catchError, map, of, combineLatest } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { ClientService } from '@services/http/client.service';
import { Client, ClientDetail } from '@models/client.model';
import { BreadcrumbsComponent } from '@shared/components/ui/breadcrumbs/breadcrumbs.component';
import { PaginationLinks } from '@models/pagination.model';

// Interfaces to represent component state
interface ClientsState {
    clients: Client[];
    loading: boolean;
    error: string | null;
    totalClients: number;
    currentPage: number;
    totalPages: number;
    pagination: PaginationLinks;
}

interface SearchState {
    term: string;
    params: Record<string, string>;
    searchType: 'name' | 'code';
}

interface SortState {
    field: string | null;
    direction: 'asc' | 'desc' | null;
}

interface SelectionState {
    selectedIds: Set<string>;
    allSelected: boolean;
}

@Component({
    selector: 'app-clients-list',
    imports: [CommonModule, BreadcrumbsComponent, FormsModule, RouterLink],
    templateUrl: './clients-list.component.html',
    styleUrls: ['./clients-list.component.scss'],
    providers: [ClientService],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClientsListComponent implements OnInit, OnDestroy {
    // Inject services
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private clientService = inject(ClientService);

    // UI state
    breadcrumbs = [{ label: 'Clients' }];
    showOptions = signal(false);
    selectedClientId = signal<string | null>(null);
    showExportMenu = signal(false);

    // State signals for reactive updates
    clientsState = signal<ClientsState>({
        clients: [],
        loading: false,
        error: null,
        totalClients: 0,
        currentPage: 1,
        totalPages: 1,
        pagination: {}
    });

    searchState = signal<SearchState>({
        term: '',
        params: {},
        searchType: 'name'
    });

    sortState = signal<SortState>({
        field: null,
        direction: null
    });

    selectionState = signal<SelectionState>({
        selectedIds: new Set<string>(),
        allSelected: false
    });

    // Computed values based on state
    pagesArray = computed(() => this.generatePagesArray());
    hasSelectedClients = computed(() => this.selectionState().selectedIds.size > 0);
    selectedCount = computed(() => this.selectionState().selectedIds.size);

    // Event subjects
    private searchInputSubject = new Subject<string>();
    private destroy$ = new Subject<void>();

    // Reactive route parameter observation
    private queryParams$ = this.route.queryParams.pipe(
        takeUntil(this.destroy$)
    );

    constructor() {
        // Remove the effect that was causing the infinite loop
        // The allSelected state will be managed directly in the toggle methods
    }

    ngOnInit(): void {
        // Setup search term debounce
        this.setupSearchDebounce();

        // Subscribe to route parameters
        this.queryParams$.subscribe(params => {
            // Parse page parameter
            const page = params['page'] ? parseInt(params['page'], 10) : 1;

            // Update sort state
            if (params['sortField'] && params['sortDirection']) {
                this.sortState.update(state => ({
                    ...state,
                    field: params['sortField'],
                    direction: params['sortDirection'] as 'asc' | 'desc'
                }));
            }

            // Update search state
            const searchParams: Record<string, string> = {};
            if (params['name']) {
                searchParams['name'] = params['name'];
                this.searchState.update(state => ({
                    term: params['name'],
                    params: searchParams,
                    searchType: 'name'
                }));
            } else if (params['code']) {
                searchParams['code'] = params['code'];
                this.searchState.update(state => ({
                    term: params['code'],
                    params: searchParams,
                    searchType: 'code'
                }));
            } else if (this.searchState().term) {
                this.searchState.update(state => ({
                    term: '',
                    params: {},
                    searchType: 'name'
                }));
            }

            // Update current page and load clients
            this.clientsState.update(state => ({
                ...state,
                currentPage: page
            }));

            this.loadClients(
                page,
                this.sortState().field,
                this.sortState().direction,
                this.searchState().params
            );
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Update the client state while maintaining immutability
     */
    private updateClientsState(update: Partial<ClientsState>): void {
        this.clientsState.update(state => ({
            ...state,
            ...update
        }));
    }

    /**
     * Update the selection state while maintaining immutability
     */
    private updateSelectionState(update: Partial<SelectionState>): void {
        this.selectionState.update(state => ({
            ...state,
            ...update
        }));
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
     * Handle search type change
     */
    onSearchTypeChange(type: 'name' | 'code'): void {
        this.searchState.update(state => ({
            ...state,
            searchType: type
        }));
        // Re-execute search if there's a term
        if (this.searchState().term) {
            this.handleSearch(this.searchState().term);
        }
    }

    /**
     * Handle search logic and navigate with search params
     */
    handleSearch(term: string): void {
        // Build query params object - always start with page 1
        const queryParams: any = { page: 1 };

        // Add search term if not empty
        if (term.trim()) {
            const searchType = this.searchState().searchType;
            queryParams[searchType] = term.trim();
            this.searchState.update(state => ({
                ...state,
                term: term.trim(),
                params: { [searchType]: term.trim() }
            }));
        } else {
            // Clear search params when empty
            this.searchState.update(state => ({
                ...state,
                term: '',
                params: {}
            }));
        }

        // Add sorting params if they exist
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
            params: {},
            searchType: 'name'
        }));

        // Completely reset URL - remove search parameters and set page to 1
        const queryParams: any = { page: 1 };

        // Only include sort parameters if they exist
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

        // Directly load clients without search params
        this.loadClients(1, this.sortState().field, this.sortState().direction, {});
    }

    /**
     * Load clients with improved error handling and loading state management
     */
    loadClients(
        page: number = 1,
        sortField: string | null = null,
        sortDirection: 'asc' | 'desc' | null = null,
        searchParams: Record<string, string> = {}
    ): void {
        // Update loading state
        this.updateClientsState({ loading: true, error: null });

        // Clear selections when loading new clients
        this.updateSelectionState({
            selectedIds: new Set<string>(),
            allSelected: false
        });

        // Optimized service call with improved error handling
        this.clientService.getClients(
            page,
            sortField || undefined,
            sortDirection || undefined,
            searchParams
        )
            .pipe(
                catchError(error => {
                    console.error('Error loading clients', error);
                    return of({
                        clients: [],
                        totalClients: 0,
                        pagination: {},
                        currentPage: page,
                        totalPages: 1
                    });
                }),
                finalize(() => {
                    this.updateClientsState({ loading: false });
                })
            )
            .subscribe({
                next: (data) => {
                    // Check if data and data.clients exist to avoid TypeError
                    if (!data || !data.clients) {
                        this.updateClientsState({
                            clients: [],
                            totalClients: 0,
                            totalPages: 1,
                            pagination: {},
                            currentPage: 1,
                            error: 'Invalid response format from server'
                        });
                        return;
                    }

                    // Using the spread operator to create new object instances for immutability
                    const clients = data.clients.map(client => ({...client}));

                    this.updateClientsState({
                        clients,
                        totalClients: data.totalClients || 0,
                        totalPages: data.totalPages || 1,
                        pagination: data.pagination || {},
                        currentPage: data.currentPage || 1,
                        error: data.clients.length > 0 ? null :
                            (this.searchState().term ?
                                `No clients found matching "${this.searchState().term}"` :
                                'No clients found')
                    });
                },
                error: (err) => {
                    this.updateClientsState({
                        error: 'Failed to load clients. Please try again later.'
                    });
                }
            });
    }

    /**
     * Sort clients by the specified field
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
            page: 1, // Reset to first page when sorting changes
            sortField: field,
            sortDirection: newDirection
        };

        // Add search params if they exist
        const searchType = this.searchState().searchType;
        if (this.searchState().term) {
            queryParams[searchType] = this.searchState().term;
        }

        // Update URL completely replacing parameters
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: queryParams
        });
    }

    /**
     * Get the current sort icon class for a field
     */
    getSortIconClass(field: string): string {
        const { field: sortField, direction } = this.sortState();

        if (sortField !== field) {
            return 'clients-list__sort-icon';
        }

        return direction === 'asc'
            ? 'clients-list__sort-icon clients-list__sort-icon--asc'
            : 'clients-list__sort-icon clients-list__sort-icon--desc';
    }

    /**
     * Generate an array of page numbers
     */
    generatePagesArray(): number[] {
        const { currentPage, totalPages } = this.clientsState();
        const maxPagesToShow = 5;

        if (totalPages <= maxPagesToShow) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        } else {
            let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
            let endPage = startPage + maxPagesToShow - 1;

            if (endPage > totalPages) {
                endPage = totalPages;
                startPage = Math.max(1, endPage - maxPagesToShow + 1);
            }

            return Array.from(
                { length: endPage - startPage + 1 },
                (_, i) => startPage + i
            );
        }
    }

    /**
     * Toggle options menu for a client
     */
    toggleOptions(clientId: string): void {
        if (this.selectedClientId() === clientId) {
            this.showOptions.update(value => !value);
        } else {
            this.selectedClientId.set(clientId);
            this.showOptions.set(true);
        }
    }

    /**
     * Toggle export menu
     */
    toggleExportMenu(): void {
        this.showExportMenu.update(value => !value);
    }

    /**
     * Check if a client is currently selected
     */
    isClientSelected(clientId: string): boolean {
        return this.selectionState().selectedIds.has(clientId);
    }

    /**
     * Toggle selection for all clients
     */
    toggleSelectAll(event: Event): void {
        const checked = (event.target as HTMLInputElement).checked;
        const newSelectedIds = new Set<string>();

        if (checked) {
            this.clientsState().clients.forEach(client => {
                newSelectedIds.add(client.id);
            });
        }

        this.updateSelectionState({
            selectedIds: newSelectedIds,
            allSelected: checked
        });
    }

    /**
     * Toggle selection for a single client
     */
    toggleSelectClient(event: Event, clientId: string): void {
        const checked = (event.target as HTMLInputElement).checked;
        const currentSelectedIds = new Set(this.selectionState().selectedIds); // Create a new Set to ensure immutability

        if (checked) {
            currentSelectedIds.add(clientId);
        } else {
            currentSelectedIds.delete(clientId);
        }

        const allSelected = this.clientsState().clients.length > 0 &&
            currentSelectedIds.size === this.clientsState().clients.length;

        this.updateSelectionState({
            selectedIds: currentSelectedIds,
            allSelected
        });
    }

    /**
     * Navigate to add new client
     */
    addClient(): void {
        this.router.navigate(['/clients/new']);
    }

    /**
     * Navigate to view client details
     */
    viewClient(clientId: string): void {
        this.router.navigate(['/clients', clientId]);
    }

    /**
     * Navigate to edit client
     */
    editClient(clientId: string): void {
        this.router.navigate(['/clients', clientId, 'edit']);
    }

    /**
     * Delete a single client
     */
    deleteClient(clientId: string): void {
        if (confirm('Are you sure you want to delete this client?')) {
            this.updateClientsState({ loading: true });

            this.clientService.deleteClient(clientId).pipe(
                finalize(() => this.updateClientsState({ loading: false }))
            ).subscribe({
                next: () => {
                    // Update local client list
                    const currentState = this.clientsState();
                    const updatedClients = currentState.clients.filter(c => c.id !== clientId);

                    // Remove from selected clients if it was selected
                    const currentSelectedIds = this.selectionState().selectedIds;
                    if (currentSelectedIds.has(clientId)) {
                        const newSelectedIds = new Set(currentSelectedIds);
                        newSelectedIds.delete(clientId);
                        this.updateSelectionState({
                            selectedIds: newSelectedIds,
                            allSelected: newSelectedIds.size === updatedClients.length && newSelectedIds.size > 0
                        });
                    }

                    // Update client state
                    this.updateClientsState({
                        clients: updatedClients,
                        totalClients: currentState.totalClients - 1
                    });

                    // Refresh the current page if it's empty
                    if (updatedClients.length === 0 && currentState.currentPage > 1) {
                        this.changePage(currentState.currentPage - 1);
                    }
                },
                error: (err) => {
                    console.error('Error deleting client', err);
                    alert('Failed to delete client. Please try again.');
                }
            });
        }
    }

    /**
     * Get all selected client IDs
     */
    getSelectedClientIds(): string[] {
        return Array.from(this.selectionState().selectedIds);
    }

    /**
     * Delete all selected clients
     */
    deleteSelectedClients(): void {
        const selectedIds = this.getSelectedClientIds();
        const selectedCount = selectedIds.length;

        if (selectedCount === 0) {
            return;
        }

        if (confirm(`Are you sure you want to delete ${selectedCount} selected client${selectedCount > 1 ? 's' : ''}?`)) {
            this.updateClientsState({ loading: true });

            this.clientService.deleteClients(selectedIds).subscribe({
                next: (result) => {
                    // Reload clients after bulk delete
                    this.loadClients(
                        this.clientsState().currentPage,
                        this.sortState().field,
                        this.sortState().direction,
                        this.searchState().params
                    );

                    // Clear selections
                    this.updateSelectionState({
                        selectedIds: new Set<string>(),
                        allSelected: false
                    });

                    // Show result message
                    if (result.failedCount > 0) {
                        alert(`Successfully deleted ${result.deletedCount} clients. Failed to delete ${result.failedCount} clients.`);
                    } else {
                        alert(`Successfully deleted ${result.deletedCount} clients.`);
                    }
                },
                error: (err) => {
                    console.error('Error deleting clients', err);
                    this.updateClientsState({ loading: false });
                    alert('Failed to delete clients. Please try again.');
                }
            });
        }
    }

    /**
     * Export clients to different formats
     */
    exportClients(format: 'csv' | 'excel' | 'pdf'): void {
        // TODO: Implement export functionality
        console.log(`Exporting clients as ${format}`);
        this.showExportMenu.set(false);
    }

    /**
     * Navigation methods for pagination
     */
    changePage(page: number): void {
        const { currentPage, totalPages } = this.clientsState();

        if (page < 1 || page > totalPages || page === currentPage) {
            return;
        }

        // Build a complete query params object
        const queryParams: any = { page };

        // Add sorting params if they exist
        const { field, direction } = this.sortState();
        if (field && direction) {
            queryParams.sortField = field;
            queryParams.sortDirection = direction;
        }

        // Add search params if they exist
        const searchType = this.searchState().searchType;
        if (this.searchState().term) {
            queryParams[searchType] = this.searchState().term;
        }

        // Update URL, completely replacing parameters
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: queryParams
        });
    }

    /**
     * Navigation helpers for pagination
     */
    goToFirstPage(): void {
        this.changePage(1);
    }

    goToPreviousPage(): void {
        const currentPage = this.clientsState().currentPage;
        if (currentPage > 1) {
            this.changePage(currentPage - 1);
        }
    }

    goToNextPage(): void {
        const { currentPage, totalPages } = this.clientsState();
        if (currentPage < totalPages) {
            this.changePage(currentPage + 1);
        }
    }

    goToLastPage(): void {
        this.changePage(this.clientsState().totalPages);
    }

    /**
     * Get text showing the current results range and total
     */
    getResultsText(): string {
        const { currentPage, totalClients } = this.clientsState();
        const itemsPerPage = 30; // Assuming 30 items per page
        const startItem = (currentPage - 1) * itemsPerPage + 1;
        const endItem = Math.min(currentPage * itemsPerPage, totalClients);
        return `Showing ${startItem} to ${endItem} from ${totalClients} results`;
    }

    /**
     * Format date for display
     */
    formatDate(dateString: string): string {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
}
