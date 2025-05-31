import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BreadcrumbsComponent } from "@shared/components/ui/breadcrumbs/breadcrumbs.component";
import { ProductImageGalleryComponent } from "@shared/components/product-image-gallery/product-image-gallery.component";
import { TextEditorComponent } from "@shared/components/text-editor/text-editor.component";
import { ProductService } from "@services/http/product.service";
import { switchMap, finalize, delay } from "rxjs/operators";
import { of } from "rxjs";
import { Product } from "@models/product.model";
import { MediaItem } from "@models/media.model";
import { ProductFeaturedImageComponent } from "@shared/components/product-featured-image/product-featured-image.component";
import {
    trigger,
    state,
    style,
    animate,
    transition
} from '@angular/animations';
import {NotificationService} from "@services/notification.service";
import {SelectComponent} from "@shared/components/select/select.component";
import {ProductDocumentComponent} from "@shared/components/product-document/product-document.component";

interface Country {
    id: number;
    name: string;
    code: string;
}

@Component({
    selector: 'app-product-edit',
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        BreadcrumbsComponent,
        ProductImageGalleryComponent,
        ProductFeaturedImageComponent,
        TextEditorComponent,
        SelectComponent,
        ProductDocumentComponent
    ],
    templateUrl: './product-edit.component.html',
    styleUrls: ['./product-edit.component.scss'],
    animations: [
        trigger('tabAnimation', [
            // Fade in and translate up slightly
            transition(':enter', [
                style({ opacity: 0, transform: 'translateY(10px)' }),
                animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
            ]),
            // Fade out and translate down slightly
            transition(':leave', [
                style({ opacity: 1, transform: 'translateY(0)' }),
                animate('200ms ease-in', style({ opacity: 0, transform: 'translateY(10px)' }))
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
export class ProductEditComponent implements OnInit {
    breadcrumbs = [
        { label: 'Products', link: '/products/list' },
        { label: 'Edit Product' },
    ];
    productForm!: FormGroup;
    activeTab: "shortDescription" | "technicalDescription" | "featuredImage" | "imageGallery" | "productDocuments" = 'shortDescription';
    currentPage: number = 1;
    totalPages: number = 3;
    currentShortDescription = '';
    currentTechnicalDescription = '';
    dataLoaded = false;
    isLoading = false; // Added loading state flag

    //
    selectForm!: FormGroup;
    submitted = false;
    formValues: any;

    // Sample data
    colors: string[] = [
        'Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange'
    ];

    countries: Country[] = [
        { id: 1, name: 'United States', code: 'US' },
        { id: 2, name: 'United Kingdom', code: 'UK' },
        { id: 3, name: 'Canada', code: 'CA' },
        { id: 4, name: 'Australia', code: 'AU' },
        { id: 5, name: 'Germany', code: 'DE' },
        { id: 6, name: 'France', code: 'FR' },
        { id: 7, name: 'Japan', code: 'JP' },
        { id: 8, name: 'Brazil', code: 'BR' },
        { id: 9, name: 'India', code: 'IN' },
        { id: 10, name: 'China', code: 'CN' }
    ];

    programmingLanguages: string[] = [
        'JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'Ruby', 'Go', 'Rust', 'PHP', 'Swift'
    ];

    skills: string[] = [
        'Angular', 'React', 'Vue.js', 'Node.js', 'Express', 'MongoDB', 'PostgreSQL',
        'GraphQL', 'REST API', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP',
        'CI/CD', 'Testing', 'Redux', 'RxJS', 'SCSS', 'Tailwind CSS'
    ];

    roles: string[] = [
        'Developer', 'Designer', 'Product Manager', 'QA Engineer', 'DevOps Engineer'
    ];

    disabledOptions: string[] = [
        'Option 1', 'Option 2', 'Option 3'
    ];

    constructor(
        private fb: FormBuilder,
        private router: Router,
        private productService: ProductService,
        protected route: ActivatedRoute,
        private notificationService: NotificationService
    ) {
        // Initialize the form in the constructor to ensure it's available before Angular binds form controls
        this.initForm();
    }

    ngOnInit(): void {
        // Fetch product data if ID is available
        this.route.paramMap.pipe(
            switchMap(params => {
                const id = params.get('id');
                if (!id) {
                    return of(null);
                }

                // Set loading to true when fetching data
                this.isLoading = true;

                // Return the product data with a small delay to show the shimmer effect
                return this.productService.getProduct(id).pipe(
                    // Simulate network latency for better shimmer display in dev environment
                    // Remove delay() in production
                    delay(300),
                    finalize(() => {
                        // Set loading to false when done, regardless of success or error
                        this.isLoading = false;
                    })
                );
            })
        ).subscribe({
            next: (data: Product | null) => {
                if (data) {
                    console.log('product data', data);
                    this.updateFormWithProductData(data);
                    this.dataLoaded = true;
                } else if (!this.route.snapshot.paramMap.get('id')) {
                    // If no ID is provided, we're in create mode, so mark as loaded
                    this.dataLoaded = true;
                }
            },
            error: (err) => {
                console.error('Error fetching product:', err);
                this.isLoading = false;
                this.notificationService.error('Failed to load product data. Please try again later.');
            }
        });

        //
        this.selectForm = this.fb.group({
            color: [null],
            country: [null],
            searchableCountry: [null],
            languages: [[]],
            skills: [[]],
            role: [null, Validators.required],
            disabledOption: [{value: null, disabled: true}]
        });
    }

    initForm(): void {
        this.productForm = this.fb.group({
            name: [''],
            slug: [''],
            partNo: [''],
            shortDescription: [''],
            unit: [''],
            price: [''],
            weight: [''],
            technicalDescription: [''],
            featuredImage: [null],
            imageGallery: [[]] // Initialize as an empty array for media items
        });
    }

    setActiveTab(tab: "shortDescription" | "technicalDescription" | "featuredImage" | "imageGallery" | "productDocuments"): void {
        this.activeTab = tab;
    }

    goBack(): void {
        this.router.navigate(['/products/list']);
    }

    saveProduct(): void {
        if (this.productForm.valid) {
            this.isLoading = true;

            // Get the product ID from the route parameters
            const productId = this.route.snapshot.paramMap.get('id');
            const productData = this.productForm.value;

            // Determine if we're updating an existing product or creating a new one
            if (productId) {
                // Update existing product
                this.productService.updateProduct(productId, productData)
                    .pipe(
                        finalize(() => {
                            this.isLoading = false;
                        })
                    )
                    .subscribe({
                        next: (updatedProduct) => {
                            console.log('Product updated successfully', updatedProduct);
                            // Show success notification
                            this.notificationService.success(`Product "${productData.name}" was updated successfully!`);
                            // Navigate back to the product list
                            this.router.navigate(['/products/list']);
                        },
                        error: (err) => {
                            console.error('Error updating product:', err);
                            // Show error notification
                            this.notificationService.error(`Failed to update product "${productData.name}". Please try again.`);
                        }
                    });
            } else {
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
            }
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

            // Get the product ID from the route parameters
            const productId = this.route.snapshot.paramMap.get('id');
            const productData = this.productForm.value;

            // Determine if we're updating an existing product or creating a new one
            if (productId) {
                // Update existing product
                this.productService.updateProduct(productId, productData)
                    .pipe(
                        finalize(() => {
                            this.isLoading = false;
                        })
                    )
                    .subscribe({
                        next: (updatedProduct) => {
                            console.log('Product updated successfully', updatedProduct);
                            // Show success notification
                            this.notificationService.success(`Product "${productData.name}" was updated successfully!`);
                            // No navigation, stay on the same page
                        },
                        error: (err) => {
                            console.error('Error updating product:', err);
                            // Show error notification
                            this.notificationService.error(`Failed to update product "${productData.name}". Please try again.`);
                        }
                    });
            } else {
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
            }
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

    /**
     * Updates the product form with data received from the API
     * @param productData The product data from the API
     */
    updateFormWithProductData(productData: Product): void {
        // Check if the form exists before trying to use it
        if (!this.productForm) {
            console.error('Form not initialized');
            return;
        }

        // Update breadcrumbs for edit mode
        this.breadcrumbs = [
            { label: 'Products', link: '/products/list' },
            { label: productData.name },
        ];

        // Map the product data to the form fields
        this.productForm.patchValue({
            name: productData.name,
            slug: productData.slug,
            partNo: productData.partNo,
            shortDescription: productData.shortDescription,
            unit: productData.unit,
            price: productData.price,
            weight: productData.weight,
            technicalDescription: productData.technicalDescription,
            // Handle the MediaItem objects appropriately
            featuredImage: productData.featuredImage,
            // For the image gallery, we set it directly to the array of media items
            imageGallery: productData.imageGallery || []
        });

        // Update the description content for text editors
        this.currentShortDescription = productData.shortDescription;
        this.currentTechnicalDescription = productData.technicalDescription;

        console.log('productForm', this.productForm);
    }

    onSelectionChange($event: any) {
        console.log('Selection changed', $event);
    }

    onSubmit() {
        if (this.selectForm.valid) {
            this.submitted = true;
            this.formValues = this.selectForm.value;
            console.log('Form submitted:', this.selectForm.value);
        } else {
            this.selectForm.markAllAsTouched();
        }
    }
}
