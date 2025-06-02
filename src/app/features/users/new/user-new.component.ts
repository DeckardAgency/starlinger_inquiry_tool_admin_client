import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { BreadcrumbsComponent } from "@shared/components/ui/breadcrumbs/breadcrumbs.component";
import { UserService } from "@services/http/user.service";
import { ClientService } from "@services/http/client.service";
import { finalize } from "rxjs/operators";
import { USER_ROLES } from "@models/auth.model";
import { Client } from "@models/client.model";
import {
    trigger,
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
    selector: 'app-user-new',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        BreadcrumbsComponent
    ],
    templateUrl: './user-new.component.html',
    styleUrls: ['./user-new.component.scss'],
    animations: [
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
export class UserNewComponent implements OnInit {
    breadcrumbs = [
        { label: 'Users', link: '/users/list' },
        { label: 'New User' },
    ];

    userForm!: FormGroup;
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

    constructor(
        private fb: FormBuilder,
        private router: Router,
        private userService: UserService,
        private clientService: ClientService,
        private notificationService: NotificationService
    ) {
        this.initForm();
    }

    ngOnInit(): void {
        // Check for pre-selected client from query params
        const clientId = new URLSearchParams(window.location.search).get('clientId');
        if (clientId) {
            this.loadClientById(clientId);
        }
    }

    initForm(): void {
        this.userForm = this.fb.group({
            firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
            lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
            email: ['', [Validators.required, Validators.email, Validators.maxLength(180)]],
            plainPassword: ['', [Validators.required, Validators.minLength(6)]],
            repeatPassword: ['', Validators.required],
            phoneNumber: ['', [Validators.maxLength(50)]],
            address: ['', [Validators.maxLength(500)]],
            roles: [['ROLE_USER']], // Default to USER role with full string
            client: [null]
        }, { validators: this.passwordMatchValidator });
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
                this.notificationService.error('Failed to load pre-selected client.');
            }
        });
    }

    goBack(): void {
        this.router.navigate(['/users/list']);
    }

    saveUser(): void {
        console.log(this.prepareUserData());
        // if (this.userForm.valid) {
        //     this.isLoading = true;
        //     const userData = this.prepareUserData();
        //
        //     this.userService.createUser(userData)
        //         .pipe(
        //             finalize(() => {
        //                 this.isLoading = false;
        //             })
        //         )
        //         .subscribe({
        //             next: (createdUser) => {
        //                 console.log('User created successfully', createdUser);
        //                 this.notificationService.success(`User "${userData.firstName} ${userData.lastName}" was created successfully!`);
        //                 this.router.navigate(['/users/list']);
        //             },
        //             error: (err) => {
        //                 console.error('Error creating user:', err);
        //                 const errorMessage = this.userService.handleError(err);
        //                 this.notificationService.error(`Failed to create user. ${errorMessage}`);
        //             }
        //         });
        // } else {
        //     this.markFormGroupTouched(this.userForm);
        //     this.notificationService.warning('Please fix the form errors before saving.');
        // }
    }

    saveAndContinue(): void {
        if (this.userForm.valid) {
            this.isLoading = true;
            const userData = this.prepareUserData();

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
                            this.router.navigate(['/users/', createdUser.id, 'edit']);
                        }
                    },
                    error: (err) => {
                        console.error('Error creating user:', err);
                        const errorMessage = this.userService.handleError(err);
                        this.notificationService.error(`Failed to create user. ${errorMessage}`);
                    }
                });
        } else {
            this.markFormGroupTouched(this.userForm);
            this.notificationService.warning('Please fix the form errors before saving.');
        }
    }

    /**
     * Prepare user data for API submission
     */
    private prepareUserData(): any {
        const formValue = this.userForm.value;

        return {
            firstName: formValue.firstName,
            lastName: formValue.lastName,
            email: formValue.email,
            plainPassword: formValue.plainPassword,
            phoneNumber: formValue.phoneNumber || null,
            address: formValue.address || null,
            roles: formValue.roles,
            client: formValue.client
        };
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

        // USER role is selected if it's the only role
        if (role === USER_ROLES.USER) {
            return roles.length === 1 && roles.includes(USER_ROLES.USER);
        }

        // Other roles are selected if they're in the array (along with USER)
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
