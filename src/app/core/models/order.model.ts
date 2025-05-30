import { PaginationLinks } from '@models/pagination.model';

export interface OrderProduct {
    '@context'?: string;
    '@id': string;
    '@type': string;
    id: string;
    name: string;
    partNo: string;
    weight: string;
    price: number;
}

export interface OrderItem {
    '@context'?: string;
    '@id': string;
    '@type': string;
    id: string;
    orderRef?: string;
    product: OrderProduct;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    createdAt: string;
    updatedAt: string;
    isCustomPrice?: boolean;
}

export interface OrderLog {
    '@context'?: string;
    '@id': string;
    '@type': string;
    id: string;
    previousStatus: string;
    newStatus: string;
    comment: string;
    createdAt: string;
}

export interface Order {
    '@context'?: string;
    '@id': string;
    '@type': string;
    id: string;
    orderNumber: string;
    status: string;
    totalAmount: number;
    notes?: string;
    shippingAddress: string;
    billingAddress: string;
    createdAt: string;
    updatedAt: string;
    isDraft?: boolean;
    lastSavedAt: string;
    items: OrderItem[];
    user: string; // IRI reference to user
    logs?: OrderLog[];
}

export interface OrdersResponse {
    '@context': string;
    '@id': string;
    '@type': string;
    totalItems: number;
    member: Order[];
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

export interface TransformedOrdersResponse {
    orders: Order[];
    totalOrders: number;
    pagination: PaginationLinks;
    currentPage: number;
    totalPages: number;
}
