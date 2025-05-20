import { Component, OnInit, OnDestroy, inject, signal, computed, effect, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { finalize, Subject, debounceTime, distinctUntilChanged, takeUntil, switchMap, catchError, map, of, combineLatest } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { ProductService } from "@services/http/product.service";
import { Product } from "@models/product.model";
import { BreadcrumbsComponent } from "@shared/components/ui/breadcrumbs/breadcrumbs.component";
import { PaginationLinks } from "@models/pagination.model";

// Interfaces to represent component state
interface ProductsState {
    products: Product[];
    loading: boolean;
    error: string | null;
    totalProducts: number;
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
    selector: 'app-product-list',
    standalone: true,
    imports: [CommonModule, BreadcrumbsComponent, FormsModule],
    templateUrl: './products-list.component.html',
    styleUrls: ['./products-list.component.scss'],
    providers: [ProductService],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductsListComponent implements OnInit, OnDestroy {
    // Inject services
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private productService = inject(ProductService);

    // UI state
    breadcrumbs = [{ label: 'Products' }];
    showOptions = signal(false);
    selectedProductId = signal<string | null>(null);

    // State signals for reactive updates
    productsState = signal<ProductsState>({
        products: [],
        loading: false,
        error: null,
        totalProducts: 0,
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

    constructor() {
        // Set up effects to react to state changes
        effect(() => {
            // When selection changes, update allSelected
            const ids = this.selectionState().selectedIds;
            const products = this.productsState().products;
            if (products.length > 0 && ids.size === products.length) {
                this.updateSelectionState({ allSelected: true });
            } else if (this.selectionState().allSelected && ids.size < products.length) {
                this.updateSelectionState({ allSelected: false });
            }
        });
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
                    params: searchParams
                }));
            } else if (this.searchState().term) {
                this.searchState.update(state => ({
                    term: '',
                    params: {}
                }));
            }

            // Update current page and load products
            this.productsState.update(state => ({
                ...state,
                currentPage: page
            }));

            this.loadProducts(
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
     * Update products state while maintaining immutability
     */
    private updateProductsState(update: Partial<ProductsState>): void {
        this.productsState.update(state => ({
            ...state,
            ...update
        }));
    }

    /**
     * Update selection state while maintaining immutability
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
            queryParams.name = term.trim();
            this.searchState.update(state => ({
                term: term.trim(),
                params: { name: term.trim() }
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

        // Completely reset URL - remove name parameter and set page to 1
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

        // Directly load products without search params
        this.loadProducts(1, this.sortState().field, this.sortState().direction, {});
    }

    /**
     * Load products with improved error handling and loading state management
     */
    loadProducts(
        page: number = 1,
        sortField: string | null = null,
        sortDirection: 'asc' | 'desc' | null = null,
        searchParams: Record<string, string> = {}
    ): void {
        // Update loading state
        this.updateProductsState({ loading: true, error: null });

        // Clear selections when loading new products
        this.updateSelectionState({
            selectedIds: new Set<string>(),
            allSelected: false
        });

        // Optimized service call with improved error handling
        this.productService.getProducts(
            page,
            sortField || undefined,
            sortDirection || undefined,
            searchParams
        )
            .pipe(
                catchError(error => {
                    console.error('Error loading products', error);
                    return of({
                        products: [],
                        totalItems: 0,
                        pagination: {},
                        currentPage: page,
                        totalPages: 1
                    });
                }),
                finalize(() => {
                    this.updateProductsState({ loading: false });
                })
            )
            .subscribe({
                next: (data) => {
                    // Check if data and data.products exist to avoid TypeError
                    if (!data || !data.products) {
                        this.updateProductsState({
                            products: [],
                            totalProducts: 0,
                            totalPages: 1,
                            pagination: {},
                            currentPage: 1,
                            error: 'Invalid response format from server'
                        });
                        return;
                    }

                    // Using the spread operator to create new object instances for immutability
                    const products = data.products.map(product => ({...product}));

                    this.updateProductsState({
                        products,
                        totalProducts: data.totalItems || 0,
                        totalPages: data.totalPages || 1,
                        pagination: data.pagination || {},
                        currentPage: data.currentPage || 1,
                        error: data.products.length > 0 ? null :
                            (this.searchState().term ?
                                `No products found matching "${this.searchState().term}"` :
                                'No products found')
                    });
                },
                error: (err) => {
                    this.updateProductsState({
                        error: 'Failed to load products. Please try again later.'
                    });
                }
            });
    }

    /**
     * Sort products by the specified field - with improved implementation
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
            queryParams.name = this.searchState().term;
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
            return 'product-list__sort-icon';
        }

        return direction === 'asc'
            ? 'product-list__sort-icon product-list__sort-icon--asc'
            : 'product-list__sort-icon product-list__sort-icon--desc';
    }

    /**
     * Generate an array of page numbers - optimized implementation
     */
    generatePagesArray(): number[] {
        const { currentPage, totalPages } = this.productsState();
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

    toggleOptions(productId: string): void {
        if (this.selectedProductId() === productId) {
            this.showOptions.update(value => !value);
        } else {
            this.selectedProductId.set(productId);
            this.showOptions.set(true);
        }
    }

    /**
     * Check if a product is currently selected
     */
    isProductSelected(productId: string): boolean {
        return this.selectionState().selectedIds.has(productId);
    }

    /**
     * Toggle selection for all products - improved implementation
     */
    toggleSelectAll(event: Event): void {
        const checked = (event.target as HTMLInputElement).checked;
        const newSelectedIds = new Set<string>();

        if (checked) {
            // Select all products
            this.productsState().products.forEach(product => {
                newSelectedIds.add(product.id);
            });
        }

        this.updateSelectionState({
            selectedIds: newSelectedIds,
            allSelected: checked
        });
    }

    /**
     * Toggle selection for a single product - improved implementation
     */
    toggleSelectProduct(event: Event, productId: string): void {
        const checked = (event.target as HTMLInputElement).checked;
        const currentSelectedIds = this.selectionState().selectedIds;
        const newSelectedIds = new Set(currentSelectedIds);

        if (checked) {
            newSelectedIds.add(productId);
        } else {
            newSelectedIds.delete(productId);
        }

        const allSelected =
            newSelectedIds.size === this.productsState().products.length &&
            newSelectedIds.size > 0;

        this.updateSelectionState({
            selectedIds: newSelectedIds,
            allSelected
        });
    }

    addProduct(): void {
        this.router.navigate(['/products/new']);
    }

    editProduct(productId: string): void {
        this.router.navigate([`/products/`, productId, 'edit']);
    }

    /**
     * Delete product with optimized implementation
     */
    deleteProduct(productId: string): void {
        if (confirm('Are you sure you want to delete this product?')) {
            this.updateProductsState({ loading: true });

            this.productService.deleteProduct(productId).pipe(
                finalize(() => this.updateProductsState({ loading: false }))
            ).subscribe({
                next: () => {
                    // Update local product list
                    const currentState = this.productsState();
                    const updatedProducts = currentState.products.filter(p => p.id !== productId);

                    // Remove from selected products if it was selected
                    const currentSelectedIds = this.selectionState().selectedIds;
                    if (currentSelectedIds.has(productId)) {
                        const newSelectedIds = new Set(currentSelectedIds);
                        newSelectedIds.delete(productId);
                        this.updateSelectionState({
                            selectedIds: newSelectedIds,
                            allSelected: newSelectedIds.size === updatedProducts.length && newSelectedIds.size > 0
                        });
                    }

                    // Update product state
                    this.updateProductsState({
                        products: updatedProducts,
                        totalProducts: currentState.totalProducts - 1
                    });

                    // Refresh the current page if it's empty
                    if (updatedProducts.length === 0 && currentState.currentPage > 1) {
                        this.changePage(currentState.currentPage - 1);
                    }
                },
                error: (err) => {
                    console.error('Error deleting product', err);
                    alert('Failed to delete product. Please try again.');
                }
            });
        }
    }

    /**
     * Get all selected product IDs
     */
    getSelectedProductIds(): string[] {
        return Array.from(this.selectionState().selectedIds);
    }

    /**
     * Delete all selected products with improved implementation
     */
    deleteSelectedProducts(): void {
        const selectedIds = this.getSelectedProductIds();
        const selectedCount = selectedIds.length;

        if (selectedCount === 0) {
            return;
        }

        if (confirm(`Are you sure you want to delete ${selectedCount} selected product${selectedCount > 1 ? 's' : ''}?`)) {
            this.updateProductsState({ loading: true });

            // Track deletion progress
            let deletedCount = 0;
            let errorCount = 0;

            // Process deletions one by one
            selectedIds.forEach(id => {
                this.productService.deleteProduct(id).subscribe({
                    next: () => {
                        deletedCount++;

                        if (deletedCount + errorCount === selectedCount) {
                            // All deletion requests completed
                            this.loadProducts(
                                this.productsState().currentPage,
                                this.sortState().field,
                                this.sortState().direction,
                                this.searchState().params
                            );

                            this.updateSelectionState({
                                selectedIds: new Set<string>(),
                                allSelected: false
                            });

                            this.updateProductsState({ loading: false });

                            alert(`Successfully deleted ${deletedCount} products. Failed to delete ${errorCount} products.`);
                        }
                    },
                    error: (err) => {
                        console.error('Error deleting product', err);
                        errorCount++;

                        if (deletedCount + errorCount === selectedCount) {
                            // All deletion requests completed
                            this.loadProducts(
                                this.productsState().currentPage,
                                this.sortState().field,
                                this.sortState().direction,
                                this.searchState().params
                            );

                            this.updateSelectionState({
                                selectedIds: new Set<string>(),
                                allSelected: false
                            });

                            this.updateProductsState({ loading: false });

                            alert(`Successfully deleted ${deletedCount} products. Failed to delete ${errorCount} products.`);
                        }
                    }
                });
            });
        }
    }

    /**
     * Navigation methods for pagination - with improved implementation
     */
    changePage(page: number): void {
        const { currentPage, totalPages } = this.productsState();

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
            queryParams.name = this.searchState().term;
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
        const currentPage = this.productsState().currentPage;
        if (currentPage > 1) {
            this.changePage(currentPage - 1);
        }
    }

    goToNextPage(): void {
        const { currentPage, totalPages } = this.productsState();
        if (currentPage < totalPages) {
            this.changePage(currentPage + 1);
        }
    }

    goToLastPage(): void {
        this.changePage(this.productsState().totalPages);
    }

    /**
     * Get text showing the current results range and total
     */
    getResultsText(): string {
        const { currentPage, totalProducts } = this.productsState();
        const itemsPerPage = 30; // Assuming 30 items per page
        const startItem = (currentPage - 1) * itemsPerPage + 1;
        const endItem = Math.min(currentPage * itemsPerPage, totalProducts);
        return `Showing ${startItem} to ${endItem} from ${totalProducts} results`;
    }
}
