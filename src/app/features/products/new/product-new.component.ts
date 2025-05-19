import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { BreadcrumbsComponent } from "@shared/components/ui/breadcrumbs/breadcrumbs.component";
import { ProductImageGalleryComponent } from "@shared/components/product-image-gallery/product-image-gallery.component";
import { TextEditorComponent } from "@shared/components/text-editor/text-editor.component";
import { ProductService } from "@services/http/product.service";
import { finalize } from "rxjs/operators";
import { MediaItem } from "@models/media.model";
import { ProductFeaturedImageComponent } from "@shared/components/product-featured-image/product-featured-image.component";
import {
    trigger,
    state,
    style,
    animate,
    transition
} from '@angular/animations';
import { NotificationService } from "@services/notification.service";

@Component({
    selector: 'app-product-new',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        BreadcrumbsComponent,
        ProductImageGalleryComponent,
        ProductFeaturedImageComponent,
        TextEditorComponent
    ],
    templateUrl: './product-new.component.html',
    styleUrls: ['./product-new.component.scss'],
    animations: [
        trigger('tabAnimation', [
            // Fade in and translate up slightly
            transition(':enter', [
                style({ opacity: 0, transform: 'translateY(10px)' }),
                animate('300ms ease-out',
                    style({ opacity: 1, transform: 'translateY(0)' }))
            ]),
            // Fade out and translate down slightly
            transition(':leave', [
                style({ opacity: 1, transform: 'translateY(0)' }),
                animate('200ms ease-in',
                    style({ opacity: 0, transform: 'translateY(10px)' }))
            ])
        ]),
        trigger('tabIndicator', [
            // Animation for the active tab indicator
            state('shortDescription', style({
                left: '0%',
                width: '25%'
            })),
            state('technicalDescription', style({
                left: '25%',
                width: '25%'
            })),
            state('featuredImage', style({
                left: '50%',
                width: '25%'
            })),
            state('imageGallery', style({
                left: '75%',
                width: '25%'
            })),
            transition('* => *', [
                animate('300ms ease-in-out')
            ])
        ]),
        // Add shimmer fade-out animation
        trigger('shimmerFadeOut', [
            transition(':leave', [
                animate('300ms ease-out', style({ opacity: 0 }))
            ])
        ])
    ]
})
export class ProductNewComponent implements OnInit {
    breadcrumbs = [
        { label: 'Products', link: '/products/list' },
        { label: 'New Product' },
    ];
    productForm!: FormGroup;
    activeTab: "shortDescription" | "technicalDescription" | "featuredImage" | "imageGallery" = 'shortDescription';
    currentPage: number = 1;
    totalPages: number = 3;
    currentShortDescription = '';
    currentTechnicalDescription = '';
    dataLoaded = true; // Always true for new product form
    isLoading = false;

    constructor(
        private fb: FormBuilder,
        private router: Router,
        private productService: ProductService,
        private notificationService: NotificationService
    ) {
        // Initialize the form in the constructor to ensure it's available before Angular binds form controls
        this.initForm();
    }

    ngOnInit(): void {
        // No need to fetch data for a new product
        this.dataLoaded = true;
    }

    initForm(): void {
        this.productForm = this.fb.group({
            name: [''],
            slug: [''],
            partNo: [''],
            shortDescription: [''],
            unit: [''],
            price: [0],
            weight: [''],
            technicalDescription: [''],
            featuredImage: [null],
            imageGallery: [[]]
        });
    }

    setActiveTab(tab: "shortDescription" | "technicalDescription" | "featuredImage" | "imageGallery"): void {
        this.activeTab = tab;
    }

    goBack(): void {
        this.router.navigate(['/products/list']);
    }

    saveProduct(): void {
        if (this.productForm.valid) {
            this.isLoading = true;

            const productData = this.productForm.value;

            // Create new product
            this.productService.createProduct(productData)
                .pipe(
                    finalize(() => {
                        this.isLoading = false;
                    })
                )
                .subscribe({
                    next: (createdProduct) => {
                        console.log('Product created successfully', createdProduct);
                        // Show success notification
                        this.notificationService.success(`Product "${productData.name}" was created successfully!`);
                        // Navigate back to the product list
                        this.router.navigate(['/products/list']);
                    },
                    error: (err) => {
                        console.error('Error creating product:', err);
                        // Show error notification
                        this.notificationService.error(`Failed to create product "${productData.name}". Please try again.`);
                    }
                });
        } else {
            // Mark all form controls as touched to display validation errors
            this.markFormGroupTouched(this.productForm);
            console.log('Form is invalid, please fix the errors before submitting');
            // Show warning notification for invalid form
            this.notificationService.warning('Please fix the form errors before saving.');
        }
    }

    saveAndContinue(): void {
        if (this.productForm.valid) {
            this.isLoading = true;

            const productData = this.productForm.value;

            // Create new product
            this.productService.createProduct(productData)
                .pipe(
                    finalize(() => {
                        this.isLoading = false;
                    })
                )
                .subscribe({
                    next: (createdProduct) => {
                        console.log('Product created successfully', createdProduct);
                        // Show success notification
                        this.notificationService.success(`Product "${productData.name}" was created successfully!`);
                        // Navigate to the edit page of the newly created product
                        if (createdProduct && createdProduct.id) {
                            this.router.navigate(['/products/edit', createdProduct.id]);
                        }
                    },
                    error: (err) => {
                        console.error('Error creating product:', err);
                        // Show error notification
                        this.notificationService.error(`Failed to create product "${productData.name}". Please try again.`);
                    }
                });
        } else {
            // Mark all form controls as touched to display validation errors
            this.markFormGroupTouched(this.productForm);
            console.log('Form is invalid, please fix the errors before submitting');
            // Show warning notification for invalid form
            this.notificationService.warning('Please fix the form errors before saving.');
        }
    }

    /**
     * Helper method to mark all controls in a form group as touched
     * @param formGroup - The FormGroup to touch all controls in
     */
    private markFormGroupTouched(formGroup: FormGroup): void {
        Object.values(formGroup.controls).forEach(control => {
            control.markAsTouched();

            // If control is a nested form group, recursively mark all nested controls as touched
            if (control instanceof FormGroup) {
                this.markFormGroupTouched(control);
            }
        });
    }

    onShortDescriptionChange(content: string): void {
        this.currentShortDescription = content;
        this.productForm.patchValue({'shortDescription': content});
        console.log('Short Description updated:', content);
    }

    onTechnicalDescriptionChange(content: string): void {
        this.currentTechnicalDescription = content;
        this.productForm.patchValue({'technicalDescription': content});
        console.log('Technical Description updated:', content);
    }

    onImageGalleryChange(mediaItems: MediaItem[]): void {
        // Update the form with the new image gallery
        this.productForm.patchValue({ 'imageGallery': mediaItems });
        console.log('Image Gallery updated:', mediaItems);
    }

    onFeaturedImageChange(featuredImage: MediaItem | null): void {
        // Update the featured image in the form
        this.productForm.patchValue({ 'featuredImage': featuredImage });
        console.log('Featured Image updated:', featuredImage);
    }

    /**
     * Safely gets a value from a form control
     * @param controlName Name of the form control
     * @returns The value of the form control or null if the control doesn't exist
     */
    getFormControlValue(controlName: string): any {
        if (!this.productForm) return null;

        // If we have loaded data but the form control is empty, use the stored descriptions
        if (this.dataLoaded && controlName === 'shortDescription' && !this.productForm.get(controlName)?.value) {
            return this.currentShortDescription;
        }

        if (this.dataLoaded && controlName === 'technicalDescription' && !this.productForm.get(controlName)?.value) {
            return this.currentTechnicalDescription;
        }

        const control = this.productForm.get(controlName);
        return control ? control.value : null;
    }
}
