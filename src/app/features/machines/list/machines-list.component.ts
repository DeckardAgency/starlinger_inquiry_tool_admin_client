import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';
import { MachineService } from "@services/http/machine.service";
import { Machine } from "@models/machine.model";
import { BreadcrumbsComponent } from "@shared/components/ui/breadcrumbs/breadcrumbs.component";
import { PaginationLinks } from "@models/machine.model";

@Component({
    selector: 'app-machines-list',
    imports: [CommonModule, BreadcrumbsComponent],
    templateUrl: './machines-list.component.html',
    styleUrls: ['./machines-list.component.scss'],
    providers: [MachineService]
})
export class MachinesListComponent implements OnInit {
    breadcrumbs = [
        { label: 'Machines' }
    ];

    machines: Machine[] = [];
    showOptions: boolean = false;
    selectedMachineId: string | null = null;

    // Set to track selected machine IDs
    selectedMachineIds: Set<string> = new Set<string>();
    allSelected: boolean = false;

    // Pagination properties
    currentPage: number = 1;
    totalPages: number = 1;
    totalMachines: number = 0;
    pagination: PaginationLinks = {};
    pagesArray: number[] = [];

    loading: boolean = false;
    error: string | null = null;

    constructor(
        private router: Router,
        private route: ActivatedRoute,
        private machineService: MachineService
    ) {}

    ngOnInit(): void {
        // Subscribe to route query params to get page
        this.route.queryParams.subscribe(params => {
            const page = params['page'] ? parseInt(params['page'], 10) : 1;
            this.currentPage = page;
            this.loadMachines(page);
        });
    }

    loadMachines(page: number = 1): void {
        this.loading = true;
        this.error = null;

        // Clear selections when loading new machines
        this.selectedMachineIds.clear();
        this.allSelected = false;

        this.machineService.getMachines(page)
            .pipe(
                finalize(() => {
                    this.loading = false;
                })
            )
            .subscribe({
                next: (data) => {
                    this.machines = data.machines.map(machine => ({...machine}));

                    // Update pagination data
                    this.totalMachines = data.totalItems;
                    if (data.pagination.last != null) {
                        this.totalPages = parseInt(data.pagination.last);
                    }
                    this.pagination = data.pagination;
                    this.currentPage = data.currentPage;

                    // Generate pages array for pagination UI
                    this.generatePagesArray();
                },
                error: (err) => {
                    console.error('Error loading machines', err);
                    this.error = 'Failed to load machines. Please try again later.';
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

    toggleOptions(machineId: string): void {
        if (this.selectedMachineId === machineId) {
            this.showOptions = !this.showOptions;
        } else {
            this.selectedMachineId = machineId;
            this.showOptions = true;
        }
    }

    /**
     * Check if a machine is currently selected
     */
    isMachineSelected(machineId: string): boolean {
        return this.selectedMachineIds.has(machineId);
    }

    /**
     * Toggle selection for all machines
     */
    toggleSelectAll(event: Event): void {
        const checked = (event.target as HTMLInputElement).checked;
        this.allSelected = checked;

        if (checked) {
            // Select all machines
            this.machines.forEach(machine => {
                this.selectedMachineIds.add(machine.id);
            });
        } else {
            // Deselect all machines
            this.selectedMachineIds.clear();
        }
    }

    /**
     * Toggle selection for a single machine
     */
    toggleSelectMachine(event: Event, machineId: string): void {
        const checked = (event.target as HTMLInputElement).checked;

        if (checked) {
            this.selectedMachineIds.add(machineId);

            // Check if all machines are now selected
            this.allSelected = this.selectedMachineIds.size === this.machines.length;
        } else {
            this.selectedMachineIds.delete(machineId);
            this.allSelected = false;
        }
    }

    addMachine(): void {
        this.router.navigate(['/machines/new']);
    }

    editMachine(machineId: string): void {
        this.router.navigate([`/machines/`, machineId, 'edit']);
    }

    deleteMachine(machineId: string): void {
        if (confirm('Are you sure you want to delete this machine?')) {
            this.machineService.deleteMachine(machineId).subscribe({
                next: () => {
                    // Remove from local array
                    this.machines = this.machines.filter(m => m.id !== machineId);

                    // Remove from selected machines if it was selected
                    if (this.selectedMachineIds.has(machineId)) {
                        this.selectedMachineIds.delete(machineId);
                    }

                    // Update total
                    this.totalMachines--;

                    // Refresh the current page if it's empty
                    if (this.machines.length === 0 && this.currentPage > 1) {
                        this.changePage(this.currentPage - 1);
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
        return Array.from(this.selectedMachineIds);
    }

    /**
     * Delete all selected machines
     */
    deleteSelectedMachines(): void {
        const selectedCount = this.selectedMachineIds.size;

        if (selectedCount === 0) {
            return;
        }

        if (confirm(`Are you sure you want to delete ${selectedCount} selected machine${selectedCount > 1 ? 's' : ''}?`)) {
            // Implementation depends on if your API supports bulk delete
            // For now, we'll delete one by one
            const selectedIds = this.getSelectedMachineIds();

            // Track deletion progress
            let deletedCount = 0;
            let errorCount = 0;

            selectedIds.forEach(id => {
                this.machineService.deleteMachine(id).subscribe({
                    next: () => {
                        deletedCount++;

                        if (deletedCount + errorCount === selectedCount) {
                            // All deletion requests completed
                            this.loadMachines(this.currentPage);
                            alert(`Successfully deleted ${deletedCount} machines. Failed to delete ${errorCount} machines.`);
                        }
                    },
                    error: (err) => {
                        console.error('Error deleting machine', err);
                        errorCount++;

                        if (deletedCount + errorCount === selectedCount) {
                            // All deletion requests completed
                            this.loadMachines(this.currentPage);
                            alert(`Successfully deleted ${deletedCount} machines. Failed to delete ${errorCount} machines.`);
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
        const itemsPerPage = 30; // Assuming 30 items per page
        const startItem = (this.currentPage - 1) * itemsPerPage + 1;
        const endItem = Math.min(this.currentPage * itemsPerPage, this.totalMachines);
        return `Showing ${startItem} to ${endItem} from ${this.totalMachines} results`;
    }
}
