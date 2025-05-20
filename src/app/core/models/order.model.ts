import { PaginationLinks } from '@models/pagination.model';

export interface OrderProduct {
    '@id': string;
    '@type': string;
    id: string;
    name: string;
    price: number;
}

export interface OrderItem {
    '@id': string;
    '@type': string;
    product: OrderProduct;
    quantity: number;
    unitPrice: number;
    subtotal: number;
}

export interface Order {
    '@id': string;
    '@type': string;
    id: string;
    orderNumber: string;
    status: string;
    totalAmount: number;
    shippingAddress: string;
    billingAddress: string;
    createdAt: string;
    updatedAt: string;
    lastSavedAt: string;
    items: OrderItem[];
    user: string; // IRI reference to user
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
