import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { BreadcrumbsComponent } from "@shared/components/ui/breadcrumbs/breadcrumbs.component";
import { OrderService } from '@services/http/order.service';
import { Order } from '@models/order.model';
import { finalize, delay } from 'rxjs/operators';
import { of } from 'rxjs';

interface OrderProduct {
    partNo: string;
    productName: string;
    weight: string;
    quantity: number;
    unitPrice: number;
    discount: string;
    price: number;
}

interface OrderMachine {
    name: string;
    products: OrderProduct[];
    isOpen: boolean;
}

@Component({
    selector: 'app-order-view',
    standalone: true,
    imports: [
        CommonModule,
        BreadcrumbsComponent
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

    // Mock data for display - in a real app, this would come from the API
    internalReference = '000123-ABC';
    dateCreated = '14-03-2024';
    partsOrdered = 12;

    paymentType = 'Bank transfer';
    deliveryType = 'DHL';
    priceWithoutTax = 4764.74;
    totalPrice = 5724.20;
    priceTax = 956.40;

    // Mock machines data
    machines: OrderMachine[] = [
        {
            name: '200XE Winding Machine',
            isOpen: true,
            products: [
                {
                    partNo: 'AIVV-01152',
                    productName: 'Power panel T30 4,3" WOVGA color touch',
                    weight: '0,4 kg',
                    quantity: 2,
                    unitPrice: 556.17,
                    discount: '10 %',
                    price: 1112.34
                },
                {
                    partNo: 'ZME-01171D',
                    productName: 'Modul FU-Stacofil 200XE',
                    weight: '1,4 kg',
                    quantity: 3,
                    unitPrice: 442.46,
                    discount: '20 %',
                    price: 1327.38
                },
                {
                    partNo: 'AEPI-01072',
                    productName: 'ABTASTKOPF f. induktives Winkelmesssystem',
                    weight: '0,263 kg',
                    quantity: 2,
                    unitPrice: 868.10,
                    discount: '–',
                    price: 1736.36
                }
            ]
        },
        {
            name: 'Alpha 6.0 Machine',
            isOpen: true,
            products: [
                {
                    partNo: 'AIHR-01039',
                    productName: 'Heating element',
                    weight: '1,5 kg',
                    quantity: 3,
                    unitPrice: 1855.01,
                    discount: '10 %',
                    price: 5565.03
                },
                {
                    partNo: 'VYC-00245F',
                    productName: 'SL 6 Shuttle Wheel (6,5") for Reed 10"',
                    weight: '0,09 kg',
                    quantity: 2,
                    unitPrice: 11.54,
                    discount: '–',
                    price: 23.08
                }
            ]
        }
    ];

    // Order totals
    grandTotal = 9764.19;
    amountPaid = 7811.352;

    constructor(
        private router: Router,
        private route: ActivatedRoute,
        private orderService: OrderService
    ) {}

    ngOnInit(): void {
        this.loadOrderData();
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
                // Add a small delay to show loading state in development
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
     * Toggle open/close state of a machine section
     */
    toggleMachine(machine: OrderMachine): void {
        machine.isOpen = !machine.isOpen;
    }

    /**
     * Print the order
     */
    printOrder(): void {
        window.print();
    }

    /**
     * Export the order to a file
     */
    exportOrder(): void {
        // Implement export functionality
        alert('Export functionality would be implemented here');
    }

    /**
     * Save changes to the order
     */
    saveOrder(): void {
        // Implement save functionality
        alert('Save functionality would be implemented here');
    }
}
