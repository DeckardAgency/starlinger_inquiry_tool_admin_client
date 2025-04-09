import {Product} from "./product.interface";

export interface MediaItem {
    '@id': string;
    '@type': string;
    id: string;
    filename: string;
    mimeType: string;
    filePath: string;
    createdAt: string;
    updatedAt: string;
}

export interface MediaItemsResponse {
    '@context': string;
    '@id': string;
    '@type': string;
    totalItems: number;
    member: MediaItem[];
    view: Record<string, unknown>;
}
