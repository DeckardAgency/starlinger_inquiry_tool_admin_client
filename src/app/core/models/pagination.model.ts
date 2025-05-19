import { Product } from "@models/product.model";

export interface PaginationLinks {
    first?: string;
    last?: string;
    next?: string;
    previous?: string;
}

export interface PaginatedResponse {
    '@context': string;
    '@id': string;
    '@type': string;
    'totalItems': number;
    'member': Product[];
    'view': {
        '@id': string;
        '@type': string;
        'first'?: string;
        'last'?: string;
        'next'?: string;
        'previous'?: string;
    };
}
