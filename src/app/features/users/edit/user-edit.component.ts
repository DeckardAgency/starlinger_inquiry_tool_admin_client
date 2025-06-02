import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BreadcrumbsComponent } from "@shared/components/ui/breadcrumbs/breadcrumbs.component";
import { UserService } from "@services/http/user.service";
import { ClientService } from "@services/http/client.service";
import { switchMap, finalize, delay } from "rxjs/operators";
import { of } from "rxjs";
import { UserDetail, USER_ROLES, getRoleDisplayName } from "@models/auth.model";
import { Client } from "@models/client.model";
import {
    trigger,
    state,
    style,
    animate,
    transition
} from '@angular/animations';
import { NotificationService } from "@services/notification.service";

interface RoleOption {
    value: string;
    label: string;
    description: string;
    icon: string;
}

@Component({
    selector: 'app-user-edit',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        BreadcrumbsComponent
    ],
    templateUrl: './user-edit.component.html',
    styleUrls: ['./user-edit.component.scss'],
    animations: [
        trigger('shimmerFadeOut', [
            transition(':leave', [
                animate('300ms ease-out', style({ opacity: 0 }))
            ])
        ]),
        trigger('modalOverlay', [
            transition(':enter', [
                style({ opacity: 0 }),
                animate('200ms ease-out', style({ opacity: 1 }))
            ]),
            transition(':leave', [
                animate('200ms ease-in', style({ opacity: 0 }))
            ])
        ]),
        trigger('modalContent', [
            transition(':enter', [
                style({
                    opacity: 0,
                    transform: 'scale(0.9) translateY(20px)'
                }),
                animate('300ms cubic-bezier(0.34, 1.56, 0.64, 1)', style({
                    opacity: 1,
                    transform: 'scale(1) translateY(0)'
                }))
            ]),
            transition(':leave', [
                animate('200ms ease-in', style({
                    opacity: 0,
                    transform: 'scale(0.95) translateY(10px)'
                }))
            ])
        ])
    ]
})
export class UserEditComponent implements OnInit {
    breadcrumbs = [
        { label: 'Users', link: '/users/list' },
        { label: 'Edit User' },
    ];

    userForm!: FormGroup;
    dataLoaded = false;
    isLoading = false;
    showPassword = false;
    showRepeatPassword = false;

    // Role options
    roleOptions: RoleOption[] = [
        {
            value: USER_ROLES.USER,
            label: 'Viewer',
            description: 'Can view and monitor data within the application but cannot make any changes.',
            icon: 'eye'
        },
        {
            value: USER_ROLES.SALES,
            label: 'Editor',
            description: 'Has the ability to view and modify data, enabling content creation and updates.',
            icon: 'edit'
        },
        {
            value: USER_ROLES.ADMIN,
            label: 'Admin',
            description: 'Possesses full control over the application, including user management, settings configuration, and access to all features and data.',
            icon: 'shield'
        },
        {
            value: USER_ROLES.MANAGER,
            label: 'Profis',
            description: 'Has access to core application features and relevant data to manage their specific region or area.',
            icon: 'briefcase'
        }
    ];

    // Client selection
    selectedClient: Client | null = null;
    showClientModal = false;
    modalClients: Client[] = [];
    modalClientsLoading = false;
    modalSearchTerm = '';
    modalCurrentPage = 1;
    modalTotalPages = 1;

    // Store the current user data
    currentUserData: UserDetail | null = null;

    constructor(
        private fb: FormBuilder,
        private router: Router,
        private userService: UserService,
        private clientService: ClientService,
        protected route: ActivatedRoute,
        private notificationService: NotificationService
    ) {
        this.initForm();
    }

    ngOnInit(): void {
        // Check for pre-selected client from query params
        const clientId = this.route.snapshot.queryParamMap.get('clientId');
        if (clientId) {
            this.loadClientById(clientId);
        }

        // Fetch user data if ID is available
        this.route.paramMap.pipe(
            switchMap(params => {
                const id = params.get('id');
                if (!id) {
                    return of(null);
                }

                // Set loading to true when fetching data
                this.isLoading = true;

                // Return the user data with a small delay to show the shimmer effect
                return this.userService.getUser(id).pipe(
                    delay(300),
                    finalize(() => {
                        // Set loading to false when done, regardless of success or error
                        this.isLoading = false;
                    })
                );
            })
        ).subscribe({
            next: (data: UserDetail | null) => {
                if (data) {
                    console.log('user data', data);
                    this.currentUserData = data;
                    this.updateFormWithUserData(data);
                    this.dataLoaded = true;
                } else if (!this.route.snapshot.paramMap.get('id')) {
                    // If no ID is provided, we're in create mode, so mark as loaded
                    this.dataLoaded = true;
                }
            },
            error: (err) => {
                console.error('Error fetching user:', err);
                this.isLoading = false;
                this.notificationService.error('Failed to load user data. Please try again later.');
            }
        });
    }

    initForm(): void {
        this.userForm = this.fb.group({
            firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
            lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
            email: ['', [Validators.required, Validators.email, Validators.maxLength(180)]],
            plainPassword: ['', [Validators.minLength(6)]],
            repeatPassword: [''],
            phoneNumber: ['', [Validators.maxLength(50)]],
            address: ['', [Validators.maxLength(500)]],
            roles: [[USER_ROLES.USER]],
            client: [null]
        }, { validators: this.passwordMatchValidator });

        // Add required validator for password when creating new user
        if (!this.route.snapshot.paramMap.get('id')) {
            this.userForm.get('plainPassword')?.setValidators([
                Validators.required,
                Validators.minLength(6)
            ]);
        }
    }

    /**
     * Custom validator to check if passwords match
     */
    passwordMatchValidator(group: FormGroup): {[key: string]: boolean} | null {
        const password = group.get('plainPassword')?.value;
        const repeatPassword = group.get('repeatPassword')?.value;

        if (password && repeatPassword && password !== repeatPassword) {
            return { 'passwordMismatch': true };
        }

        return null;
    }

    /**
     * Load client by ID (for pre-selection)
     */
    loadClientById(clientId: string): void {
        this.clientService.getClient(clientId).subscribe({
            next: (client) => {
                this.selectedClient = client;
                this.userForm.patchValue({ client: `/api/v1/clients/${client.id}` });
            },
            error: (err) => {
                console.error('Error loading client:', err);
            }
        });
    }

    goBack(): void {
        this.router.navigate(['/users/list']);
    }

    saveUser(): void {
        if (this.userForm.valid) {
            this.isLoading = true;

            // Get the user ID from the route parameters
            const userId = this.route.snapshot.paramMap.get('id');
            const userData = this.prepareUserData();

            // Determine if we're updating an existing user or creating a new one
            if (userId) {
                // Update existing user
                this.userService.updateUser(userId, userData)
                    .pipe(
                        finalize(() => {
                            this.isLoading = false;
                        })
                    )
                    .subscribe({
                        next: (updatedUser) => {
                            console.log('User updated successfully', updatedUser);
                            this.notificationService.success(`User "${userData.firstName} ${userData.lastName}" was updated successfully!`);
                            this.router.navigate(['/users/list']);
                        },
                        error: (err) => {
                            console.error('Error updating user:', err);
                            const errorMessage = this.userService.handleError(err);
                            this.notificationService.error(`Failed to update user. ${errorMessage}`);
                        }
                    });
            } else {
                // Create a new user
                this.userService.createUser(userData)
                    .pipe(
                        finalize(() => {
                            this.isLoading = false;
                        })
                    )
                    .subscribe({
                        next: (createdUser) => {
                            console.log('User created successfully', createdUser);
                            this.notificationService.success(`User "${userData.firstName} ${userData.lastName}" was created successfully!`);
                            this.router.navigate(['/users/list']);
                        },
                        error: (err) => {
                            console.error('Error creating user:', err);
                            const errorMessage = this.userService.handleError(err);
                            this.notificationService.error(`Failed to create user. ${errorMessage}`);
                        }
                    });
            }
        } else {
            this.markFormGroupTouched(this.userForm);
            console.log('Form is invalid, please fix the errors before submitting');
            this.notificationService.warning('Please fix the form errors before saving.');
        }
    }

    saveAndContinue(): void {
        if (this.userForm.valid) {
            this.isLoading = true;

            const userId = this.route.snapshot.paramMap.get('id');
            const userData = this.prepareUserData();

            if (userId) {
                // Update existing user
                this.userService.updateUser(userId, userData)
                    .pipe(
                        finalize(() => {
                            this.isLoading = false;
                        })
                    )
                    .subscribe({
                        next: (updatedUser) => {
                            console.log('User updated successfully', updatedUser);
                            this.notificationService.success(`User "${userData.firstName} ${userData.lastName}" was updated successfully!`);
                            // Stay on the same page
                        },
                        error: (err) => {
                            console.error('Error updating user:', err);
                            const errorMessage = this.userService.handleError(err);
                            this.notificationService.error(`Failed to update user. ${errorMessage}`);
                        }
                    });
            } else {
                // Create a new user
                this.userService.createUser(userData)
                    .pipe(
                        finalize(() => {
                            this.isLoading = false;
                        })
                    )
                    .subscribe({
                        next: (createdUser) => {
                            console.log('User created successfully', createdUser);
                            this.notificationService.success(`User "${userData.firstName} ${userData.lastName}" was created successfully!`);
                            // Navigate to the edit page of the newly created user
                            if (createdUser && createdUser.id) {
                                this.router.navigate(['/users/edit', createdUser.id]);
                            }
                        },
                        error: (err) => {
                            console.error('Error creating user:', err);
                            const errorMessage = this.userService.handleError(err);
                            this.notificationService.error(`Failed to create user. ${errorMessage}`);
                        }
                    });
            }
        } else {
            this.markFormGroupTouched(this.userForm);
            console.log('Form is invalid, please fix the errors before submitting');
            this.notificationService.warning('Please fix the form errors before saving.');
        }
    }

    /**
     * Prepare user data for API submission
     */
    private prepareUserData(): any {
        const formValue = this.userForm.value;

        const userData: any = {
            firstName: formValue.firstName,
            lastName: formValue.lastName,
            email: formValue.email,
            phoneNumber: formValue.phoneNumber,
            address: formValue.address,
            roles: formValue.roles,
            client: formValue.client
        };

        // Only include password if it's been set
        if (formValue.plainPassword) {
            userData.plainPassword = formValue.plainPassword;
        }

        return userData;
    }

    /**
     * Updates the user form with data received from the API
     */
    updateFormWithUserData(userData: UserDetail): void {
        if (!this.userForm) {
            console.error('Form not initialized');
            return;
        }

        // Update breadcrumbs for edit mode
        this.breadcrumbs = [
            { label: 'Users', link: '/users/list' },
            { label: `${userData.firstName} ${userData.lastName}` },
        ];

        // Map the user data to the form fields
        this.userForm.patchValue({
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            phoneNumber: userData.phoneNumber || '',
            address: userData.address || '',
            roles: userData.roles || [USER_ROLES.USER]
        });

        // Set client if available
        if (userData.client) {
            this.selectedClient = {
                id: userData.client.id,
                '@id': userData.client['@id'],
                '@type': userData.client['@type'],
                name: userData.client.name,
                code: userData.client.code,
                createdAt: '',
                updatedAt: ''
            };
            this.userForm.patchValue({ client: `/api/v1/clients/${userData.client.id}` });
        }

        console.log('userForm', this.userForm);
    }

    /**
     * Toggle password visibility
     */
    togglePasswordVisibility(): void {
        this.showPassword = !this.showPassword;
    }

    /**
     * Toggle repeat password visibility
     */
    toggleRepeatPasswordVisibility(): void {
        this.showRepeatPassword = !this.showRepeatPassword;
    }

    /**
     * Select a role
     */
    selectRole(role: string): void {
        const currentRoles = this.userForm.get('roles')?.value || [];

        // If selecting USER role, just set it as the only role
        if (role === USER_ROLES.USER) {
            this.userForm.patchValue({ roles: [USER_ROLES.USER] });
            return;
        }

        // For other roles, always include USER role as the base
        this.userForm.patchValue({ roles: [USER_ROLES.USER, role] });
    }

    /**
     * Check if a role is selected
     */
    isRoleSelected(role: string): boolean {
        const roles = this.userForm.get('roles')?.value || [];
        return roles.includes(role);
    }

    /**
     * Open client selection modal
     */
    openClientModal(): void {
        this.showClientModal = true;
        this.loadModalClients();
    }

    /**
     * Load clients for the selection modal
     */
    loadModalClients(page: number = 1): void {
        this.modalClientsLoading = true;
        this.modalCurrentPage = page;

        const searchParams: Record<string, string> = {};

        if (this.modalSearchTerm) {
            searchParams['name'] = this.modalSearchTerm;
        }

        this.clientService.getClients(page, 'name', 'asc', searchParams).pipe(
            finalize(() => {
                this.modalClientsLoading = false;
            })
        ).subscribe({
            next: (response) => {
                this.modalClients = response.clients;
                this.modalTotalPages = response.totalPages;
            },
            error: (err) => {
                console.error('Error loading clients:', err);
                this.notificationService.error('Failed to load clients.');
            }
        });
    }

    /**
     * Search clients in the modal
     */
    searchModalClients(): void {
        this.loadModalClients(1);
    }

    /**
     * Select a client from the modal
     */
    selectClientFromModal(client: Client): void {
        this.selectedClient = client;
        this.userForm.patchValue({ client: `/api/v1/clients/${client.id}` });
        this.closeClientModal();
        this.notificationService.success(`Client "${client.name}" selected.`);
    }

    /**
     * Remove selected client
     */
    removeClient(): void {
        this.selectedClient = null;
        this.userForm.patchValue({ client: null });
    }

    /**
     * Close client selection modal
     */
    closeClientModal(): void {
        this.showClientModal = false;
        this.modalSearchTerm = '';
    }

    /**
     * Navigate to next page in modal
     */
    nextModalPage(): void {
        if (this.modalCurrentPage < this.modalTotalPages) {
            this.loadModalClients(this.modalCurrentPage + 1);
        }
    }

    /**
     * Navigate to previous page in modal
     */
    previousModalPage(): void {
        if (this.modalCurrentPage > 1) {
            this.loadModalClients(this.modalCurrentPage - 1);
        }
    }

    /**
     * Helper method to mark all controls in a form group as touched
     */
    private markFormGroupTouched(formGroup: FormGroup): void {
        Object.values(formGroup.controls).forEach(control => {
            control.markAsTouched();

            if (control instanceof FormGroup) {
                this.markFormGroupTouched(control);
            }
        });
    }

    /**
     * Check if a form control has errors and has been touched
     */
    hasError(controlName: string): boolean {
        const control = this.userForm.get(controlName);
        return !!(control && control.invalid && (control.dirty || control.touched));
    }

    /**
     * Check if the form has password mismatch error
     */
    hasPasswordMismatchError(): boolean {
        return !!(this.userForm.errors?.['passwordMismatch'] &&
            this.userForm.get('repeatPassword')?.touched);
    }

    /**
     * Get error message for a form control
     */
    getErrorMessage(controlName: string): string {
        const control = this.userForm.get(controlName);
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
     */
    private getFieldLabel(fieldName: string): string {
        const labels: { [key: string]: string } = {
            firstName: 'First name',
            lastName: 'Last name',
            email: 'Email',
            plainPassword: 'Password',
            repeatPassword: 'Repeat password',
            phoneNumber: 'Phone number',
            address: 'Address'
        };

        return labels[fieldName] || fieldName;
    }

    /**
     * Get computed username
     */
    get computedUsername(): string {
        const firstName = this.userForm.get('firstName')?.value || '';
        const lastName = this.userForm.get('lastName')?.value || '';

        if (firstName && lastName) {
            return `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
        }

        return '';
    }
}
