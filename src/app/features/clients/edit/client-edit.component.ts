import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BreadcrumbsComponent } from "@shared/components/ui/breadcrumbs/breadcrumbs.component";
import { ClientService } from "@services/http/client.service";
import { switchMap, finalize, delay } from "rxjs/operators";
import { of } from "rxjs";
import { ClientDetail } from "@models/client.model";
import {
    trigger,
    state,
    style,
    animate,
    transition
} from '@angular/animations';
import { NotificationService } from "@services/notification.service";

@Component({
    selector: 'app-client-edit',
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        BreadcrumbsComponent
    ],
    templateUrl: './client-edit.component.html',
    styleUrls: ['./client-edit.component.scss'],
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
export class ClientEditComponent implements OnInit {
    breadcrumbs = [
        { label: 'Clients', link: '/clients/list' },
        { label: 'Edit Client' },
    ];
    clientForm!: FormGroup;
    activeTab: "userAccounts" | "installedBase" | "areaManagers" = 'userAccounts';
    dataLoaded = false;
    isLoading = false;

    constructor(
        private fb: FormBuilder,
        private router: Router,
        private clientService: ClientService,
        protected route: ActivatedRoute,
        private notificationService: NotificationService
    ) {
        this.initForm();
    }

    ngOnInit(): void {
        // Fetch client data if ID is available
        this.route.paramMap.pipe(
            switchMap(params => {
                const id = params.get('id');
                if (!id) {
                    return of(null);
                }

                // Set loading to true when fetching data
                this.isLoading = true;

                // Return the client data with a small delay to show the shimmer effect
                return this.clientService.getClient(id).pipe(
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
            next: (data: ClientDetail | null) => {
                if (data) {
                    console.log('client data', data);
                    this.updateFormWithClientData(data);
                    this.dataLoaded = true;
                } else if (!this.route.snapshot.paramMap.get('id')) {
                    // If no ID is provided, we're in create mode, so mark as loaded
                    this.dataLoaded = true;
                }
            },
            error: (err) => {
                console.error('Error fetching client:', err);
                this.isLoading = false;
                this.notificationService.error('Failed to load client data. Please try again later.');
            }
        });
    }

    initForm(): void {
        this.clientForm = this.fb.group({
            name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
            code: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
            description: [''],
            address: ['', [Validators.maxLength(500)]],
            phoneNumber: ['', [Validators.maxLength(50)]],
            email: ['', [Validators.email, Validators.maxLength(180)]],
            vatNumber: ['', [Validators.maxLength(50)]]
        });
    }

    goBack(): void {
        this.router.navigate(['/clients/list']);
    }

    saveClient(): void {
        if (this.clientForm.valid) {
            this.isLoading = true;

            // Get the client ID from the route parameters
            const clientId = this.route.snapshot.paramMap.get('id');
            const clientData = this.clientForm.value;

            // Determine if we're updating an existing client or creating a new one
            if (clientId) {
                // Update existing client
                this.clientService.updateClient(clientId, clientData)
                    .pipe(
                        finalize(() => {
                            this.isLoading = false;
                        })
                    )
                    .subscribe({
                        next: (updatedClient) => {
                            console.log('Client updated successfully', updatedClient);
                            // Show success notification
                            this.notificationService.success(`Client "${clientData.name}" was updated successfully!`);
                            // Navigate back to the client list
                            this.router.navigate(['/clients/list']);
                        },
                        error: (err) => {
                            console.error('Error updating client:', err);
                            // Show error notification
                            const errorMessage = this.clientService.handleError(err);
                            this.notificationService.error(`Failed to update client. ${errorMessage}`);
                        }
                    });
            } else {
                // Create a new client
                this.clientService.createClient(clientData)
                    .pipe(
                        finalize(() => {
                            this.isLoading = false;
                        })
                    )
                    .subscribe({
                        next: (createdClient) => {
                            console.log('Client created successfully', createdClient);
                            // Show success notification
                            this.notificationService.success(`Client "${clientData.name}" was created successfully!`);
                            // Navigate back to the client list
                            this.router.navigate(['/clients/list']);
                        },
                        error: (err) => {
                            console.error('Error creating client:', err);
                            // Show error notification
                            const errorMessage = this.clientService.handleError(err);
                            this.notificationService.error(`Failed to create client. ${errorMessage}`);
                        }
                    });
            }
        } else {
            // Mark all form controls as touched to display validation errors
            this.markFormGroupTouched(this.clientForm);
            console.log('Form is invalid, please fix the errors before submitting');
            // Show warning notification for invalid form
            this.notificationService.warning('Please fix the form errors before saving.');
        }
    }

    saveAndContinue(): void {
        if (this.clientForm.valid) {
            this.isLoading = true;

            // Get the client ID from the route parameters
            const clientId = this.route.snapshot.paramMap.get('id');
            const clientData = this.clientForm.value;

            // Determine if we're updating an existing client or creating a new one
            if (clientId) {
                // Update existing client
                this.clientService.updateClient(clientId, clientData)
                    .pipe(
                        finalize(() => {
                            this.isLoading = false;
                        })
                    )
                    .subscribe({
                        next: (updatedClient) => {
                            console.log('Client updated successfully', updatedClient);
                            // Show success notification
                            this.notificationService.success(`Client "${clientData.name}" was updated successfully!`);
                            // No navigation, stay on the same page
                        },
                        error: (err) => {
                            console.error('Error updating client:', err);
                            // Show error notification
                            const errorMessage = this.clientService.handleError(err);
                            this.notificationService.error(`Failed to update client. ${errorMessage}`);
                        }
                    });
            } else {
                // Create a new client
                this.clientService.createClient(clientData)
                    .pipe(
                        finalize(() => {
                            this.isLoading = false;
                        })
                    )
                    .subscribe({
                        next: (createdClient) => {
                            console.log('Client created successfully', createdClient);
                            // Show success notification
                            this.notificationService.success(`Client "${clientData.name}" was created successfully!`);
                            // Navigate to the edit page of the newly created client
                            if (createdClient && createdClient.id) {
                                this.router.navigate(['/clients/edit', createdClient.id]);
                            }
                        },
                        error: (err) => {
                            console.error('Error creating client:', err);
                            // Show error notification
                            const errorMessage = this.clientService.handleError(err);
                            this.notificationService.error(`Failed to create client. ${errorMessage}`);
                        }
                    });
            }
        } else {
            // Mark all form controls as touched to display validation errors
            this.markFormGroupTouched(this.clientForm);
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

    /**
     * Safely gets a value from a form control
     * @param controlName Name of the form control
     * @returns The value of the form control or null if the control doesn't exist
     */
    getFormControlValue(controlName: string): any {
        if (!this.clientForm) return null;

        const control = this.clientForm.get(controlName);
        return control ? control.value : null;
    }

    /**
     * Check if a form control has errors and has been touched
     * @param controlName Name of the form control
     * @returns true if the control has errors and has been touched
     */
    hasError(controlName: string): boolean {
        const control = this.clientForm.get(controlName);
        return !!(control && control.invalid && (control.dirty || control.touched));
    }

    /**
     * Get error message for a form control
     * @param controlName Name of the form control
     * @returns Error message string
     */
    getErrorMessage(controlName: string): string {
        const control = this.clientForm.get(controlName);
        if (!control || !control.errors) return '';

        const errors = control.errors;

        if (errors['required']) {
            return `${this.getFieldLabel(controlName)} is required`;
        }
        if (errors['email']) {
            return 'Please enter a valid email address';
        }
        if (errors['minlength']) {
            return `${this.getFieldLabel(controlName)} must be at least ${errors['minlength'].requiredLength} characters`;
        }
        if (errors['maxlength']) {
            return `${this.getFieldLabel(controlName)} must not exceed ${errors['maxlength'].requiredLength} characters`;
        }

        return 'Invalid value';
    }

    /**
     * Get field label for error messages
     * @param fieldName Name of the field
     * @returns Human-readable field label
     */
    private getFieldLabel(fieldName: string): string {
        const labels: { [key: string]: string } = {
            name: 'Name',
            code: 'Code',
            description: 'Description',
            address: 'Address',
            phoneNumber: 'Phone Number',
            email: 'Email',
            vatNumber: 'VAT Number'
        };

        return labels[fieldName] || fieldName;
    }

    /**
     * Updates the client form with data received from the API
     * @param clientData The client data from the API
     */
    updateFormWithClientData(clientData: ClientDetail): void {
        // Check if the form exists before trying to use it
        if (!this.clientForm) {
            console.error('Form not initialized');
            return;
        }

        // Update breadcrumbs for edit mode
        this.breadcrumbs = [
            { label: 'Clients', link: '/clients/list' },
            { label: clientData.name },
        ];

        // Map the client data to the form fields
        this.clientForm.patchValue({
            name: clientData.name,
            code: clientData.code,
            description: clientData.description || '',
            address: clientData.address || '',
            phoneNumber: clientData.phoneNumber || '',
            email: clientData.email || '',
            vatNumber: clientData.vatNumber || ''
        });

        console.log('clientForm', this.clientForm);
    }

    setActiveTab(tab: "userAccounts" | "installedBase" | "areaManagers"): void {
        this.activeTab = tab;
    }
}
