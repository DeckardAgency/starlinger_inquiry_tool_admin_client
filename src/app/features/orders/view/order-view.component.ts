import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { BreadcrumbsComponent } from "@shared/components/ui/breadcrumbs/breadcrumbs.component";
import { OrderService } from '@services/http/order.service';
import { Order } from '@models/order.model';
import {finalize, delay, switchMap} from 'rxjs/operators';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from "@angular/forms";
import { SelectComponent } from "@shared/components/select/select.component";
import { PriceFilterAdvancedPipe } from "@shared/pipes/price-filter-advanced.pipe";
import { DateFilterPipe } from "@shared/pipes/date-filter.pipe";
import { tap } from "rxjs";
import { NotificationService } from "@services/notification.service";

interface StatusOption {
    value: string;
    label: string;
}

@Component({
    selector: 'app-order-view',
    imports: [
        CommonModule,
        BreadcrumbsComponent,
        FormsModule,
        ReactiveFormsModule,
        SelectComponent,
        PriceFilterAdvancedPipe,
        DateFilterPipe
    ],
    templateUrl: './order-view.component.html',
    styleUrls: ['./order-view.component.scss']
})
export class OrderViewComponent implements OnInit {
    breadcrumbs = [
        { label: 'Orders', link: '/orders/list' },
        { label: 'Order Details' },
    ];

    order: Order | null = null;
    isLoading = true;
    error: string | null = null;
    statusForm: FormGroup;

    // Track the saved status separately from the form value
    savedStatus: string = '';

    // Status options for the select component
    statusOptions: StatusOption[] = [
        { value: 'submitted', label: 'Submitted' },
        { value: 'confirmed', label: 'Confirmed' },
        { value: 'dispatched', label: 'Dispatched' },
        { value: 'completed', label: 'Completed' },
        { value: 'canceled', label: 'Canceled' }
    ];

    // Order totals calculated from items
    grandTotal = 0;
    priceWithoutTax = 0;
    priceTax = 0;

    // Status badge mapping for log messages
    statusBadgeMap: { [key: string]: string } = {
        'submitted': 'Submitted',
        'confirmed': 'Confirmed',
        'dispatched': 'Dispatched',
        'completed': 'Completed',
        'canceled': 'Canceled'
    };

    constructor(
        private router: Router,
        private route: ActivatedRoute,
        private orderService: OrderService,
        private fb: FormBuilder,
        private notificationService: NotificationService
    ) {
        // Initialize the form with a default status
        this.statusForm = this.fb.group({
            status: ['draft'] // Default status
        });
    }

    ngOnInit(): void {
        this.loadOrderData();

        // Subscribe to status changes
        this.statusForm.get('status')?.valueChanges.subscribe(value => {
            console.log('Status changed to:', value);
            // Here you would typically call an API to update the order status
            // this.updateOrderStatus(value);
        });
    }

    /**
     * Load order data from the API
     */
    loadOrderData(): void {
        const orderId = this.route.snapshot.paramMap.get('id');

        if (!orderId) {
            this.isLoading = false;
            this.error = 'Order ID is required';
            return;
        }

        // Update breadcrumbs with order ID
        this.breadcrumbs = [
            { label: 'Orders', link: '/orders/list' },
            { label: `Order #${orderId.substring(0, 8)}` },
        ];

        this.orderService.getOrder(orderId)
            .pipe(
                // Add a small delay to show the loading state in development
                delay(300),
                finalize(() => {
                    this.isLoading = false;
                })
            )
            .subscribe({
                next: (order) => {
                    if (order) {
                        this.order = order;

                        // Update breadcrumbs with order number if available
                        if (order.orderNumber) {
                            this.breadcrumbs = [
                                { label: 'Orders', link: '/orders/list' },
                                { label: order.orderNumber },
                            ];
                        }

                        // Set the current status in the form and track the saved status
                        if (order.status) {
                            this.savedStatus = order.status;
                            this.statusForm.patchValue({
                                status: order.status
                            });
                        }

                        // Calculate totals from order items
                        this.calculateTotals();

                        console.log('Order data loaded:', order);
                    } else {
                        this.error = 'Order not found';
                    }
                },
                error: (err) => {
                    console.error('Error loading order:', err);
                    this.error = 'Failed to load order data';
                }
            });
    }

    /**
     * Navigate back to orders list
     */
    goBack(): void {
        this.router.navigate(['/orders/list']);
    }

    /**
     * Calculate order totals from items
     */
    calculateTotals(): void {
        if (!this.order || !this.order.items) {
            return;
        }

        // Calculate grand total from order totalAmount or sum of items
        this.grandTotal = this.order.totalAmount || 0;

        // If we don't have totalAmount, calculate from items
        if (!this.grandTotal && this.order.items.length > 0) {
            this.grandTotal = this.order.items.reduce((sum, item) => sum + item.subtotal, 0);
        }

        // Calculate price without tax (assuming 20% VAT for demo)
        const taxRate = 0.20;
        this.priceWithoutTax = this.grandTotal / (1 + taxRate);
        this.priceTax = this.grandTotal - this.priceWithoutTax;
    }

    /**
     * Toggle open/close state of a machine section
     */
    toggleMachine(machine: any): void {
        // This method is no longer needed as we're not using machine sections
    }

    /**
     * Print the order
     */
    printOrder(): void {
        window.print();
    }

    /**
     * Export the order to PDF
     */
    exportOrder(): void {
        if (!this.order) {
            this.notificationService.error('No order loaded to export');
            return;
        }

        // Show loading state
        const exportButton = document.querySelector('.order-view__export-button') as HTMLButtonElement;
        const originalButtonContent = exportButton?.innerHTML;

        if (exportButton) {
            exportButton.disabled = true;
            exportButton.innerHTML = `
            <svg class="spinner" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1V4M8 12V15M3.05 3.05L5.17 5.17M10.83 10.83L12.95 12.95M1 8H4M12 8H15M3.05 12.95L5.17 10.83M10.83 5.17L12.95 3.05" stroke="#232323" stroke-width="1.33" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Exporting...
        `;
        }

        this.orderService.exportOrderPdf(this.order.id).subscribe({
            next: (blob) => {
                // Create a download link
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;

                // Set filename with order number and current date
                const date = new Date();
                const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                a.download = `order_${this.order!.orderNumber}_${dateStr}.pdf`;

                // Trigger download
                document.body.appendChild(a);
                a.click();

                // Cleanup
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                // Show success notification
                this.notificationService.success('Order exported successfully!');
            },
            error: (error) => {
                console.error('Export error:', error);

                // Show a specific error message based on an error type
                if (error.status === 403) {
                    this.notificationService.error('You do not have permission to export this order.');
                } else if (error.status === 404) {
                    this.notificationService.error('Order not found.');
                } else if (error.status === 0) {
                    this.notificationService.error('Network error. Please check your connection.');
                } else {
                    this.notificationService.error('Failed to export order. Please try again.');
                }
            },
            complete: () => {
                // Reset button state
                if (exportButton && originalButtonContent) {
                    exportButton.disabled = false;
                    exportButton.innerHTML = originalButtonContent;
                }
            }
        });
    }

    /**
     * Save changes to the order
     */
    saveOrder(): void {
        if (!this.order) {
            return;
        }

        const currentStatus = this.statusForm.get('status')?.value;
        const updateData = { status: currentStatus };

        this.orderService.updateOrder(this.order.id, updateData)
            .pipe(
                tap(() => alert(`Order saved with status: ${this.getCurrentStatusLabel()}`)),
                // Switch to loading the order after the update completes
                switchMap(() => this.orderService.getOrder(this.order!.id))
            )
            .subscribe({
                next: (updatedOrder) => {
                    this.order = updatedOrder;

                    // Show success notification
                    // this.notificationService.success(`Order was updated successfully!`);

                    // Update the saved status after a successful save
                    this.savedStatus = updatedOrder.status || '';
                    this.calculateTotals();
                },
                error: (err) => {
                    console.error('Error updating order:', err);
                    alert('Failed to save order');
                }
            });
    }

    /**
     * Handle status change from the select component
     */
    onStatusChange(selectedOption: any): void {
        console.log('Status selection changed:', selectedOption);

        // The select component will automatically update the form control
        // through the ControlValueAccessor interface

        // You can perform additional actions here if needed
        // For example, show a confirmation dialog for certain status changes
        if (selectedOption?.value === 'canceled') {
            // You might want to confirm this action
            console.log('Order is being canceled');
        }
    }

    /**
     * Get the label for the current status to display in the header
     */
    getCurrentStatusLabel(): string {
        const currentStatus = this.statusForm.get('status')?.value;
        const statusOption = this.statusOptions.find(opt => opt.value === currentStatus);
        return statusOption?.label || 'Unknown';
    }

    /**
     * Get the saved status label to display in the header badge
     */
    getSavedStatusLabel(): string {
        const statusOption = this.statusOptions.find(opt => opt.value === this.savedStatus);
        return statusOption?.label || 'Unknown';
    }

    /**
     * Get the CSS class for the status badge based on the saved status
     */
    getStatusClass(): string {
        switch (this.savedStatus) {
            case 'submitted':
                return 'order-view__status--submitted';
            case 'confirmed':
                return 'order-view__status--confirmed';
            case 'dispatched':
                return 'order-view__status--dispatched';
            case 'completed':
                return 'order-view__status--completed';
            case 'canceled':
                return 'order-view__status--canceled';
            default:
                return '';
        }
    }

    /**
     * Check if there are unsaved changes
     */
    hasUnsavedChanges(): boolean {
        const currentStatus = this.statusForm.get('status')?.value;
        return currentStatus !== this.savedStatus;
    }

    /**
     * Get the CSS class for log status badges
     */
    getLogStatusClass(status: string): string {
        const normalizedStatus = status.toLowerCase().replace(/ /g, '_');

        switch (normalizedStatus) {
            case 'submitted':
                return 'logs-section__status--submitted';
            case 'confirmed':
                return 'logs-section__status--confirmed';
            case 'dispatched':
                return 'logs-section__status--dispatched';
            case 'completed':
                return 'logs-section__status--completed';
            case 'canceled':
                return 'logs-section__status--canceled';
            default:
                return 'logs-section__status--default';
        }
    }

    /**
     * Format log date
     */
    formatLogDate(dateString: string): string {
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');

        return `${day}-${month}-${year}  ${hours}:${minutes}`;
    }

    /**
     * Format date for display
     */
    formatDate(dateString: string | undefined): string {
        if (!dateString) return 'N/A';

        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();

        return `${day}/${month}/${year}`;
    }

    protected readonly status = status;
}
