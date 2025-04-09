import { Component, OnInit, ChangeDetectorRef, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from "../../../_metronic/shared/shared.module";
import { RouterLink } from "@angular/router";
import { MediaItem } from "../../../interfaces/mediaItems.interface";
import { MediaService } from "../../../services/media.service";
import {ModalComponent, ModalConfig, ModalsModule} from "../../../_metronic/partials";

@Component({
    selector: 'app-media-listing',
    templateUrl: './media-listing.component.html',
    standalone: true,
    imports: [CommonModule, SharedModule, ModalsModule],
    styleUrls: ['./media-listing.component.scss']
})
export class MediaListingComponent implements OnInit, AfterViewInit {
    @ViewChild('fileInput') fileInput!: ElementRef;
    @ViewChild('imageModal') private imageModal!: ModalComponent;
    @ViewChild('deleteConfirmModal') private deleteConfirmModal!: ModalComponent;
    @ViewChild('fullscreenModal') private fullscreenModal!: ModalComponent;

    // Modal configuration
    modalConfig: ModalConfig = {
        modalTitle: 'Media Preview',
        dismissButtonLabel: 'Close',
        closeButtonLabel: 'Save',
        hideDismissButton: () => false,
        hideCloseButton: () => true,
    };

    // Delete confirmation modal config
    deleteModalConfig: ModalConfig = {
        modalTitle: 'Confirm Delete',
        dismissButtonLabel: 'Cancel',
        closeButtonLabel: 'Delete',
        hideDismissButton: () => false,
        hideCloseButton: () => false,
        hideHeader: () => true,
        hideFooter: () => true,
    };

    // Modal size configuration
    modalSize: 'xl' | 'lg' | 'sm' | '' = 'xl';
    deleteModalSize: 'xl' | 'lg' | 'sm' | '' = 'sm';

    selectedMediaItem: MediaItem | null = null;
    mediaToDelete: MediaItem | null = null;
    fullImageUrl: string = '';

    mediaItems: MediaItem[] = [];
    isLoading = true;
    error: string | null = null;
    isDeleting = false;

    // Toast notifications
    toasts: Array<{
        message: string;
        type: 'success' | 'error';
        id: number;
    }> = [];
    private toastCounter = 0;

    // Upload tracking
    isUploading = false;
    uploadProgress = 0;
    selectedFiles: File[] = [];

    constructor(
        private mediaService: MediaService,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.loadMediaItems();
    }

    ngAfterViewInit(): void {
        // Initialize dropzone-like area
        const dropArea = document.getElementById('manual-dropzone');

        if (dropArea) {
            // Prevent default drag behaviors
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                dropArea.addEventListener(eventName, preventDefaults, false);
            });

            function preventDefaults(e: Event) {
                e.preventDefault();
                e.stopPropagation();
            }

            // Highlight drop area when item is dragged over it
            ['dragenter', 'dragover'].forEach(eventName => {
                dropArea.addEventListener(eventName, () => {
                    dropArea.classList.add('highlight');
                }, false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                dropArea.addEventListener(eventName, () => {
                    dropArea.classList.remove('highlight');
                }, false);
            });

            // Handle dropped files
            dropArea.addEventListener('drop', (e: any) => {
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.handleFiles(files);
                }
            }, false);

            // Handle click to select files
            dropArea.addEventListener('click', () => {
                this.fileInput.nativeElement.click();
            });
        }
    }

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            this.handleFiles(input.files);
        }
    }

    handleFiles(files: FileList): void {
        this.selectedFiles = Array.from(files);
        this.uploadFiles();
    }

    uploadFiles(): void {
        if (this.selectedFiles.length === 0) return;

        this.isUploading = true;
        this.uploadProgress = 0;
        let completedCount = 0;

        this.selectedFiles.forEach(file => {
            const formData = new FormData();
            formData.append('file', file);

            this.mediaService.createMediaItem(formData).subscribe({
                next: (response) => {
                    completedCount++;
                    this.uploadProgress = (completedCount / this.selectedFiles.length) * 100;

                    if (completedCount === this.selectedFiles.length) {
                        this.isUploading = false;
                        this.selectedFiles = [];
                        this.showNotification('Files uploaded successfully!', 'success');
                        this.loadMediaItems(); // Refresh the list
                    }

                    this.cdr.detectChanges();
                },
                error: (error) => {
                    console.error('Upload error:', error);
                    this.isUploading = false;
                    this.showNotification('Error uploading file. Please try again.', 'error');
                    this.cdr.detectChanges();
                }
            });
        });
    }

    cancelUpload(): void {
        // This is simplified - in a real implementation, you'd need to cancel the HTTP requests
        this.isUploading = false;
        this.selectedFiles = [];
        this.uploadProgress = 0;
        this.cdr.detectChanges();
    }

    private loadMediaItems(): void {
        this.isLoading = true;
        this.mediaService.getMediaItems().subscribe({
            next: (response) => {
                this.mediaItems = [...response.member];  // Create a new array reference
                this.isLoading = false;
                this.cdr.detectChanges();  // Force change detection
            },
            error: (error) => {
                this.error = 'Failed to load media items. Please try again later.';
                this.isLoading = false;
                console.error('Error loading media items:', error);
                this.cdr.detectChanges();  // Force change detection
            }
        });
    }

    // Method to initiate delete media item
    confirmDeleteMediaItem(mediaItem: MediaItem, event: Event): void {
        event.preventDefault();
        this.mediaToDelete = mediaItem;
        this.deleteModalConfig.modalTitle = `Delete ${mediaItem.filename}`;
        this.deleteConfirmModal.open(this.deleteModalSize);
        this.cdr.detectChanges();
    }

    // Method to execute the delete
    deleteMediaItem(): void {
        if (!this.mediaToDelete) return;

        this.isDeleting = true;

        this.mediaService.deleteMediaItem(this.mediaToDelete.id).subscribe({
            next: () => {
                // Remove the item from the array
                this.mediaItems = this.mediaItems.filter(item => item.id !== this.mediaToDelete?.id);
                this.showNotification(`${this.mediaToDelete?.filename} was deleted successfully.`, 'success');
                this.isDeleting = false;
                this.mediaToDelete = null;
                this.deleteConfirmModal.close();
                this.cdr.detectChanges();
            },
            error: (error) => {
                console.error('Delete error:', error);
                this.showNotification(`Error deleting ${this.mediaToDelete?.filename}. Please try again.`, 'error');
                this.isDeleting = false;
                this.cdr.detectChanges();
            }
        });
    }

    private showNotification(message: string, type: 'success' | 'error'): void {
        const id = ++this.toastCounter;
        this.toasts.push({ message, type, id });
        this.cdr.detectChanges();

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            this.dismissToast(id);
        }, 5000);
    }

    dismissToast(id: number): void {
        this.toasts = this.toasts.filter(toast => toast.id !== id);
        this.cdr.detectChanges();
    }

    // Open image preview modal
    openImagePreview(mediaItem: MediaItem): void {
        this.selectedMediaItem = mediaItem;
        this.fullImageUrl = 'https://127.0.0.1:8002' + mediaItem.filePath;
        this.modalConfig.modalTitle = mediaItem.filename;

        // Open the modal
        this.imageModal.open(this.modalSize).then(() => {
            // This runs after the modal is closed
            this.selectedMediaItem = null;
        });

        this.cdr.detectChanges();
    }
}
