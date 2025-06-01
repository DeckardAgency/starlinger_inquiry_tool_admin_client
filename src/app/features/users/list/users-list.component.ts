import { Component, OnInit, OnDestroy, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { finalize, Subject, debounceTime, distinctUntilChanged, takeUntil, catchError, of } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { UserService } from '@services/http/user.service';
import { User, UserDetail, getRoleDisplayName, USER_ROLES } from '@models/auth.model';
import { BreadcrumbsComponent } from '@shared/components/ui/breadcrumbs/breadcrumbs.component';
import { PaginationLinks } from '@models/pagination.model';

// Interfaces to represent component state
interface UsersState {
    users: User[];
    loading: boolean;
    error: string | null;
    totalUsers: number;
    currentPage: number;
    totalPages: number;
    pagination: PaginationLinks;
}

interface SearchState {
    term: string;
    params: Record<string, string>;
    searchType: 'email' | 'clientCode';
}

interface SortState {
    field: string | null;
    direction: 'asc' | 'desc' | null;
}

interface SelectionState {
    selectedIds: Set<string>;
    allSelected: boolean;
}

interface FilterState {
    hasClient: 'all' | 'yes' | 'no';
    role: string;
}

@Component({
    selector: 'app-users-list',
    imports: [CommonModule, BreadcrumbsComponent, FormsModule, RouterLink],
    templateUrl: './users-list.component.html',
    styleUrls: ['./users-list.component.scss'],
    providers: [UserService],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class UsersListComponent implements OnInit, OnDestroy {
    // Inject services
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private userService = inject(UserService);

    // UI state
    breadcrumbs = [{ label: 'Users' }];
    showOptions = signal(false);
    selectedUserId = signal<string | null>(null);
    showRoleFilter = signal(false);

    // State signals for reactive updates
    usersState = signal<UsersState>({
        users: [],
        loading: false,
        error: null,
        totalUsers: 0,
        currentPage: 1,
        totalPages: 1,
        pagination: {}
    });

    searchState = signal<SearchState>({
        term: '',
        params: {},
        searchType: 'email'
    });

    sortState = signal<SortState>({
        field: null,
        direction: null
    });

    selectionState = signal<SelectionState>({
        selectedIds: new Set<string>(),
        allSelected: false
    });

    filterState = signal<FilterState>({
        hasClient: 'all',
        role: 'all'
    });

    // Computed values based on state
    pagesArray = computed(() => this.generatePagesArray());
    hasSelectedUsers = computed(() => this.selectionState().selectedIds.size > 0);
    selectedCount = computed(() => this.selectionState().selectedIds.size);

    // Available roles for filtering
    availableRoles = [
        { value: 'all', label: 'All Roles' },
        { value: USER_ROLES.USER, label: 'User' },
        { value: USER_ROLES.ADMIN, label: 'Administrator' },
        { value: USER_ROLES.MANAGER, label: 'Manager' },
        { value: USER_ROLES.SALES, label: 'Sales' }
    ];

    // Event subjects
    private searchInputSubject = new Subject<string>();
    private destroy$ = new Subject<void>();

    // Reactive route parameter observation
    private queryParams$ = this.route.queryParams.pipe(
        takeUntil(this.destroy$)
    );

    // Helper function to format roles
    getRoleDisplayName = getRoleDisplayName;

    constructor() {
        // No effects to avoid performance issues
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
            if (params['email']) {
                searchParams['email'] = params['email'];
                this.searchState.update(state => ({
                    term: params['email'],
                    params: searchParams,
                    searchType: 'email'
                }));
            } else if (params['clientCode']) {
                searchParams['clientCode'] = params['clientCode'];
                this.searchState.update(state => ({
                    term: params['clientCode'],
                    params: searchParams,
                    searchType: 'clientCode'
                }));
            } else if (this.searchState().term) {
                this.searchState.update(state => ({
                    term: '',
                    params: {},
                    searchType: 'email'
                }));
            }

            // Update filter state from params
            if (params['hasClient']) {
                this.filterState.update(state => ({
                    ...state,
                    hasClient: params['hasClient'] as 'all' | 'yes' | 'no'
                }));
            }
            if (params['role']) {
                this.filterState.update(state => ({
                    ...state,
                    role: params['role']
                }));
            }

            // Update current page and load users
            this.usersState.update(state => ({
                ...state,
                currentPage: page
            }));

            this.loadUsers(
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
     * Update the user state while maintaining immutability
     */
    private updateUsersState(update: Partial<UsersState>): void {
        this.usersState.update(state => ({
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
    onSearchTypeChange(type: 'email' | 'clientCode'): void {
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
     * Handle filter changes
     */
    onFilterChange(): void {
        // Trigger a new search with current filters
        this.changePage(1);
    }

    /**
     * Update has client filter
     */
    updateHasClientFilter(value: 'all' | 'yes' | 'no'): void {
        this.filterState.update(state => ({
            ...state,
            hasClient: value
        }));
        this.onFilterChange();
    }

    /**
     * Update role filter
     */
    updateRoleFilter(value: string): void {
        this.filterState.update(state => ({
            ...state,
            role: value
        }));
        this.onFilterChange();
        this.showRoleFilter.set(false);
    }

    /**
     * Clear all filters
     */
    clearAllFilters(): void {
        this.filterState.set({
            hasClient: 'all',
            role: 'all'
        });
        this.onFilterChange();
    }

    /**
     * Toggle role filter dropdown
     */
    toggleRoleFilter(): void {
        this.showRoleFilter.update(value => !value);
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

        // Add filter params
        const filters = this.filterState();
        if (filters.hasClient !== 'all') {
            queryParams.hasClient = filters.hasClient;
        }
        if (filters.role !== 'all') {
            queryParams.role = filters.role;
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
            searchType: 'email'
        }));

        // Completely reset URL - remove search parameters and set page to 1
        const queryParams: any = { page: 1 };

        // Only include sort parameters if they exist
        const { field, direction } = this.sortState();
        if (field && direction) {
            queryParams.sortField = field;
            queryParams.sortDirection = direction;
        }

        // Keep filter params
        const filters = this.filterState();
        if (filters.hasClient !== 'all') {
            queryParams.hasClient = filters.hasClient;
        }
        if (filters.role !== 'all') {
            queryParams.role = filters.role;
        }

        // Navigate with complete replacement of query params
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: queryParams,
            replaceUrl: true
        });
    }

    /**
     * Load users with improved error handling and loading state management
     */
    loadUsers(
        page: number = 1,
        sortField: string | null = null,
        sortDirection: 'asc' | 'desc' | null = null,
        searchParams: Record<string, string> = {}
    ): void {
        // Update loading state
        this.updateUsersState({ loading: true, error: null });

        // Clear selections when loading new users
        this.updateSelectionState({
            selectedIds: new Set<string>(),
            allSelected: false
        });

        // Apply client-side filters after loading
        // Note: Ideally these would be server-side filters
        const filters = this.filterState();

        // Optimized service call with improved error handling
        this.userService.getUsers(
            page,
            sortField || undefined,
            sortDirection || undefined,
            searchParams
        )
            .pipe(
                catchError(error => {
                    console.error('Error loading users', error);
                    return of({
                        users: [],
                        totalUsers: 0,
                        pagination: {},
                        currentPage: page,
                        totalPages: 1
                    });
                }),
                finalize(() => {
                    this.updateUsersState({ loading: false });
                })
            )
            .subscribe({
                next: (data) => {
                    // Check if data and data.users exist to avoid TypeError
                    if (!data || !data.users) {
                        this.updateUsersState({
                            users: [],
                            totalUsers: 0,
                            totalPages: 1,
                            pagination: {},
                            currentPage: 1,
                            error: 'Invalid response format from server'
                        });
                        return;
                    }

                    // Apply client-side filters
                    let filteredUsers = [...data.users];

                    // Filter by client presence
                    if (filters.hasClient === 'yes') {
                        filteredUsers = filteredUsers.filter(user => user.client);
                    } else if (filters.hasClient === 'no') {
                        filteredUsers = filteredUsers.filter(user => !user.client);
                    }

                    // Filter by role
                    if (filters.role !== 'all') {
                        filteredUsers = filteredUsers.filter(user =>
                            user.roles && user.roles.includes(filters.role)
                        );
                    }

                    this.updateUsersState({
                        users: filteredUsers,
                        totalUsers: data.totalUsers || 0,
                        totalPages: data.totalPages || 1,
                        pagination: data.pagination || {},
                        currentPage: data.currentPage || 1,
                        error: filteredUsers.length > 0 ? null :
                            (this.searchState().term ?
                                `No users found matching "${this.searchState().term}"` :
                                'No users found')
                    });
                },
                error: (err) => {
                    this.updateUsersState({
                        error: 'Failed to load users. Please try again later.'
                    });
                }
            });
    }

    /**
     * Sort users by the specified field
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

        // Add filter params
        const filters = this.filterState();
        if (filters.hasClient !== 'all') {
            queryParams.hasClient = filters.hasClient;
        }
        if (filters.role !== 'all') {
            queryParams.role = filters.role;
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
            return 'users-list__sort-icon';
        }

        return direction === 'asc'
            ? 'users-list__sort-icon users-list__sort-icon--asc'
            : 'users-list__sort-icon users-list__sort-icon--desc';
    }

    /**
     * Generate an array of page numbers
     */
    generatePagesArray(): number[] {
        const { currentPage, totalPages } = this.usersState();
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
     * Toggle options menu for a user
     */
    toggleOptions(userId: string): void {
        if (this.selectedUserId() === userId) {
            this.showOptions.update(value => !value);
        } else {
            this.selectedUserId.set(userId);
            this.showOptions.set(true);
        }
    }

    /**
     * Check if a user is currently selected
     */
    isUserSelected(userId: string): boolean {
        return this.selectionState().selectedIds.has(userId);
    }

    /**
     * Toggle selection for all users
     */
    toggleSelectAll(event: Event): void {
        const checked = (event.target as HTMLInputElement).checked;
        const newSelectedIds = new Set<string>();

        if (checked) {
            this.usersState().users.forEach(user => {
                newSelectedIds.add(user.id);
            });
        }

        this.updateSelectionState({
            selectedIds: newSelectedIds,
            allSelected: checked
        });
    }

    /**
     * Toggle selection for a single user
     */
    toggleSelectUser(event: Event, userId: string): void {
        const checked = (event.target as HTMLInputElement).checked;
        const currentSelectedIds = new Set(this.selectionState().selectedIds); // Create a new Set to ensure immutability

        if (checked) {
            currentSelectedIds.add(userId);
        } else {
            currentSelectedIds.delete(userId);
        }

        const allSelected = this.usersState().users.length > 0 &&
            currentSelectedIds.size === this.usersState().users.length;

        this.updateSelectionState({
            selectedIds: currentSelectedIds,
            allSelected
        });
    }

    /**
     * Navigate to add new user
     */
    addUser(): void {
        this.router.navigate(['/users/new']);
    }

    /**
     * Navigate to view user details
     */
    viewUser(userId: string): void {
        this.router.navigate(['/users', userId]);
    }

    /**
     * Navigate to edit user
     */
    editUser(userId: string): void {
        this.router.navigate(['/users', userId, 'edit']);
    }

    /**
     * Delete a single user
     */
    deleteUser(userId: string): void {
        if (confirm('Are you sure you want to delete this user?')) {
            this.updateUsersState({ loading: true });

            this.userService.deleteUser(userId).pipe(
                finalize(() => this.updateUsersState({ loading: false }))
            ).subscribe({
                next: () => {
                    // Update local user list
                    const currentState = this.usersState();
                    const updatedUsers = currentState.users.filter(u => u.id !== userId);

                    // Remove from selected users if it was selected
                    const currentSelectedIds = this.selectionState().selectedIds;
                    if (currentSelectedIds.has(userId)) {
                        const newSelectedIds = new Set(currentSelectedIds);
                        newSelectedIds.delete(userId);
                        this.updateSelectionState({
                            selectedIds: newSelectedIds,
                            allSelected: newSelectedIds.size === updatedUsers.length && newSelectedIds.size > 0
                        });
                    }

                    // Update user state
                    this.updateUsersState({
                        users: updatedUsers,
                        totalUsers: currentState.totalUsers - 1
                    });

                    // Refresh the current page if it's empty
                    if (updatedUsers.length === 0 && currentState.currentPage > 1) {
                        this.changePage(currentState.currentPage - 1);
                    }
                },
                error: (err) => {
                    console.error('Error deleting user', err);
                    alert('Failed to delete user. Please try again.');
                }
            });
        }
    }

    /**
     * Get all selected user IDs
     */
    getSelectedUserIds(): string[] {
        return Array.from(this.selectionState().selectedIds);
    }

    /**
     * Delete all selected users
     */
    deleteSelectedUsers(): void {
        const selectedIds = this.getSelectedUserIds();
        const selectedCount = selectedIds.length;

        if (selectedCount === 0) {
            return;
        }

        if (confirm(`Are you sure you want to delete ${selectedCount} selected user${selectedCount > 1 ? 's' : ''}?`)) {
            this.updateUsersState({ loading: true });

            this.userService.deleteUsers(selectedIds).subscribe({
                next: (result) => {
                    // Reload users after bulk delete
                    this.loadUsers(
                        this.usersState().currentPage,
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
                        alert(`Successfully deleted ${result.deletedCount} users. Failed to delete ${result.failedCount} users.`);
                    } else {
                        alert(`Successfully deleted ${result.deletedCount} users.`);
                    }
                },
                error: (err) => {
                    console.error('Error deleting users', err);
                    this.updateUsersState({ loading: false });
                    alert('Failed to delete users. Please try again.');
                }
            });
        }
    }

    /**
     * Reset password for a user
     */
    resetPassword(userId: string): void {
        if (confirm('Send password reset email to this user?')) {
            // TODO: Implement password reset functionality
            console.log(`Reset password for user ${userId}`);
            alert('Password reset email sent successfully.');
        }
    }

    /**
     * Navigation methods for pagination
     */
    changePage(page: number): void {
        const { currentPage, totalPages } = this.usersState();

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

        // Add filter params
        const filters = this.filterState();
        if (filters.hasClient !== 'all') {
            queryParams.hasClient = filters.hasClient;
        }
        if (filters.role !== 'all') {
            queryParams.role = filters.role;
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
        const currentPage = this.usersState().currentPage;
        if (currentPage > 1) {
            this.changePage(currentPage - 1);
        }
    }

    goToNextPage(): void {
        const { currentPage, totalPages } = this.usersState();
        if (currentPage < totalPages) {
            this.changePage(currentPage + 1);
        }
    }

    goToLastPage(): void {
        this.changePage(this.usersState().totalPages);
    }

    /**
     * Get text showing the current results range and total
     */
    getResultsText(): string {
        const { currentPage, totalUsers } = this.usersState();
        const itemsPerPage = 30; // Assuming 30 items per page
        const startItem = (currentPage - 1) * itemsPerPage + 1;
        const endItem = Math.min(currentPage * itemsPerPage, totalUsers);
        return `Showing ${startItem} to ${endItem} from ${totalUsers} results`;
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

    /**
     * Get full name for a user
     */
    getUserFullName(user: User): string {
        return `${user.firstName} ${user.lastName}`;
    }

    /**
     * Format roles for display
     */
    formatRoles(roles: string[]): string {
        if (!roles || roles.length === 0) return 'No roles';
        return roles.map(role => this.getRoleDisplayName(role)).join(', ');
    }
}
