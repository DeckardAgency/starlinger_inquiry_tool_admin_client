import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {BreadcrumbsComponent} from "@shared/components/ui/breadcrumbs/breadcrumbs.component";

interface RelatedProduct {
    id: string;
    code: string;
    name: string;
    status: 'Active' | 'Inactive';
    available: boolean;
    related: boolean;
}

interface SelectedProduct {
    id: string;
    code: string;
    name: string;
    status: 'Active';
    sortOrder: number;
}

@Component({
    selector: 'app-product-edit',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule, BreadcrumbsComponent],
    templateUrl: './machines-edit.component.html',
    styleUrls: ['./machines-edit.component.scss']
})
export class MachinesEditComponent implements OnInit {
    breadcrumbs = [
        { label: 'Products', url: '/products/list' },
        { label: 'Add New' },
    ];
    productForm!: FormGroup;
    isActive: boolean = true;
    isReadyForShop: boolean = true;
    relatedProducts: RelatedProduct[] = [];
    selectedProducts: SelectedProduct[] = [];
    activeTab: "shortDescription" | "technicalDescription" | "featuredImage" | "imageGallery" = 'shortDescription';
    currentPage: number = 1;
    totalPages: number = 3;
    totalRelatedProducts: number = 192;
    totalSelectedProducts: number = 3;
    editorText: string = '';

    constructor(private fb: FormBuilder, private router: Router) {}

    ngOnInit(): void {
        this.initForm();
        this.loadMockData();
    }

    initForm(): void {
        this.productForm = this.fb.group({
            name: ['', Validators.required],
            slug: [''],
            partNo: [''],
            shortDescription: [''],
            unit: [''],
            price: [''],
            weight: [''],
            technicalDescription: [''],
            featuredImage: [''],
            createdAt: [''],
            updatedAt: [''],
            imageGallery: ['']
        });
    }

    loadMockData(): void {
        // Mock related products data
        this.relatedProducts = [
            { id: '0001', code: 'AIVS-01197', name: 'Analog input module', status: 'Active', available: true, related: true },
            { id: '0002', code: 'AIVS-01199', name: 'Block: Klotz', status: 'Active', available: true, related: true },
            { id: '0003', code: 'AESA-0002', name: 'Bus Controller', status: 'Active', available: true, related: true },
            { id: '0004', code: 'AESA-0001', name: 'Bus Modul', status: 'Active', available: true, related: true },
            { id: '0005', code: 'Z3I-10337A', name: 'Cartridge heater', status: 'Active', available: true, related: true },
            { id: '0006', code: 'AESA-0001', name: 'Control unit adjusted', status: 'Active', available: true, related: true },
            { id: '0007', code: 'AIVS-01197', name: 'Control unit extension', status: 'Active', available: true, related: true },
            { id: '0008', code: 'Z3I-10337A', name: 'Die plate', status: 'Active', available: true, related: true },
            { id: '0009', code: 'AESA-0001', name: 'Digital input module', status: 'Active', available: true, related: true },
            { id: '0010', code: 'AIVS-01197', name: 'Energy measurement module', status: 'Active', available: true, related: true },
            { id: '0011', code: 'AESA-0001', name: 'Fill level limit switch', status: 'Active', available: true, related: true }
        ];

        // Mock selected products data
        this.selectedProducts = [
            { id: '0001', code: 'AIVS-01197', name: 'Analog input module', status: 'Active', sortOrder: 1 },
            { id: '0002', code: 'AIVS-01199', name: 'Block: Klotz', status: 'Active', sortOrder: 3 },
            { id: '0003', code: 'AESA-0002', name: 'Bus Controller', status: 'Active', sortOrder: 2 }
        ];
    }

    toggleActive(): void {
        this.isActive = !this.isActive;
    }

    toggleReadyForShop(): void {
        this.isReadyForShop = !this.isReadyForShop;
    }

    setActiveTab(tab: "shortDescription" | "technicalDescription" | "featuredImage" | "imageGallery"): void {
        this.activeTab = tab;
    }

    addSelectedProducts(): void {
        console.log('Add selected products');
    }

    removeRelatedProduct(id: string): void {
        console.log('Remove related product:', id);
    }

    getResultsText(currentItems: number, totalItems: number): string {
        return `Showing 1 to ${currentItems} from ${totalItems} results`;
    }

    changePage(page: number): void {
        this.currentPage = page;
    }

    nextPage(): void {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
        }
    }

    goBack(): void {
        this.router.navigate(['/products/list']);
    }

    saveProduct(): void {
        if (this.productForm.valid) {
            console.log('Product saved', this.productForm.value);
        } else {
            console.log('Form is invalid');
        }
    }

    saveAndContinue(): void {
        if (this.productForm.valid) {
            console.log('Product saved and continuing', this.productForm.value);
        } else {
            console.log('Form is invalid');
        }
    }
}
