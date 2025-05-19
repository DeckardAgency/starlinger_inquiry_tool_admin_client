// src/app/core/models/ui.model.ts
export interface Breadcrumb {
  label: string;
  link?: string;
}

export interface SearchResult {
  id: string;
  title: string;
  type: string;
  badge?: string;
  active?: boolean;
}
