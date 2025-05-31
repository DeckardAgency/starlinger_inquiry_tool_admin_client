import { Component, Input, OnInit, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MediaItem } from '@models/media.model';

type FileType = 'PDF' | 'DOC' | 'DOCX' | 'XLS' | 'XLSX' | 'PPT' | 'PPTX' | 'ZIP' | 'IMG' | 'TXT';
type SortField = 'type' | 'name' | 'size';
type SortDirection = 'asc' | 'desc';

interface DocumentFile {
    id: string;
    type: FileType;
    name: string;
    size: string;
    sizeInBytes: number;
    selected?: boolean;
    url?: string;
    mediaItem?: MediaItem; // Reference to original MediaItem
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
export class ProductDocumentComponent implements OnInit, OnChanges {
    @Input() documents: MediaItem[] = [];
    @Output() documentsChange = new EventEmitter<MediaItem[]>();

    // Internal documents array that we'll manipulate
    internalDocuments: DocumentFile[] = [];

    activeDropdownId: string | null = null;
    sortField: SortField = 'name';
    sortDirection: SortDirection = 'asc';

    confirmDialog: ConfirmDialog = {
        show: false,
        title: '',
        message: ''
    };

    ngOnInit(): void {
        // Initialize internal documents with input documents
        this.initializeDocuments();
    }

    ngOnChanges(changes: SimpleChanges): void {
        // Update internal documents when input changes
        if (changes['documents'] && changes['documents'].currentValue) {
            this.initializeDocuments();
        }
    }

    private initializeDocuments(): void {
        if (this.documents && Array.isArray(this.documents)) {
            this.internalDocuments = this.documents.map(mediaItem => this.convertMediaItemToDocumentFile(mediaItem));
        } else {
            this.internalDocuments = [];
        }
    }

    private convertMediaItemToDocumentFile(mediaItem: MediaItem): DocumentFile {
        const fileType = this.getFileTypeFromName(mediaItem.filename) || this.getFileTypeFromMimeType(mediaItem.mimeType) || 'TXT';
        const fileSize = this.formatFileSize(0); // You might want to add size to MediaItem interface

        return {
            id: mediaItem.id,
            type: fileType,
            name: mediaItem.filename,
            size: fileSize,
            sizeInBytes: 0, // Default to 0 since MediaItem doesn't have size
            selected: false,
            url: mediaItem.filePath,
            mediaItem: mediaItem
        };
    }

    private formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    private getFileTypeFromMimeType(mimeType: string): FileType | null {
        const mimeTypeMap: Record<string, FileType> = {
            'application/pdf': 'PDF',
            'application/msword': 'DOC',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
            'application/vnd.ms-excel': 'XLS',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
            'application/vnd.ms-powerpoint': 'PPT',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
            'application/zip': 'ZIP',
            'application/x-zip-compressed': 'ZIP',
            'text/plain': 'TXT'
        };

        // Check for image mime types
        if (mimeType.startsWith('image/')) {
            return 'IMG';
        }

        return mimeTypeMap[mimeType] || null;
    }

    get allSelected(): boolean {
        return this.internalDocuments.length > 0 && this.internalDocuments.every(doc => doc.selected);
    }

    get someSelected(): boolean {
        return this.internalDocuments.some(doc => doc.selected) && !this.allSelected;
    }

    get selectedCount(): number {
        return this.internalDocuments.filter(doc => doc.selected).length;
    }

    get sortedDocuments(): DocumentFile[] {
        return [...this.internalDocuments].sort((a, b) => {
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
        this.internalDocuments.forEach(doc => doc.selected = shouldSelect);
        // No need to emit changes for selection
    }

    toggleSelection(doc: DocumentFile): void {
        doc.selected = !doc.selected;
        // No need to emit changes for selection
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
        if (doc.url) {
            window.open(doc.url, '_blank');
        }
        this.closeDropdown();
    }

    deleteDocument(doc: DocumentFile): void {
        this.confirmDialog = {
            show: true,
            title: 'Delete Document',
            message: `Are you sure you want to delete "${doc.name}"?`,
            action: () => {
                const index = this.internalDocuments.findIndex(d => d.id === doc.id);
                if (index > -1) {
                    this.internalDocuments.splice(index, 1);
                    this.emitDocumentsChange();
                }
                this.closeConfirmDialog();
            }
        };
        this.closeDropdown();
    }

    bulkDownload(): void {
        const selectedDocs = this.internalDocuments.filter(doc => doc.selected);
        console.log('Downloading documents:', selectedDocs.map(d => d.name));
        selectedDocs.forEach(doc => {
            if (doc.url) {
                // Add a small delay between downloads to avoid browser blocking
                setTimeout(() => window.open(doc.url!, '_blank'), 100);
            }
        });
    }

    bulkDelete(): void {
        const selectedCount = this.selectedCount;
        this.confirmDialog = {
            show: true,
            title: 'Delete Documents',
            message: `Are you sure you want to delete ${selectedCount} selected document${selectedCount > 1 ? 's' : ''}?`,
            action: () => {
                this.internalDocuments = this.internalDocuments.filter(doc => !doc.selected);
                this.emitDocumentsChange();
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

    /**
     * Helper method to determine file type from filename
     */
    private getFileTypeFromName(filename: string): FileType | null {
        if (!filename) return null;

        const extension = filename.split('.').pop()?.toUpperCase();
        if (!extension) return null;

        const validTypes: FileType[] = ['PDF', 'DOC', 'DOCX', 'XLS', 'XLSX', 'PPT', 'PPTX', 'ZIP', 'IMG', 'TXT'];

        if (validTypes.includes(extension as FileType)) {
            return extension as FileType;
        }

        // Check for image extensions
        const imageExtensions = ['JPG', 'JPEG', 'PNG', 'GIF', 'BMP', 'SVG', 'WEBP'];
        if (imageExtensions.includes(extension)) {
            return 'IMG';
        }

        return null;
    }

    /**
     * Emit the updated documents array to a parent component
     */
    private emitDocumentsChange(): void {
        // Convert back to the MediaItem array, excluding deleted items
        const updatedMediaItems = this.internalDocuments
            .filter(doc => doc.mediaItem)
            .map(doc => doc.mediaItem!);

        this.documentsChange.emit(updatedMediaItems);
    }
}
