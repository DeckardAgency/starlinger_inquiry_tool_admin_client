import { User } from '@models/auth.model';
import { PaginationLinks } from '@models/pagination.model';

// Base Client interface
export interface Client {
    '@context'?: string;
    '@id': string;
    '@type': string;
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
}

// Extended Client interface with relations (for GET by ID)
export interface ClientDetail extends Client {
    users?: ClientUser[];
    productPrices?: ProductPrice[];
}

// User reference within Client
export interface ClientUser {
    '@context'?: string;
    '@id': string;
    '@type': string;
    id: string;
    email: string;
    firstName: string;
    lastName: string;
}

// Product price configuration for client
export interface ProductPrice {
    '@context'?: string;
    '@id': string;
    '@type': string;
    id: string;
    product: string;  // IRI reference to product
    price: number;
    discountPercentage: number;
}

// Client collection response
export interface ClientsResponse {
    '@context'?: string;
    '@id'?: string;
    '@type'?: string;
    member: Client[];
    totalItems: number;
    view?: {
        '@id': string;
        type: string;
        first?: string;
        last?: string;
        previous?: string;
        next?: string;
    };
    search?: {
        '@type': string;
        template: string;
        variableRepresentation: string;
        mapping: Array<{
            '@type': string;
            variable: string;
            property: string;
            required: boolean;
        }>;
    };
}

// Transformed response for easier UI consumption
export interface TransformedClientsResponse {
    clients: Client[];
    totalClients: number;
    pagination: PaginationLinks;
    currentPage: number;
    totalPages: number;
}

// Create/Update DTOs
export interface CreateClientDto {
    name: string;
    code: string;
    description?: string;
    address?: string;
    phoneNumber?: string;
    email?: string;
    vatNumber?: string;
}

export interface UpdateClientDto {
    name?: string;
    code?: string;
    description?: string;
    address?: string;
    phoneNumber?: string;
    email?: string;
    vatNumber?: string;
}

// Error responses
export interface ValidationError {
    '@context'?: string;
    '@id'?: string;
    '@type'?: string;
    status: number;
    violations: Array<{
        propertyPath: string;
        message: string;
    }>;
    detail?: string;
    description?: string;
    type?: string;
    title?: string;
    instance?: string;
}

export interface ApiError {
    '@context'?: string;
    '@id'?: string;
    '@type'?: string;
    title: string;
    detail: string;
    status: number;
    instance?: string;
    type?: string;
    description?: string;
}
