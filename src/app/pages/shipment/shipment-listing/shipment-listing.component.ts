import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {Product} from "../../../interfaces/product.interface";
import {ProductService} from "../../../services/product.service";
import {SharedModule} from "../../../_metronic/shared/shared.module";
import {RouterLink} from "@angular/router";

@Component({
    selector: 'app-shipment-listing',
    templateUrl: './shipment-listing.component.html',
    standalone: true,
    imports: [CommonModule, SharedModule, RouterLink],
    styleUrls: ['./shipment-listing.component.scss']
})
export class ShipmentListingComponent implements OnInit {
    products: Product[] = [];
    isLoading = true;
    error: string | null = null;

    constructor(
        private productService: ProductService,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.loadProducts();
    }

    private loadProducts(): void {
        this.productService.getProducts().subscribe({
            next: (response) => {
                this.products = [...response.member];  // Create a new array reference
                this.isLoading = false;
                this.cdr.detectChanges();  // Force change detection
            },
            error: (error) => {
                this.error = 'Failed to load products. Please try again later.';
                this.isLoading = false;
                console.error('Error loading products:', error);
                this.cdr.detectChanges();  // Force change detection
            }
        });
    }
}
