import { Client } from '@models/client.model';
import { PaginationLinks } from '@models/pagination.model';

// Basic user interface
export interface User {
  '@context'?: string;
  '@id'?: string;
  '@type'?: string;
  id: string;
  email: string;
  roles: string[];
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  address?: string;
  createdAt?: string;
  updatedAt?: string;
  orders?: any[];
  inquiries?: any[];
  username?: string; // For compatibility with existing code
  client?: UserClient;
}

// Client reference within User
export interface UserClient {
  '@id': string;
  '@type': string;
  id: string;
  name: string;
  code: string;
}

// Extended User interface with full details
export interface UserDetail extends User {
  fullName?: string;
}

// API response format (JSON-LD)
export interface UserCollectionResponse {
  '@context'?: string;
  '@id'?: string;
  '@type'?: string;
  totalItems: number;
  member: User[];
  view?: {
    '@id': string;
    '@type': string;
    first?: string;
    last?: string;
    previous?: string;
    next?: string;
  };
  search?: {
    '@type': string;
    template: string;
    variableRepresentation: string;
    mapping: {
      '@type': string;
      variable: string;
      property: string;
      required: boolean;
    }[];
  };
}

// Transformed response for easier UI consumption
export interface TransformedUsersResponse {
  users: User[];
  totalUsers: number;
  pagination: PaginationLinks;
  currentPage: number;
  totalPages: number;
}

// Create/Update DTOs
export interface CreateUserDto {
  email: string;
  plainPassword: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  address?: string;
  roles?: string[];
  client?: string; // IRI reference
}

export interface UpdateUserDto {
  email?: string;
  plainPassword?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  address?: string;
  roles?: string[];
  client?: string; // IRI reference
}

// Role definitions
export const USER_ROLES = {
  USER: 'ROLE_USER',
  ADMIN: 'ROLE_ADMIN',
  MANAGER: 'ROLE_MANAGER',
  SALES: 'ROLE_SALES'
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

// Helper function to get role display name
export function getRoleDisplayName(role: string): string {
  const roleMap: Record<string, string> = {
    'ROLE_USER': 'User',
    'ROLE_ADMIN': 'Administrator',
    'ROLE_MANAGER': 'Manager',
    'ROLE_SALES': 'Sales'
  };
  return roleMap[role] || role;
}

// Error responses (reusing from client model if in same file, or import)
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
