// models/client-machine-installed-base.model.ts

export interface ClientMachineInstalledBase {
    '@context'?: string;
    '@id'?: string;
    '@type'?: string;
    id: string;
    client: ClientReference;
    machine: MachineReference;
    installedDate: string;
    location?: string;
    status: 'active' | 'inactive' | 'maintenance' | 'decommissioned';
    warrantyEndDate?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
    installedBy?: string;
    installationReference?: string;
    monthlyRate?: string;
}

export interface ClientReference {
    '@context'?: string;
    '@id'?: string;
    '@type'?: string;
    id: string;
    name: string;
    code: string;
    description?: string;
    address?: string;
    phoneNumber?: string;
    email?: string;
    vatNumber?: string;
    createdAt: string;
    updatedAt: string;
    users: string[];
    machinesCount: number;
}

export interface MachineReference {
    '@context'?: string;
    '@id'?: string;
    '@type'?: string;
    id: string;
    createdAt: string;
    updatedAt: string;
    ibStationNumber: number;
    ibSerialNumber: number;
    articleNumber?: string;
    articleDescription?: string;
    orderNumber?: string;
    deliveryDate?: string;
    kmsIdentificationNumber?: string;
    kmsIdNumber?: string;
    mcNumber?: string;
    mainWarrantyEnd?: string;
    extendedWarrantyEnd?: string;
    fiStationNumber: number;
    fiSerialNumber: number;
    featuredImage?: string;
    imageGallery: string[];
    documents: string[];
    clientsCount: number;
}

export interface ClientMachineInstalledBaseResponse {
    '@context'?: string;
    '@id'?: string;
    '@type'?: string;
    member?: ClientMachineInstalledBase[]; // API uses 'member' not 'hydra:member'
    'hydra:member'?: ClientMachineInstalledBase[]; // Keep this for compatibility
    'hydra:totalItems'?: number;
    totalItems?: number; // API might use this instead
    view?: {
        '@id': string;
        '@type': string;
        'hydra:first'?: string;
        'hydra:last'?: string;
        'hydra:previous'?: string;
        'hydra:next'?: string;
    };
    'hydra:view'?: {
        '@id': string;
        '@type': string;
        'hydra:first'?: string;
        'hydra:last'?: string;
        'hydra:previous'?: string;
        'hydra:next'?: string;
    };
}

export interface CreateClientMachineInstalledBaseDto {
    client: string; // IRI format: "/api/v1/clients/{id}"
    machine: string; // IRI format: "/api/v1/machines/{id}"
    installedDate: string;
    location?: string;
    status: 'active' | 'inactive' | 'maintenance' | 'decommissioned';
    warrantyEndDate?: string;
    notes?: string;
    installedBy?: string;
    installationReference?: string;
    monthlyRate?: string;
}

export interface UpdateClientMachineInstalledBaseDto extends Partial<CreateClientMachineInstalledBaseDto> {
}
