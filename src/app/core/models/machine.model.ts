/**
 * Base context interface for JSON-LD support
 */
export interface JsonLdContext {
    '@context'?: string;
    '@id'?: string;
    '@type'?: string;
}

/**
 * Image/Media file interface
 */
export interface MediaFile extends JsonLdContext {
    id: string;
    filename: string;
    mimeType: string;
    filePath: string;
    createdAt: string;
    updatedAt: string;
}

/**
 * Machine resource interface
 */
export interface Machine extends JsonLdContext {
    id: string;
    createdAt: string;
    updatedAt: string;
    ibStationNumber: number;
    ibSerialNumber: number;
    articleNumber: string;
    articleDescription: string;
    orderNumber: string;
    deliveryDate?: string | Date | null;
    kmsIdentificationNumber: string;
    kmsIdNumber: string;
    mcNumber: string;
    mainWarrantyEnd: string;
    extendedWarrantyEnd: string;
    fiStationNumber: number;
    fiSerialNumber: number;
    featuredImage: MediaFile | string | null;
    imageGallery: MediaFile[] | string[];
}

/**
 * Pagination links interface for component compatibility
 */
export interface PaginationLinks {
    first?: string;
    last?: string;
    next?: string;
    previous?: string;
}

/**
 * Pagination view interface
 */
export interface PaginationView {
    '@id': string;
    type: string;
    first?: string;
    last?: string;
    previous?: string;
    next?: string;
}

/**
 * Search mapping interface
 */
export interface SearchMapping {
    '@type': string;
    variable: string;
    property: string;
    required: boolean;
}

/**
 * Search configuration interface
 */
export interface SearchConfig {
    '@type': string;
    template: string;
    variableRepresentation: string;
    mapping: SearchMapping[];
}

/**
 * Machine collection response interface
 */
export interface MachineCollection {
    member: Machine[];
    totalItems: number;
    view?: PaginationView;
    search?: SearchConfig;
}

/**
 * Validation violation interface
 */
export interface ValidationViolation {
    propertyPath: string;
    message: string;
}

/**
 * Error response interface (400, 404 errors)
 */
export interface ErrorResponse extends JsonLdContext {
    title: string;
    detail: string;
    status: number;
    instance: string;
    type: string;
    description: string;
}

/**
 * Validation error response interface (422 errors)
 */
export interface ValidationErrorResponse extends JsonLdContext {
    status: 422;
    violations: ValidationViolation[];
    detail: string;
    description: string;
    type: string;
    title: string;
    instance: string;
}

/**
 * Type guard to check if error is a validation error
 */
export function isValidationError(error: any): error is ValidationErrorResponse {
    return error && error.status === 422 && Array.isArray(error.violations);
}

/**
 * Type guard to check if error is a general error response
 */
export function isErrorResponse(error: any): error is ErrorResponse {
    return error && typeof error.status === 'number' && error.status !== 422;
}

/**
 * Machine create/update request interface
 * (Used for POST and PATCH requests)
 */
export interface MachineRequest {
    ibStationNumber?: number;
    ibSerialNumber?: number;
    articleNumber?: string;
    articleDescription?: string;
    orderNumber?: string;
    deliveryDate?: string;
    kmsIdentificationNumber?: string;
    kmsIdNumber?: string;
    mcNumber?: string;
    mainWarrantyEnd?: string;
    extendedWarrantyEnd?: string;
    fiStationNumber?: number;
    fiSerialNumber?: number;
    featuredImage?: string | File;
    imageGallery?: (string | File)[];
}

/**
 * API response type union
 */
export type MachineApiResponse = Machine | MachineCollection | ErrorResponse | ValidationErrorResponse;
