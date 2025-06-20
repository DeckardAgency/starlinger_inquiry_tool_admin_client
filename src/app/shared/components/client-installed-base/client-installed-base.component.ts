import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { ClientMachineInstalledBaseService } from '@services/http/client-machine-installed-base.service';
import { MachineService } from '@services/http/machine.service';
import { ClientService } from '@services/http/client.service';
import { ClientMachineInstalledBase, CreateClientMachineInstalledBaseDto } from '@models/client-machine-installed-base.model';
import { Machine } from '@models/machine.model';
import { Client } from '@models/client.model';
import { NotificationService } from '@services/notification.service';

@Component({
    selector: 'client-installed-base',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    templateUrl: './client-installed-base.component.html',
    styleUrls: ['./client-installed-base.component.scss']
})
export class ClientInstalledBaseComponent implements OnInit, OnChanges {
    @Input() clientCode!: string;

    // Installed Base data
    installedBases: ClientMachineInstalledBase[] = [];
    installedBasesLoading = false;
    installedBasesLoaded = false;

    // Client data
    currentClient: Client | null = null;

    // Add Machine Modal
    showAddMachineModal = false;
    addMachineForm!: FormGroup;
    savingMachine = false;

    // Machine selection
    machines: Machine[] = [];
    machinesLoading = false;
    machineSearchTerm = '';
    machineCurrentPage = 1;
    machineTotalPages = 1;
    selectedMachine: Machine | null = null;

    constructor(
        private fb: FormBuilder,
        private clientMachineService: ClientMachineInstalledBaseService,
        private machineService: MachineService,
        private clientService: ClientService,
        private notificationService: NotificationService
    ) {
        this.initForm();
    }

    ngOnInit(): void {
        if (this.clientCode) {
            this.loadClientData();
            this.loadInstalledBases();
        }
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['clientCode'] && changes['clientCode'].currentValue) {
            this.loadClientData();
            this.loadInstalledBases();
        }
    }

    /**
     * Initialize the add machine form
     */
    initForm(): void {
        this.addMachineForm = this.fb.group({
            machine: [null, Validators.required],
            installedDate: [new Date().toISOString().split('T')[0], Validators.required],
            location: [''],
            status: ['active', Validators.required],
            warrantyEndDate: [''],
            notes: [''],
            installedBy: [''],
            installationReference: [''],
            monthlyRate: ['']
        });
    }

    /**
     * Load client data by code
     */
    loadClientData(): void {
        if (!this.clientCode) return;

        this.clientService.getClientByCode(this.clientCode).subscribe({
            next: (client) => {
                this.currentClient = client;
            },
            error: (err) => {
                console.error('Error loading client data:', err);
            }
        });
    }

    /**
     * Load installed bases for the client
     */
    loadInstalledBases(): void {
        if (!this.clientCode) {
            console.warn('No client code provided');
            return;
        }

        this.installedBasesLoading = true;

        console.log('Loading installed bases for client code:', this.clientCode);

        this.clientMachineService.getClientMachineInstalledBasesByClientCode(this.clientCode)
            .pipe(
                finalize(() => {
                    this.installedBasesLoading = false;
                    this.installedBasesLoaded = true;
                })
            )
            .subscribe({
                next: (installedBases) => {
                    console.log('Raw installed bases response:', installedBases);
                    this.installedBases = installedBases;
                    console.log('Loaded installed bases count:', installedBases.length);
                    console.log('Installed bases data:', installedBases);
                },
                error: (err) => {
                    console.error('Error loading installed bases:', err);
                    this.notificationService.error('Failed to load installed base data.');
                }
            });
    }

    /**
     * Open add machine modal
     */
    openAddMachineModal(): void {
        this.showAddMachineModal = true;
        this.loadMachines();
        this.resetForm();
    }

    /**
     * Close add machine modal
     */
    closeAddMachineModal(): void {
        this.showAddMachineModal = false;
        this.selectedMachine = null;
        this.machineSearchTerm = '';
        this.resetForm();
    }

    /**
     * Reset the form to default values
     */
    resetForm(): void {
        this.addMachineForm.reset({
            machine: null,
            installedDate: new Date().toISOString().split('T')[0],
            location: '',
            status: 'active',
            warrantyEndDate: '',
            notes: '',
            installedBy: '',
            installationReference: '',
            monthlyRate: ''
        });
        this.selectedMachine = null;
    }

    /**
     * Load machines for selection
     */
    loadMachines(page: number = 1): void {
        this.machinesLoading = true;
        this.machineCurrentPage = page;

        const searchParams: Record<string, string> = {};

        if (this.machineSearchTerm) {
            // Add search parameters based on your API
            searchParams['ibSerialNumber'] = this.machineSearchTerm;
        }

        this.machineService.getMachines(page, 'ibSerialNumber', 'asc', searchParams)
            .pipe(
                finalize(() => {
                    this.machinesLoading = false;
                })
            )
            .subscribe({
                next: (response) => {
                    // Filter out machines that are already installed for this client
                    const installedMachineIds = this.installedBases.map(ib => ib.machine.id);
                    this.machines = response.machines.filter(machine =>
                        !installedMachineIds.includes(machine.id)
                    );
                    this.machineTotalPages = response.totalPages;
                    console.log('Loaded machines:', this.machines);
                },
                error: (err) => {
                    console.error('Error loading machines:', err);
                    this.notificationService.error('Failed to load machines.');
                }
            });
    }

    /**
     * Search machines
     */
    searchMachines(): void {
        this.loadMachines(1);
    }

    /**
     * Select a machine from the list
     */
    selectMachine(machine: Machine): void {
        this.selectedMachine = machine;
        this.addMachineForm.patchValue({
            machine: machine.id
        });
    }

    /**
     * Navigate to next page of machines
     */
    nextMachinePage(): void {
        if (this.machineCurrentPage < this.machineTotalPages) {
            this.loadMachines(this.machineCurrentPage + 1);
        }
    }

    /**
     * Navigate to previous page of machines
     */
    previousMachinePage(): void {
        if (this.machineCurrentPage > 1) {
            this.loadMachines(this.machineCurrentPage - 1);
        }
    }

    /**
     * Save the new machine installation
     */
    saveMachineInstallation(): void {
        if (!this.addMachineForm.valid || !this.currentClient) {
            this.markFormGroupTouched(this.addMachineForm);
            return;
        }

        this.savingMachine = true;
        const formValue = this.addMachineForm.value;

        const installationData: CreateClientMachineInstalledBaseDto = {
            client: `/api/v1/clients/${this.currentClient.id}`,
            machine: `/api/v1/machines/${formValue.machine}`,
            installedDate: new Date(formValue.installedDate).toISOString(),
            location: formValue.location || undefined,
            status: formValue.status,
            warrantyEndDate: formValue.warrantyEndDate ? new Date(formValue.warrantyEndDate).toISOString() : undefined,
            notes: formValue.notes || undefined,
            installedBy: formValue.installedBy || undefined,
            installationReference: formValue.installationReference || undefined,
            monthlyRate: formValue.monthlyRate || undefined
        };

        console.log('Creating installation:', installationData);

        this.clientMachineService.createClientMachineInstalledBase(installationData)
            .pipe(
                finalize(() => {
                    this.savingMachine = false;
                })
            )
            .subscribe({
                next: (createdInstallation) => {
                    console.log('Machine installed successfully:', createdInstallation);
                    this.notificationService.success(`Machine ${this.getMachineDisplayName(this.selectedMachine)} installed successfully!`);
                    this.closeAddMachineModal();
                    this.loadInstalledBases(); // Refresh the list
                },
                error: (err) => {
                    console.error('Error installing machine:', err);
                    this.notificationService.error('Failed to install machine. Please try again.');
                }
            });
    }

    /**
     * Check if form field has error
     */
    hasError(fieldName: string): boolean {
        const field = this.addMachineForm.get(fieldName);
        return !!(field && field.invalid && (field.dirty || field.touched));
    }

    /**
     * Get error message for form field
     */
    getErrorMessage(fieldName: string): string {
        const field = this.addMachineForm.get(fieldName);
        if (!field || !field.errors) return '';

        if (field.errors['required']) {
            return `${this.getFieldLabel(fieldName)} is required`;
        }

        return 'Invalid value';
    }

    /**
     * Get field label for error messages
     */
    getFieldLabel(fieldName: string): string {
        const labels: { [key: string]: string } = {
            machine: 'Machine',
            installedDate: 'Installation Date',
            location: 'Location',
            status: 'Status',
            warrantyEndDate: 'Warranty End Date',
            notes: 'Notes',
            installedBy: 'Installed By',
            installationReference: 'Installation Reference',
            monthlyRate: 'Monthly Rate'
        };
        return labels[fieldName] || fieldName;
    }

    /**
     * Mark all form fields as touched
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
     * Get status badge class for installed base status
     */
    getStatusBadgeClass(status: string): string {
        return this.clientMachineService.getStatusBadgeClass(status);
    }

    /**
     * Format status text for display
     */
    formatStatusText(status: string): string {
        return this.clientMachineService.formatStatusText(status);
    }

    /**
     * Format date for display
     */
    formatDate(dateString: string | undefined): string {
        if (!dateString) return '-';

        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch {
            return '-';
        }
    }

    /**
     * Get machine display name
     */
    getMachineDisplayName(machine: any): string {
        if (!machine) return '-';

        const parts = [];
        if (machine.ibStationNumber) parts.push(`IB: ${machine.ibStationNumber}`);
        if (machine.ibSerialNumber) parts.push(`Serial: ${machine.ibSerialNumber}`);
        if (machine.orderNumber) parts.push(`Order: ${machine.orderNumber}`);

        return parts.length > 0 ? parts.join(' | ') : `Machine ${machine.id.slice(0, 8)}`;
    }

    /**
     * Refresh the installed base data
     */
    refresh(): void {
        this.loadInstalledBases();
    }

    /**
     * TrackBy function for ngFor performance optimization
     */
    trackByInstalledBase(index: number, item: ClientMachineInstalledBase): string {
        return item.id;
    }

    /**
     * TrackBy function for machines
     */
    trackByMachine(index: number, item: Machine): string {
        return item.id;
    }
}
