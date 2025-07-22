import { Component, OnInit, OnDestroy, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { finalize, Subject, debounceTime, distinctUntilChanged, takeUntil, of, catchError } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { MachineService } from "@services/http/machine.service";
import { Machine } from "@models/machine.model";
import { BreadcrumbsComponent } from "@shared/components/ui/breadcrumbs/breadcrumbs.component";
import { PaginationLinks } from "@models/machine.model";
import { DateFilterPipe } from "@shared/pipes/date-filter.pipe";

// Interfaces to represent component state
interface MachinesState {
    machines: Machine[];
    loading: boolean;
    error: string | null;
    totalMachines: number;
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

interface SelectionState {
    selectedIds: Set<string>;
    allSelected: boolean;
}

@Component({
    selector: 'app-machines-list',
    imports: [CommonModule, BreadcrumbsComponent, DateFilterPipe, FormsModule],
    templateUrl: './machines-list.component.html',
    styleUrls: ['./machines-list.component.scss'],
    providers: [MachineService],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MachinesListComponent implements OnInit, OnDestroy {
    // Inject services
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private machineService = inject(MachineService);

    // UI state
    breadcrumbs = [{ label: 'Machines' }];
    showOptions = signal(false);
    selectedMachineId = signal<string | null>(null);

    // State signals for reactive updates
    machinesState = signal<MachinesState>({
        machines: [],
        loading: false,
        error: null,
        totalMachines: 0,
        currentPage: 1,
        totalPages: 1,
        pagination: {}
    });

    searchState = signal<SearchState>({
        term: '',
        params: {}
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

    // Event subjects
    private searchInputSubject = new Subject<string>();
    private destroy$ = new Subject<void>();

    // Reactive route parameter observation
    private queryParams$ = this.route.queryParams.pipe(
        takeUntil(this.destroy$)
    );

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
            if (params['articleDescription']) {
                searchParams['articleDescription'] = params['articleDescription'];
                this.searchState.update(state => ({
                    term: params['articleDescription'],
                    params: searchParams
                }));
            } else if (this.searchState().term) {
                this.searchState.update(state => ({
                    term: '',
                    params: {}
                }));
            }

            // Update current page and load machines
            this.machinesState.update(state => ({
                ...state,
                currentPage: page
            }));

            this.loadMachines(
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
     * Update the machine state while maintaining immutability
     */
    private updateMachinesState(update: Partial<MachinesState>): void {
        this.machinesState.update(state => ({
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
     * Handle search logic and navigate with search params
     */
    handleSearch(term: string): void {
        // Build query params object - always start with page 1
        const queryParams: any = { page: 1 };

        // Add search term if not empty
        if (term.trim()) {
            queryParams.articleDescription = term.trim();
            this.searchState.update(state => ({
                term: term.trim(),
                params: { articleDescription: term.trim() }
            }));
        } else {
            // Clear search params when empty
            this.searchState.update(state => ({
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
            replaceUrl: true // Replace current URL instead of adding to history
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
            params: {}
        }));

        // Completely reset URL - remove articleDescription parameter and set page to 1
        // While preserving only sorting parameters if they exist
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
            replaceUrl: true // Replace the URL instead of adding to browser history
        });

        // Directly load machines without search params
        this.loadMachines(1, this.sortState().field, this.sortState().direction, {});
    }

    /**
     * Load machines with improved error handling and loading state management
     */
    loadMachines(
        page: number = 1,
        sortField: string | null = null,
        sortDirection: 'asc' | 'desc' | null = null,
        searchParams: Record<string, string> = {}
    ): void {
        // Update loading state
        this.updateMachinesState({ loading: true, error: null });

        // Clear selections when loading new machines
        this.updateSelectionState({
            selectedIds: new Set<string>(),
            allSelected: false
        });

        // Optimized service call with improved error handling
        this.machineService.getMachines(
            page,
            sortField || undefined,
            sortDirection || undefined,
            searchParams
        )
            .pipe(
                catchError(error => {
                    console.error('Error loading machines', error);
                    return of({
                        machines: [],
                        totalItems: 0,
                        pagination: {},
                        currentPage: page,
                        totalPages: 1
                    });
                }),
                finalize(() => {
                    this.updateMachinesState({ loading: false });
                })
            )
            .subscribe({
                next: (data) => {
                    // Check if data and data.machines exist to avoid TypeError
                    if (!data || !data.machines) {
                        this.updateMachinesState({
                            machines: [],
                            totalMachines: 0,
                            totalPages: 1,
                            pagination: {},
                            currentPage: 1,
                            error: 'Invalid response format from server'
                        });
                        return;
                    }

                    // Using the spread operator to create new object instances for immutability
                    const machines = data.machines.map(machine => ({...machine}));

                    this.updateMachinesState({
                        machines,
                        totalMachines: data.totalItems || 0,
                        totalPages: data.totalPages || 1,
                        pagination: data.pagination || {},
                        currentPage: data.currentPage || 1,
                        error: data.machines.length > 0 ? null :
                            (this.searchState().term ?
                                `No machines found matching "${this.searchState().term}"` :
                                'No machines found')
                    });
                },
                error: (err) => {
                    this.updateMachinesState({
                        error: 'Failed to load machines. Please try again later.'
                    });
                }
            });
    }

    /**
     * Sort machines by the specified field - with improved implementation
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
        if (this.searchState().term) {
            queryParams.articleDescription = this.searchState().term;
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
            return 'machine-list__sort-icon';
        }

        return direction === 'asc'
            ? 'machine-list__sort-icon machine-list__sort-icon--asc'
            : 'machine-list__sort-icon machine-list__sort-icon--desc';
    }

    /**
     * Generate an array of page numbers - optimized implementation
     */
    generatePagesArray(): number[] {
        const { currentPage, totalPages } = this.machinesState();
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

    toggleOptions(machineId: string): void {
        if (this.selectedMachineId() === machineId) {
            this.showOptions.update(value => !value);
        } else {
            this.selectedMachineId.set(machineId);
            this.showOptions.set(true);
        }
    }

    /**
     * Check if a machine is currently selected
     */
    isMachineSelected(machineId: string): boolean {
        return this.selectionState().selectedIds.has(machineId);
    }

    /**
     * Toggle selection for all machines - fixed implementation
     */
    toggleSelectAll(event: Event): void {
        const checked = (event.target as HTMLInputElement).checked;
        const newSelectedIds = new Set<string>();

        if (checked) {
            // Select all machines
            this.machinesState().machines.forEach(machine => {
                newSelectedIds.add(machine.id);
            });
        }

        this.updateSelectionState({
            selectedIds: newSelectedIds,
            allSelected: checked
        });
    }

    /**
     * Toggle selection for a single machine - fixed implementation
     */
    toggleSelectMachine(event: Event, machineId: string): void {
        const checked = (event.target as HTMLInputElement).checked;
        const currentSelectedIds = new Set(this.selectionState().selectedIds); // Create a new Set to ensure immutability

        if (checked) {
            currentSelectedIds.add(machineId);
        } else {
            currentSelectedIds.delete(machineId);
        }

        const allSelected = this.machinesState().machines.length > 0 &&
            currentSelectedIds.size === this.machinesState().machines.length;

        this.updateSelectionState({
            selectedIds: currentSelectedIds,
            allSelected
        });
    }

    addMachine(): void {
        this.router.navigate(['/machines/new']);
    }

    editMachine(machineId: string): void {
        this.router.navigate([`/machines/`, machineId, 'edit']);
    }

    /**
     * Delete machine with optimized implementation
     */
    deleteMachine(machineId: string): void {
        if (confirm('Are you sure you want to delete this machine?')) {
            this.updateMachinesState({ loading: true });

            this.machineService.deleteMachine(machineId).pipe(
                finalize(() => this.updateMachinesState({ loading: false }))
            ).subscribe({
                next: () => {
                    // Update local machine list
                    const currentState = this.machinesState();
                    const updatedMachines = currentState.machines.filter(m => m.id !== machineId);

                    // Remove from selected machines if it was selected
                    const currentSelectedIds = this.selectionState().selectedIds;
                    if (currentSelectedIds.has(machineId)) {
                        const newSelectedIds = new Set(currentSelectedIds);
                        newSelectedIds.delete(machineId);
                        this.updateSelectionState({
                            selectedIds: newSelectedIds,
                            allSelected: newSelectedIds.size === updatedMachines.length && newSelectedIds.size > 0
                        });
                    }

                    // Update machine state
                    this.updateMachinesState({
                        machines: updatedMachines,
                        totalMachines: currentState.totalMachines - 1
                    });

                    // Refresh the current page if it's empty
                    if (updatedMachines.length === 0 && currentState.currentPage > 1) {
                        this.changePage(currentState.currentPage - 1);
                    }
                },
                error: (err) => {
                    console.error('Error deleting machine', err);
                    alert('Failed to delete machine. Please try again.');
                }
            });
        }
    }

    /**
     * Get all selected machine IDs
     */
    getSelectedMachineIds(): string[] {
        return Array.from(this.selectionState().selectedIds);
    }

    /**
     * Delete all selected machines with improved implementation
     */
    deleteSelectedMachines(): void {
        const selectedIds = this.getSelectedMachineIds();
        const selectedCount = selectedIds.length;

        if (selectedCount === 0) {
            return;
        }

        if (confirm(`Are you sure you want to delete ${selectedCount} selected machine${selectedCount > 1 ? 's' : ''}?`)) {
            this.updateMachinesState({ loading: true });

            // Use the bulk delete method from the service
            this.machineService.deleteMachines(selectedIds).subscribe({
                next: (result) => {
                    // Reload machines after bulk delete
                    this.loadMachines(
                        this.machinesState().currentPage,
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
                        alert(`Successfully deleted ${result.deletedCount} machines. Failed to delete ${result.failedCount} machines.`);
                    } else {
                        alert(`Successfully deleted ${result.deletedCount} machines.`);
                    }
                },
                error: (err) => {
                    console.error('Error deleting machines', err);
                    this.updateMachinesState({ loading: false });
                    alert('Failed to delete machines. Please try again.');
                }
            });
        }
    }

    /**
     * Navigation methods for pagination - with improved implementation
     */
    changePage(page: number): void {
        const { currentPage, totalPages } = this.machinesState();

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
        if (this.searchState().term) {
            queryParams.articleDescription = this.searchState().term;
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
        const currentPage = this.machinesState().currentPage;
        if (currentPage > 1) {
            this.changePage(currentPage - 1);
        }
    }

    goToNextPage(): void {
        const { currentPage, totalPages } = this.machinesState();
        if (currentPage < totalPages) {
            this.changePage(currentPage + 1);
        }
    }

    goToLastPage(): void {
        this.changePage(this.machinesState().totalPages);
    }

    /**
     * Get text showing the current results range and total
     */
    getResultsText(): string {
        const { currentPage, totalMachines } = this.machinesState();
        const itemsPerPage = 30; // Assuming 30 items per page
        const startItem = (currentPage - 1) * itemsPerPage + 1;
        const endItem = Math.min(currentPage * itemsPerPage, totalMachines);
        return `Showing ${startItem} to ${endItem} from ${totalMachines} results`;
    }
}
