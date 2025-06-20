import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BreadcrumbsComponent } from "@shared/components/ui/breadcrumbs/breadcrumbs.component";
import { MachineService } from "@services/http/machine.service";
import { switchMap, finalize, delay } from "rxjs/operators";
import { of } from "rxjs";
import { Machine } from "@models/machine.model";
import { MediaItem } from '@models/media.model';
import {
    trigger,
    state,
    style,
    animate,
    transition
} from '@angular/animations';
import { NotificationService } from "@services/notification.service";
import {
    ProductFeaturedImageComponent
} from "@shared/components/product-featured-image/product-featured-image.component";
import {ProductImageGalleryComponent} from "@shared/components/product-image-gallery/product-image-gallery.component";

@Component({
    selector: 'app-machines-edit',
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        BreadcrumbsComponent,
        ProductFeaturedImageComponent,
        ProductImageGalleryComponent,
    ],
    templateUrl: './machines-edit.component.html',
    styleUrls: ['./machines-edit.component.scss'],
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
            state('basicInfo', style({
                left: '0%',
                width: '25%'
            })),
            state('warrantyInfo', style({
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
export class MachinesEditComponent implements OnInit {
    breadcrumbs = [
        { label: 'Machines', link: '/machines/list' },
        { label: 'Edit Machine' },
    ];
    machineForm!: FormGroup;
    activeTab: "featuredImage" | "imageGallery" = 'featuredImage';
    currentPage: number = 1;
    totalPages: number = 3;
    dataLoaded = false;
    isLoading = false;

    constructor(
        private fb: FormBuilder,
        private router: Router,
        private machineService: MachineService,
        protected route: ActivatedRoute,
        private notificationService: NotificationService
    ) {
        this.initForm();
    }

    ngOnInit(): void {
        // Fetch machine data if ID is available
        this.route.paramMap.pipe(
            switchMap(params => {
                const id = params.get('id');
                if (!id) {
                    return of(null);
                }

                // Set loading to true when fetching data
                this.isLoading = true;

                // Return the machine data with a small delay to show the shimmer effect
                return this.machineService.getMachine(id).pipe(
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
            next: (data: Machine | null) => {
                if (data) {
                    console.log('machine data', data);
                    this.updateFormWithMachineData(data);
                    this.dataLoaded = true;
                } else if (!this.route.snapshot.paramMap.get('id')) {
                    // If no ID is provided, we're in create mode, so mark as loaded
                    this.dataLoaded = true;
                }
            },
            error: (err) => {
                console.error('Error fetching machine:', err);
                this.isLoading = false;
                this.notificationService.error('Failed to load machine data. Please try again later.');
            }
        });
    }

    initForm(): void {
        this.machineForm = this.fb.group({
            // Basic machine info
            ibStationNumber: ['', Validators.required],
            ibSerialNumber: ['', Validators.required],
            articleNumber: [''],
            articleDescription: [''],
            orderNumber: [''],
            deliveryDate: [''],

            // KMS & MC info
            kmsIdentificationNumber: [''],
            kmsIdNumber: [''],
            mcNumber: [''],

            // FI info
            fiStationNumber: [''],
            fiSerialNumber: [''],

            // Warranty info
            mainWarrantyEnd: [''],
            extendedWarrantyEnd: [''],

            // Media
            featuredImage: [null],
            imageGallery: [[]]
        });
    }

    setActiveTab(tab: "featuredImage" | "imageGallery"): void {
        this.activeTab = tab;
    }

    goBack(): void {
        this.router.navigate(['/machines/list']);
    }

    saveMachine(): void {
        if (this.machineForm.valid) {
            this.isLoading = true;

            // Get the machine ID from the route parameters
            const machineId = this.route.snapshot.paramMap.get('id');
            const machineData = this.machineForm.value;

            // Determine if we're updating an existing machine or creating a new one
            if (machineId) {
                // Update an existing machine
                this.machineService.updateMachine(machineId, machineData)
                    .pipe(
                        finalize(() => {
                            this.isLoading = false;
                        })
                    )
                    .subscribe({
                        next: (updatedMachine) => {
                            console.log('Machine updated successfully', updatedMachine);
                            // Show success notification
                            this.notificationService.success(`Machine "${machineData.articleDescription}" was updated successfully!`);
                            // Navigate back to the machine list
                            this.router.navigate(['/machines/list']);
                        },
                        error: (err) => {
                            console.error('Error updating machine:', err);
                            // Show error notification
                            this.notificationService.error(`Failed to update machine. Please try again.`);
                        }
                    });
            } else {
                // Create a new machine
                this.machineService.createMachine(machineData)
                    .pipe(
                        finalize(() => {
                            this.isLoading = false;
                        })
                    )
                    .subscribe({
                        next: (createdMachine) => {
                            console.log('Machine created successfully', createdMachine);
                            // Show success notification
                            this.notificationService.success(`Machine "${machineData.articleDescription}" was created successfully!`);
                            // Navigate back to the machine list
                            this.router.navigate(['/machines/list']);
                        },
                        error: (err) => {
                            console.error('Error creating machine:', err);
                            // Show error notification
                            this.notificationService.error(`Failed to create machine. Please try again.`);
                        }
                    });
            }
        } else {
            // Mark all form controls as touched to display validation errors
            this.markFormGroupTouched(this.machineForm);
            console.log('Form is invalid, please fix the errors before submitting');
            // Show warning notification for invalid form
            this.notificationService.warning('Please fix the form errors before saving.');
        }
    }

    saveAndContinue(): void {
        if (this.machineForm.valid) {
            this.isLoading = true;

            // Get the machine ID from the route parameters
            const machineId = this.route.snapshot.paramMap.get('id');
            const machineData = this.machineForm.value;

            // Determine if we're updating an existing machine or creating a new one
            if (machineId) {
                // Update an existing machine
                this.machineService.updateMachine(machineId, machineData)
                    .pipe(
                        finalize(() => {
                            this.isLoading = false;
                        })
                    )
                    .subscribe({
                        next: (updatedMachine) => {
                            console.log('Machine updated successfully', updatedMachine);
                            // Show success notification
                            this.notificationService.success(`Machine "${machineData.articleDescription}" was updated successfully!`);
                            // No navigation, stay on the same page
                        },
                        error: (err) => {
                            console.error('Error updating machine:', err);
                            // Show error notification
                            this.notificationService.error(`Failed to update machine. Please try again.`);
                        }
                    });
            } else {
                // Create a new machine
                this.machineService.createMachine(machineData)
                    .pipe(
                        finalize(() => {
                            this.isLoading = false;
                        })
                    )
                    .subscribe({
                        next: (createdMachine) => {
                            console.log('Machine created successfully', createdMachine);
                            // Show success notification
                            this.notificationService.success(`Machine "${machineData.articleDescription}" was created successfully!`);
                            // Navigate to the edit page of the newly created machine
                            if (createdMachine && createdMachine.id) {
                                this.router.navigate(['/machines/edit', createdMachine.id]);
                            }
                        },
                        error: (err) => {
                            console.error('Error creating machine:', err);
                            // Show error notification
                            this.notificationService.error(`Failed to create machine. Please try again.`);
                        }
                    });
            }
        } else {
            // Mark all form controls as touched to display validation errors
            this.markFormGroupTouched(this.machineForm);
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

    onImageGalleryChange(mediaItems: MediaItem[]): void {
        // Update the form with the new image gallery
        this.machineForm.patchValue({ 'imageGallery': mediaItems });
        console.log('Image Gallery updated:', mediaItems);
    }

    onFeaturedImageChange(featuredImage: MediaItem | null): void {
        // Update the featured image in the form
        this.machineForm.patchValue({ 'featuredImage': featuredImage });
        console.log('Featured Image updated:', featuredImage);
    }

    /**
     * Safely gets a value from a form control
     * @param controlName Name of the form control
     * @returns The value of the form control or null if the control doesn't exist
     */
    getFormControlValue(controlName: string): any {
        if (!this.machineForm) return null;

        const control = this.machineForm.get(controlName);
        return control ? control.value : null;
    }

    /**
     * Updates the machine form with data received from the API
     * @param machineData The machine data from the API
     */
    updateFormWithMachineData(machineData: Machine): void {
        // Check if the form exists before trying to use it
        if (!this.machineForm) {
            console.error('Form not initialized');
            return;
        }

        // Update breadcrumbs for edit mode
        this.breadcrumbs = [
            { label: 'Machines', link: '/machines/list' },
            { label: machineData.articleDescription || 'Edit Machine' },
        ];

        // Map the machine data to the form fields
        this.machineForm.patchValue({
            ibStationNumber: machineData.ibStationNumber,
            ibSerialNumber: machineData.ibSerialNumber,
            articleNumber: machineData.articleNumber,
            articleDescription: machineData.articleDescription,
            orderNumber: machineData.orderNumber,
            deliveryDate: machineData.deliveryDate,
            kmsIdentificationNumber: machineData.kmsIdentificationNumber,
            kmsIdNumber: machineData.kmsIdNumber,
            mcNumber: machineData.mcNumber,
            fiStationNumber: machineData.fiStationNumber,
            fiSerialNumber: machineData.fiSerialNumber,
            mainWarrantyEnd: machineData.mainWarrantyEnd,
            extendedWarrantyEnd: machineData.extendedWarrantyEnd,
            // Handle the MediaItem objects appropriately
            featuredImage: machineData.featuredImage,
            // For the image gallery, we set it directly to the array of media items
            imageGallery: machineData.imageGallery || []
        });

        console.log('machineForm', this.machineForm);
    }
}
