import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

type FileType = 'PDF' | 'DOC' | 'DOCX' | 'XLS' | 'XLSX' | 'PPT' | 'PPTX' | 'ZIP' | 'IMG' | 'TXT';
type SortField = 'type' | 'name' | 'size';
type SortDirection = 'asc' | 'desc';

interface DocumentFile {
    id: string;
    type: FileType;
    name: string;
    size: string;
    sizeInBytes: number; // For accurate sorting
    selected?: boolean;
}

interface ConfirmDialog {
    show: boolean;
    title: string;
    message: string;
    action?: () => void;
}

@Component({
    selector: 'app-product-document',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './product-document.component.html',
    styleUrls: ['./product-document.component.scss']
})
export class ProductDocumentComponent {
    documents: DocumentFile[] = [
        {
            id: '1',
            type: 'PDF',
            name: 'Product brochure.pdf',
            size: '1.2 MB',
            sizeInBytes: 1258291,
            selected: false
        },
        {
            id: '2',
            type: 'PDF',
            name: 'Product warranty.pdf',
            size: '0.7 MB',
            sizeInBytes: 734003,
            selected: false
        },
        {
            id: '3',
            type: 'DOCX',
            name: 'Installation guide.docx',
            size: '2.5 MB',
            sizeInBytes: 2621440,
            selected: false
        },
        {
            id: '4',
            type: 'XLSX',
            name: 'Price list.xlsx',
            size: '0.9 MB',
            sizeInBytes: 943718,
            selected: false
        },
        {
            id: '5',
            type: 'ZIP',
            name: 'Product images.zip',
            size: '15.3 MB',
            sizeInBytes: 16039116,
            selected: false
        },
        {
            id: '6',
            type: 'PPT',
            name: 'Sales presentation.ppt',
            size: '5.8 MB',
            sizeInBytes: 6081740,
            selected: false
        }
    ];

    activeDropdownId: string | null = null;
    sortField: SortField = 'name';
    sortDirection: SortDirection = 'asc';

    confirmDialog: ConfirmDialog = {
        show: false,
        title: '',
        message: ''
    };

    get allSelected(): boolean {
        return this.documents.length > 0 && this.documents.every(doc => doc.selected);
    }

    get someSelected(): boolean {
        return this.documents.some(doc => doc.selected) && !this.allSelected;
    }

    get selectedCount(): number {
        return this.documents.filter(doc => doc.selected).length;
    }

    get sortedDocuments(): DocumentFile[] {
        return [...this.documents].sort((a, b) => {
            let compareValue = 0;

            switch (this.sortField) {
                case 'type':
                    compareValue = a.type.localeCompare(b.type);
                    break;
                case 'name':
                    compareValue = a.name.localeCompare(b.name);
                    break;
                case 'size':
                    compareValue = a.sizeInBytes - b.sizeInBytes;
                    break;
            }

            return this.sortDirection === 'asc' ? compareValue : -compareValue;
        });
    }

    toggleAllSelection(): void {
        const shouldSelect = !this.allSelected;
        this.documents.forEach(doc => doc.selected = shouldSelect);
    }

    toggleSelection(doc: DocumentFile): void {
        doc.selected = !doc.selected;
    }

    toggleDropdown(docId: string, event: Event): void {
        event.stopPropagation();
        this.activeDropdownId = this.activeDropdownId === docId ? null : docId;
    }

    sort(field: SortField): void {
        if (this.sortField === field) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortField = field;
            this.sortDirection = 'asc';
        }
    }

    downloadDocument(doc: DocumentFile): void {
        console.log('Downloading:', doc.name);
        // Implement actual download logic here
        this.closeDropdown();
    }

    deleteDocument(doc: DocumentFile): void {
        this.confirmDialog = {
            show: true,
            title: 'Delete Document',
            message: `Are you sure you want to delete "${doc.name}"?`,
            action: () => {
                const index = this.documents.findIndex(d => d.id === doc.id);
                if (index > -1) {
                    this.documents.splice(index, 1);
                }
                this.closeConfirmDialog();
            }
        };
        this.closeDropdown();
    }

    bulkDownload(): void {
        const selectedDocs = this.documents.filter(doc => doc.selected);
        console.log('Downloading documents:', selectedDocs.map(d => d.name));
        // Implement bulk download logic
    }

    bulkDelete(): void {
        const selectedCount = this.selectedCount;
        this.confirmDialog = {
            show: true,
            title: 'Delete Documents',
            message: `Are you sure you want to delete ${selectedCount} selected document${selectedCount > 1 ? 's' : ''}?`,
            action: () => {
                this.documents = this.documents.filter(doc => !doc.selected);
                this.closeConfirmDialog();
            }
        };
    }

    confirmAction(): void {
        if (this.confirmDialog.action) {
            this.confirmDialog.action();
        }
    }

    closeConfirmDialog(): void {
        this.confirmDialog = {
            show: false,
            title: '',
            message: ''
        };
    }

    closeDropdown(): void {
        this.activeDropdownId = null;
    }

    onDocumentClick(event: Event): void {
        const target = event.target as HTMLElement;
        if (!target.closest('.product-document__actions-wrapper')) {
            this.closeDropdown();
        }
    }

    getFileIcon(type: FileType): string {
        const icons: Record<FileType, string> = {
            PDF: 'M4 2C2.9 2 2 2.9 2 4v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8l-6-6H4zm8 18h-2v-6H7v6H5v-9h2l3 3.5L13 11h2v9zm1-10V3.5L19.5 10H13z',
            DOC: 'M4 2C2.9 2 2 2.9 2 4v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8l-6-6H4zm8 18H5v-9h2v7h2v-7h2v7h1v-7h2v9h-2zm1-10V3.5L19.5 10H13z',
            DOCX: 'M4 2C2.9 2 2 2.9 2 4v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8l-6-6H4zm8 18H5v-9h2v7h2v-7h2v7h1v-7h2v9h-2zm1-10V3.5L19.5 10H13z',
            XLS: 'M4 2C2.9 2 2 2.9 2 4v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8l-6-6H4zm4 18H6l2-5-2-4h2l1 2.5L10 11h2l-2 4 2 5h-2l-1-2.5L8 20zm5-10V3.5L19.5 10H13z',
            XLSX: 'M4 2C2.9 2 2 2.9 2 4v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8l-6-6H4zm4 18H6l2-5-2-4h2l1 2.5L10 11h2l-2 4 2 5h-2l-1-2.5L8 20zm5-10V3.5L19.5 10H13z',
            PPT: 'M4 2C2.9 2 2 2.9 2 4v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8l-6-6H4zm3 18H5v-9h4c1.7 0 3 1.3 3 3s-1.3 3-3 3H7v3zm0-5h2c.6 0 1-.4 1-1s-.4-1-1-1H7v2zm6-5V3.5L19.5 10H13z',
            PPTX: 'M4 2C2.9 2 2 2.9 2 4v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8l-6-6H4zm3 18H5v-9h4c1.7 0 3 1.3 3 3s-1.3 3-3 3H7v3zm0-5h2c.6 0 1-.4 1-1s-.4-1-1-1H7v2zm6-5V3.5L19.5 10H13z',
            ZIP: 'M4 2C2.9 2 2 2.9 2 4v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8l-6-6H4zm8 2h2v2h-2v2h2v2h-2v2h2v2h-2v2h2v2h-2v4h-2v-4h2v-2h-2v-2h2v-2h-2V8h2V6h-2V4zm1 6V3.5L19.5 10H13z',
            IMG: 'M4 2C2.9 2 2 2.9 2 4v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8l-6-6H4zm3 13l2-2.5L11 15l3-4 4 5H7zm6-5V3.5L19.5 10H13z',
            TXT: 'M4 2C2.9 2 2 2.9 2 4v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8l-6-6H4zm1 17v-2h10v2H5zm0-4v-2h14v2H5zm0-4v-2h14v2H5zm8-1V3.5L19.5 10H13z'
        };
        return icons[type] || icons.TXT;
    }

    getFileColor(type: FileType): string {
        const colors: Record<FileType, string> = {
            PDF: '#dc2626',
            DOC: '#2563eb',
            DOCX: '#2563eb',
            XLS: '#16a34a',
            XLSX: '#16a34a',
            PPT: '#ea580c',
            PPTX: '#ea580c',
            ZIP: '#7c3aed',
            IMG: '#ec4899',
            TXT: '#6b7280'
        };
        return colors[type] || '#6b7280';
    }
}
