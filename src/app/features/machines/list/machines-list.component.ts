import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';
import { ProductService } from "@services/http/product.service";
import { Product } from "@models/product.model";
import { BreadcrumbsComponent } from "@shared/components/ui/breadcrumbs/breadcrumbs.component";
import { PaginationLinks } from "@models/pagination.model";

@Component({
    selector: 'app-product-list',
    standalone: true,
    imports: [CommonModule, BreadcrumbsComponent],
    templateUrl: './machines-list.component.html',
    styleUrls: ['./machines-list.component.scss'],
    providers: [ProductService]
})
export class MachinesListComponent implements OnInit {
    breadcrumbs = [
        { label: 'Machines' }
    ];

    products: Product[] = [];
    showOptions: boolean = false;
    selectedProductId: string | null = null;

    // Set to track selected product IDs
    selectedProductIds: Set<string> = new Set<string>();
    allSelected: boolean = false;

    // Pagination properties
    currentPage: number = 1;
    totalPages: number = 1;
    totalProducts: number = 0;
    pagination: PaginationLinks = {};
    pagesArray: number[] = [];

    loading: boolean = false;
    error: string | null = null;

    constructor(
        private router: Router,
        private route: ActivatedRoute,
        private productService: ProductService
    ) {}

    ngOnInit(): void {
        // Subscribe to route query params to get page
        this.route.queryParams.subscribe(params => {
            const page = params['page'] ? parseInt(params['page'], 10) : 1;
            this.currentPage = page;
            this.loadProducts(page);
        });
    }

    loadProducts(page: number = 1): void {
        this.loading = true;
        this.error = null;

        // Clear selections when loading new products
        this.selectedProductIds.clear();
        this.allSelected = false;

        this.productService.getProducts(page)
            .pipe(
                finalize(() => {
                    this.loading = false;
                })
            )
            .subscribe({
                next: (data) => {
                    this.products = data.products.map(product => ({...product}));

                    // Update pagination data
                    this.totalProducts = data.totalItems;
                    if (data.pagination.last != null) {
                        this.totalPages = parseInt(data.pagination.last);
                    }
                    this.pagination = data.pagination;
                    this.currentPage = data.currentPage;

                    // Generate pages array for pagination UI
                    this.generatePagesArray();
                },
                error: (err) => {
                    console.error('Error loading products', err);
                    this.error = 'Failed to load products. Please try again later.';
                }
            });
    }

    /**
     * Generate an array of page numbers to display in pagination
     */
    generatePagesArray(): void {
        // Show a maximum of 5-page numbers at once
        const maxPagesToShow = 5;
        this.pagesArray = [];

        if (this.totalPages <= maxPagesToShow) {
            // If we have 5 or fewer pages, show all of them
            for (let i = 1; i <= this.totalPages; i++) {
                this.pagesArray.push(i);
            }
        } else {
            // Otherwise, show current page and some pages before and after
            let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
            let endPage = startPage + maxPagesToShow - 1;

            // Adjust if we're near the end
            if (endPage > this.totalPages) {
                endPage = this.totalPages;
                startPage = Math.max(1, endPage - maxPagesToShow + 1);
            }

            for (let i = startPage; i <= endPage; i++) {
                this.pagesArray.push(i);
            }
        }
    }

    toggleOptions(productId: string): void {
        if (this.selectedProductId === productId) {
            this.showOptions = !this.showOptions;
        } else {
            this.selectedProductId = productId;
            this.showOptions = true;
        }
    }

    /**
     * Check if a product is currently selected
     */
    isProductSelected(productId: string): boolean {
        return this.selectedProductIds.has(productId);
    }

    /**
     * Toggle selection for all products
     */
    toggleSelectAll(event: Event): void {
        const checked = (event.target as HTMLInputElement).checked;
        this.allSelected = checked;

        if (checked) {
            // Select all products
            this.products.forEach(product => {
                this.selectedProductIds.add(product.id);
            });
        } else {
            // Deselect all products
            this.selectedProductIds.clear();
        }
    }

    /**
     * Toggle selection for a single product
     */
    toggleSelectProduct(event: Event, productId: string): void {
        const checked = (event.target as HTMLInputElement).checked;

        if (checked) {
            this.selectedProductIds.add(productId);

            // Check if all products are now selected
            this.allSelected = this.selectedProductIds.size === this.products.length;
        } else {
            this.selectedProductIds.delete(productId);
            this.allSelected = false;
        }
    }

    addProduct(): void {
        this.router.navigate(['/products/new']);
    }

    editProduct(productId: string): void {
        this.router.navigate([`/products/`, productId, 'edit']);
    }

    deleteProduct(productId: string): void {
        if (confirm('Are you sure you want to delete this product?')) {
            this.productService.deleteProduct(productId).subscribe({
                next: () => {
                    // Remove from local array
                    this.products = this.products.filter(p => p.id !== productId);

                    // Remove from selected products if it was selected
                    if (this.selectedProductIds.has(productId)) {
                        this.selectedProductIds.delete(productId);
                    }

                    // Update total
                    this.totalProducts--;

                    // Refresh the current page if it's empty
                    if (this.products.length === 0 && this.currentPage > 1) {
                        this.changePage(this.currentPage - 1);
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
        return Array.from(this.selectedProductIds);
    }

    /**
     * Delete all selected products
     */
    deleteSelectedProducts(): void {
        const selectedCount = this.selectedProductIds.size;

        if (selectedCount === 0) {
            return;
        }

        if (confirm(`Are you sure you want to delete ${selectedCount} selected product${selectedCount > 1 ? 's' : ''}?`)) {
            // Implementation depends on if your API supports bulk delete
            // For now, we'll delete one by one
            const selectedIds = this.getSelectedProductIds();

            // Track deletion progress
            let deletedCount = 0;
            let errorCount = 0;

            selectedIds.forEach(id => {
                this.productService.deleteProduct(id).subscribe({
                    next: () => {
                        deletedCount++;

                        if (deletedCount + errorCount === selectedCount) {
                            // All deletion requests completed
                            this.loadProducts(this.currentPage);
                            alert(`Successfully deleted ${deletedCount} products. Failed to delete ${errorCount} products.`);
                        }
                    },
                    error: (err) => {
                        console.error('Error deleting product', err);
                        errorCount++;

                        if (deletedCount + errorCount === selectedCount) {
                            // All deletion requests completed
                            this.loadProducts(this.currentPage);
                            alert(`Successfully deleted ${deletedCount} products. Failed to delete ${errorCount} products.`);
                        }
                    }
                });
            });
        }
    }

    /**
     * Navigate to a specific page
     */
    changePage(page: number): void {
        if (page < 1 || page > this.totalPages || page === this.currentPage) {
            return;
        }

        // Update URL with the new page parameter
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { page },
            queryParamsHandling: 'merge'
        });
    }

    /**
     * Navigate to the first page
     */
    goToFirstPage(): void {
        this.changePage(1);
    }

    /**
     * Navigate to the previous page
     */
    goToPreviousPage(): void {
        if (this.currentPage > 1) {
            this.changePage(this.currentPage - 1);
        }
    }

    /**
     * Navigate to the next page
     */
    goToNextPage(): void {
        if (this.currentPage < this.totalPages) {
            this.changePage(this.currentPage + 1);
        }
    }

    /**
     * Navigate to the last page
     */
    goToLastPage(): void {
        this.changePage(this.totalPages);
    }

    /**
     * Get text showing the current results range and total
     */
    getResultsText(): string {
        const itemsPerPage = 30; // Assuming 20 items per page
        const startItem = (this.currentPage - 1) * itemsPerPage + 1;
        const endItem = Math.min(this.currentPage * itemsPerPage, this.totalProducts);
        return `Showing ${startItem} to ${endItem} from ${this.totalProducts} results`;
    }
}
