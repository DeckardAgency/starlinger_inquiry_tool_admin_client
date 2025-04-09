import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { Router } from '@angular/router';
import { ProductService } from "../../../services/product.service";

@Component({
    selector: 'app-product-new',
    templateUrl: './product-new.component.html',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    animations: [
        trigger('tabAnimation', [
            state('void', style({ opacity: 0 })),
            state('*', style({ opacity: 1 })),
            transition('void <=> *', animate('300ms ease-in-out')),
            transition('* <=> *', animate('300ms ease-in-out'))
        ])
    ]
})
export class ProductNewComponent implements OnInit {
    productForm: FormGroup;
    activeTab: string = 'general';
    isSubmitting = false;
    imagePreview: string | null = null;
    featuredImage: File | null = null;

    constructor(
        private fb: FormBuilder,
        private productService: ProductService,
        private router: Router
    ) {
        this.productForm = this.fb.group({
            name: ['', Validators.required],
            shortDescription: [''],
            technicalDescription: [''],
            price: ['', [Validators.required, Validators.min(0)]],
            status: ['published'],
            category: [''],
            tags: [''],
            partNo: ['', Validators.required],
            quantity: ['0'],
            metaTitle: [''],
            metaDescription: [''],
            metaKeywords: ['']
        });
    }

    ngOnInit(): void {
        this.setActiveTab('general');
        this.initializeFormListeners();
    }

    private initializeFormListeners(): void {
        // Subscribe to form value changes if needed
        this.productForm.valueChanges.subscribe(() => {
            // Handle form value changes
        });
    }

    setActiveTab(tabId: 'general' | 'advanced'): void {
        this.activeTab = tabId;
    }

    isTabActive(tabId: string): boolean {
        return this.activeTab === tabId;
    }

    onImageChange(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files[0]) {
            this.featuredImage = input.files[0];

            // Create preview
            const reader = new FileReader();
            reader.onload = (e) => {
                this.imagePreview = e.target?.result as string;

                // Update the image preview in the DOM
                const previewElement = document.querySelector('.image-input-wrapper') as HTMLElement;
                if (previewElement) {
                    previewElement.style.backgroundImage = `url(${this.imagePreview})`;
                    previewElement.style.backgroundPosition = 'center';
                    previewElement.style.backgroundSize = 'cover';
                }
            };
            reader.readAsDataURL(input.files[0]);
        }
    }

    removeImage(): void {
        this.featuredImage = null;
        this.imagePreview = null;

        // Reset the input
        const input = document.querySelector('input[name="avatar"]') as HTMLInputElement;
        if (input) {
            input.value = '';
        }

        // Reset the preview
        const previewElement = document.querySelector('.image-input-wrapper') as HTMLElement;
        if (previewElement) {
            previewElement.style.backgroundImage = 'none';
        }
    }

    async onSubmit(): Promise<void> {
        if (this.productForm.invalid) {
            Object.keys(this.productForm.controls).forEach(key => {
                const control = this.productForm.get(key);
                control?.markAsTouched();
            });
            return;
        }

        this.isSubmitting = true;

        try {
            const formData = new FormData();
            const formValue = this.productForm.value;

            // Add form fields to FormData
            Object.keys(formValue).forEach(key => {
                if (formValue[key] !== null && formValue[key] !== undefined) {
                    formData.append(key, formValue[key]);
                }
            });

            // Add featured image if exists
            if (this.featuredImage) {
                formData.append('featuredImage', this.featuredImage);
            }

            console.log(formData);
            console.log(formValue);
            // Submit to API
            // await this.productService.createProduct(formData).toPromise();

            // Navigate to products list on success
            // await this.router.navigate(['/products']);


        } catch (error) {
            console.error('Error creating product:', error);
            // Handle error (show error message to user)
        } finally {
            this.isSubmitting = false;
        }
    }
}
