import { MediaItem } from "@models/media.model";
import { PaginationLinks } from "@models/pagination.model";

export interface Product {
    '@id'?: string;           // The IRI identifier for the product
    '@type'?: string;         // The JSON-LD type
    id: string;               // The local ID
    name: string;
    slug: string;
    partNo: string;
    shortDescription: string;
    unit: string;
    price: number;
    weight: string;
    technicalDescription: string;
    featuredImage: MediaItem | string | null;  // Can be a MediaItem object or an IRI string
    imageGallery: MediaItem[] | string[];     // Can be an array of MediaItem objects or IRI strings
}

export interface ProductsResponse {
    products: Product[];
    totalItems: number;
    pagination: PaginationLinks;
    currentPage: number;
    totalPages: number;
}
