import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BreadcrumbsComponent } from "@shared/components/ui/breadcrumbs/breadcrumbs.component";
import { ClientService } from "@services/http/client.service";
import { UserService } from "@services/http/user.service";
import { switchMap, finalize, delay } from "rxjs/operators";
import { of, Observable, forkJoin } from "rxjs";
import { ClientDetail, ClientUser, CreateClientDto, UpdateClientDto } from "@models/client.model";
import { User } from "@models/auth.model";
import {
    trigger,
    state,
    style,
    animate,
    transition
} from '@angular/animations';
import { NotificationService } from "@services/notification.service";
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

@Component({
    selector: 'app-client-edit',
    standalone: true,
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
        ]),
        // Modal animations
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
export class ClientEditComponent implements OnInit {
    breadcrumbs = [
        { label: 'Clients', link: '/clients/list' },
        { label: 'Edit Client' },
    ];
    clientForm!: FormGroup;
    activeTab: "userAccounts" | "installedBase" | "areaManagers" = 'userAccounts';
    dataLoaded = false;
    isLoading = false;

    // User table data
    clientUsers: User[] = [];
    usersLoading = false;
    usersLoaded = false;
    selectedUsers: Set<string> = new Set();
    allUsersSelected = false;

    // User selection modal
    showUserModal = false;
    modalUsers: User[] = [];
    modalUsersLoading = false;
    modalSearchTerm = '';
    modalCurrentPage = 1;
    modalTotalPages = 1;

    // Store the current client data
    currentClientData: ClientDetail | null = null;

    constructor(
        private fb: FormBuilder,
        private router: Router,
        private clientService: ClientService,
        private userService: UserService,
        protected route: ActivatedRoute,
        private notificationService: NotificationService,
        private http: HttpClient
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
                    this.currentClientData = data;
                    this.updateFormWithClientData(data);
                    this.dataLoaded = true;

                    // Load users if we have user references
                    if (data.users && data.users.length > 0) {
                        // Check if users are strings (IRIs) or objects
                        if (typeof data.users[0] === 'string') {
                            // Users are IRIs, fetch full details
                            this.loadUsersFromIris(data.users as any as string[]);
                        } else {
                            // Users are ClientUser objects
                            this.loadClientUsers(data.users);
                        }
                    }
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

    /**
     * Load users from IRI strings
     */
    loadUsersFromIris(userIris: string[]): void {
        this.usersLoading = true;

        // Create observables for each user IRI
        const userRequests: Observable<User>[] = userIris.map(iri => {
            const fullUrl = iri.startsWith('http') ? iri : `${environment.apiBaseUrl}${iri}`;
            console.log('Fetching user from IRI:', fullUrl);
            return this.http.get<User>(fullUrl);
        });

        // Fetch all users in parallel
        if (userRequests.length > 0) {
            forkJoin(userRequests).pipe(
                finalize(() => {
                    this.usersLoading = false;
                    this.usersLoaded = true;
                })
            ).subscribe({
                next: (users) => {
                    this.clientUsers = users;
                    console.log('Loaded users from IRIs:', users);
                },
                error: (err) => {
                    console.error('Error loading users:', err);
                    this.notificationService.error('Failed to load user data.');
                }
            });
        } else {
            this.usersLoading = false;
            this.usersLoaded = true;
        }
    }

    /**
     * Load full user details from ClientUser objects
     */
    loadClientUsers(clientUsers: ClientUser[]): void {
        this.usersLoading = true;

        // Check if we already have enough information to display
        // ClientUser already contains id, email, firstName, lastName
        // We might not need to fetch additional details

        // Convert ClientUser to User format
        this.clientUsers = clientUsers.map(clientUser => ({
            id: clientUser.id,
            email: clientUser.email,
            firstName: clientUser.firstName,
            lastName: clientUser.lastName,
            roles: ['ROLE_USER'], // Default role since ClientUser doesn't include roles
            '@id': clientUser['@id'],
            '@type': clientUser['@type']
        } as User));

        this.usersLoading = false;
        this.usersLoaded = true;
        console.log('Loaded client users from embedded data:', this.clientUsers);

        // Optionally, if you need to fetch full user details including roles:
        // Uncomment the following code
        /*
        const userRequests: Observable<User>[] = clientUsers.map(clientUser => {
            const userEndpoint = `${environment.apiBaseUrl}/api/v1/users/${clientUser.id}`;
            console.log('Fetching full user details from:', userEndpoint);
            return this.http.get<User>(userEndpoint);
        });

        if (userRequests.length > 0) {
            forkJoin(userRequests).pipe(
                finalize(() => {
                    this.usersLoading = false;
                    this.usersLoaded = true;
                })
            ).subscribe({
                next: (users) => {
                    this.clientUsers = users;
                    console.log('Loaded full user details:', users);
                },
                error: (err) => {
                    console.error('Error loading full user details:', err);
                    // Keep the basic data we already have
                    this.notificationService.warning('Could not load full user details. Showing basic information.');
                }
            });
        }
        */
    }

    /**
     * Toggle selection of all users
     */
    toggleAllUsers(): void {
        if (this.allUsersSelected) {
            this.selectedUsers.clear();
        } else {
            this.clientUsers.forEach(user => {
                this.selectedUsers.add(user.id);
            });
        }
        this.allUsersSelected = !this.allUsersSelected;
    }

    /**
     * Toggle selection of a single user
     */
    toggleUserSelection(userId: string): void {
        if (this.selectedUsers.has(userId)) {
            this.selectedUsers.delete(userId);
        } else {
            this.selectedUsers.add(userId);
        }

        // Update all users selected state
        this.allUsersSelected = this.selectedUsers.size === this.clientUsers.length && this.clientUsers.length > 0;
    }

    /**
     * Check if a user is selected
     */
    isUserSelected(userId: string): boolean {
        return this.selectedUsers.has(userId);
    }

    /**
     * Get role display badges
     */
    getRoleBadges(roles: string[]): string[] {
        const roleMap: Record<string, string> = {
            'ROLE_USER': 'User',
            'ROLE_ADMIN': 'Admin',
            'ROLE_MANAGER': 'Manager',
            'ROLE_SALES': 'Sales'
        };

        return roles.map(role => roleMap[role] || role);
    }


    /**
     * Remove user from a client (only from form, not from database)
     */
    removeUser(userId: string): void {
        if (confirm('Are you sure you want to remove this user from the client?')) {
            // Remove from the displayed users array
            this.clientUsers = this.clientUsers.filter(user => user.id !== userId);

            // Remove from the form's users array (IRI format)
            const currentUsers = this.clientForm.get('users')?.value || [];
            const userIri = `/api/v1/users/${userId}`;
            const updatedUsers = currentUsers.filter((iri: string) => iri !== userIri);
            this.clientForm.patchValue({ users: updatedUsers });

            // Remove from selected users if it was selected
            this.selectedUsers.delete(userId);

            // Update the all users selected state
            this.allUsersSelected = this.selectedUsers.size === this.clientUsers.length && this.clientUsers.length > 0;

            this.notificationService.success('User removed from client.');
        }
    }

    /**
     * Add new user to client - opens user selection modal
     */
    addUser(): void {
        this.showUserModal = true;
        this.loadModalUsers();
    }

    /**
     * Load users for the selection modal
     */
    loadModalUsers(page: number = 1): void {
        this.modalUsersLoading = true;
        this.modalCurrentPage = page;

        // Build search parameters including hasClient filter
        const searchParams: Record<string, string> = {
            hasClient: 'false' // Only get users that can be assigned to clients
        };

        if (this.modalSearchTerm) {
            searchParams['email'] = this.modalSearchTerm;
        }

        this.userService.getUsers(page, 'email', 'asc', searchParams).pipe(
            finalize(() => {
                this.modalUsersLoading = false;
            })
        ).subscribe({
            next: (response) => {
                // Filter out users that are already assigned to this client
                const currentUserIds = this.clientUsers.map(u => u.id);
                this.modalUsers = response.users.filter(user =>
                    !currentUserIds.includes(user.id)
                );
                this.modalTotalPages = response.totalPages;
            },
            error: (err) => {
                console.error('Error loading users:', err);
                this.notificationService.error('Failed to load users.');
            }
        });
    }

    /**
     * Search users in the modal
     */
    searchModalUsers(): void {
        this.loadModalUsers(1);
    }

    /**
     * Select a user from the modal to add to client
     */
    selectUserFromModal(user: User): void {
        const userIri = `/api/v1/users/${user.id}`;
        const currentUsers = this.clientForm.get('users')?.value || [];

        // Check if user is already added
        if (currentUsers.includes(userIri)) {
            this.notificationService.warning('User is already assigned to this client.');
            return;
        }

        // Add the user IRI to the form
        const updatedUsers = [...currentUsers, userIri];
        this.clientForm.patchValue({ users: updatedUsers });

        // Add to the display array
        this.clientUsers = [...this.clientUsers, user];

        // Close modal
        this.showUserModal = false;
        this.modalSearchTerm = '';

        this.notificationService.success(`User "${user.firstName} ${user.lastName}" added to client.`);
    }

    /**
     * Close user selection modal
     */
    closeUserModal(): void {
        this.showUserModal = false;
        this.modalSearchTerm = '';
    }

    /**
     * Navigate to next page in modal
     */
    nextModalPage(): void {
        if (this.modalCurrentPage < this.modalTotalPages) {
            this.loadModalUsers(this.modalCurrentPage + 1);
        }
    }

    /**
     * Navigate to previous page in modal
     */
    previousModalPage(): void {
        if (this.modalCurrentPage > 1) {
            this.loadModalUsers(this.modalCurrentPage - 1);
        }
    }

    initForm(): void {
        this.clientForm = this.fb.group({
            name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
            code: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
            description: [''],
            address: ['', [Validators.maxLength(500)]],
            phoneNumber: ['', [Validators.maxLength(50)]],
            email: ['', [Validators.email, Validators.maxLength(180)]],
            vatNumber: ['', [Validators.maxLength(50)]],
            users: [[]] // Array of user IRIs
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
            const clientData = this.prepareClientData();

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
            const clientData = this.prepareClientData();

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
     * Prepare client data for API submission
     * Ensures users array is properly formatted
     */
    private prepareClientData(): any {
        const formValue = this.clientForm.value;

        // Create the client data object
        const clientData: any = {
            name: formValue.name,
            code: formValue.code,
            description: formValue.description,
            address: formValue.address,
            phoneNumber: formValue.phoneNumber,
            email: formValue.email,
            vatNumber: formValue.vatNumber,
            users: formValue.users || [] // Always include users array, even if empty
        };

        return clientData;
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

        // Extract user IRIs from the clientData
        let userIris: string[] = [];
        if (clientData.users && clientData.users.length > 0) {
            // Check if users are strings (IRIs) or objects
            if (typeof clientData.users[0] === 'string') {
                userIris = clientData.users as any as string[];
            } else {
                // If they're objects, extract the IRI from each user
                userIris = clientData.users.map(user => `/api/v1/users/${user.id}`);
            }
        }

        // Map the client data to the form fields
        this.clientForm.patchValue({
            name: clientData.name,
            code: clientData.code,
            description: clientData.description || '',
            address: clientData.address || '',
            phoneNumber: clientData.phoneNumber || '',
            email: clientData.email || '',
            vatNumber: clientData.vatNumber || '',
            users: userIris
        });

        console.log('clientForm', this.clientForm);
    }

    setActiveTab(tab: "userAccounts" | "installedBase" | "areaManagers"): void {
        this.activeTab = tab;
    }
}
