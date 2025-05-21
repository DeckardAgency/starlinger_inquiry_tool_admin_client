import { PaginationLinks } from '@models/pagination.model';

export interface InquiryMachinePart {
    '@id': string;
    '@type': string;
    id: string;
    partName: string;
    partNumber: string;
    shortDescription: string;
    additionalNotes: string;
    createdAt: string;
    updatedAt: string;
}

export interface Machine {
    '@id': string;
    '@type': string;
    ibStationNumber: number;
    ibSerialNumber: number;
    articleNumber: string;
    articleDescription: string;
    orderNumber: string;
    kmsIdentificationNumber: string;
    kmsIdNumber: string;
    mcNumber: string;
    fiStationNumber: number;
    fiSerialNumber: number;
}

export interface InquiryMachine {
    '@id': string;
    '@type': string;
    id: string;
    machine: Machine;
    notes: string;
    createdAt: string;
    updatedAt: string;
    products: InquiryMachinePart[];
}

export interface Inquiry {
    '@id': string;
    '@type': string;
    id: string;
    inquiryNumber: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    lastSavedAt: string;
    user: string; // IRI reference to user
    machines: InquiryMachine[];
}

export interface InquiriesResponse {
    '@context': string;
    '@id': string;
    '@type': string;
    totalItems: number;
    member: Inquiry[];
    view?: {
        '@id': string;
        '@type': string;
        'first'?: string;
        'last'?: string;
        'next'?: string;
        'previous'?: string;
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

export interface TransformedInquiriesResponse {
    inquiries: Inquiry[];
    totalInquiries: number;
    pagination: PaginationLinks;
    currentPage: number;
    totalPages: number;
}
