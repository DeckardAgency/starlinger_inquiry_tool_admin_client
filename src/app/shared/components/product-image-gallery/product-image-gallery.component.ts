import { Component, OnInit, HostListener, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MediaItem } from '@models/media.model';
import { MediaService } from '@services/http/media.service';
import { HttpEventType } from '@angular/common/http';
import { finalize, forkJoin, Observable, of } from 'rxjs';

interface GalleryImage {
    id: string;
    name: string;
    url: string;
    originalItem: MediaItem; // Reference to the original MediaItem
    isPrimary?: boolean;
    isRenaming?: boolean;
    newName?: string;
}

@Component({
    selector: 'app-product-image-gallery',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './product-image-gallery.component.html',
    styleUrls: ['./product-image-gallery.component.scss']
})
export class ProductImageGalleryComponent implements OnInit, OnChanges {
    @Input() mediaItems: MediaItem[] = [];
    @Output() mediaItemsChange = new EventEmitter<MediaItem[]>();
    @Output() primaryImageChange = new EventEmitter<MediaItem>();

    galleryImages: GalleryImage[] = [];
    activeImageMenu: string | null = null;
    isUploading = false;
    isDraggingOver = false;
    isDraggingImage = false;
    draggedImageId: string | null = null;
    dropTargetImageId: string | null = null;
    uploadProgress: number = 0;
    uploadErrors: string[] = [];

    constructor(private mediaService: MediaService) {}

    ngOnInit(): void {
        this.initializeGalleryImages();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['mediaItems']) {
            this.initializeGalleryImages();
        }
    }

    initializeGalleryImages(): void {
        if (this.mediaItems && this.mediaItems.length > 0) {
            this.galleryImages = this.mediaItems.map((item, index) => {
                return {
                    id: item.id || item['@id'] || String(index),
                    name: item.filename || `Image-${index + 1}`,
                    url: item.filePath || '',
                    originalItem: item,
                    isPrimary: index === 0, // Assuming the first image is primary by default
                    isRenaming: false
                };
            });
        } else {
            // If no media items, initialize with empty array
            this.galleryImages = [];
        }
    }

    // Method to emit the updated media items back to parent
    updateMediaItems(): void {
        const updatedMediaItems = this.galleryImages.map(image => image.originalItem);
        this.mediaItemsChange.emit(updatedMediaItems);

        // Emit the primary image separately
        const primaryImage = this.galleryImages.find(img => img.isPrimary);
        if (primaryImage) {
            this.primaryImageChange.emit(primaryImage.originalItem);
        }
    }

    toggleImageMenu(imageId: string): void {
        if (this.activeImageMenu === imageId) {
            this.activeImageMenu = null;
        } else {
            this.activeImageMenu = imageId;
        }
    }

    closeAllMenus(): void {
        this.activeImageMenu = null;
    }

    // Drag and drop file upload handlers
    onDragOver(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();

        // Only set isDraggingOver if we're dragging files, not images for reordering
        if (event.dataTransfer?.types.includes('Files')) {
            this.isDraggingOver = true;
        }
    }

    onDragLeave(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.isDraggingOver = false;
    }

    onDrop(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.isDraggingOver = false;

        const files = event.dataTransfer?.files;
        if (files && files.length > 0) {
            // Convert FileList to array for easier handling
            const fileArray = Array.from(files);
            this.uploadFiles(fileArray);
        }
    }

    // Fixed file input handling
    onFileInputClick(): void {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.multiple = true;
        fileInput.accept = 'image/*';

        fileInput.onchange = (event: Event) => {
            const input = event.target as HTMLInputElement;
            if (input.files && input.files.length > 0) {
                // Convert FileList to array for easier handling
                const fileArray = Array.from(input.files);
                this.uploadFiles(fileArray);
            }
        };

        fileInput.click();
    }

    // Upload files to the API
    private uploadFiles(files: File[]): void {
        if (files.length === 0) return;

        this.isUploading = true;
        this.uploadProgress = 0;
        this.uploadErrors = [];

        // Filter only image files
        const imageFiles = files.filter(file => file.type.startsWith('image/'));
        if (imageFiles.length === 0) {
            this.isUploading = false;
            return;
        }

        // For multiple files, track uploads individually and update progress
        let completedUploads = 0;
        let successfulUploads: MediaItem[] = [];

        // Upload each file one by one
        const uploadNext = (index: number) => {
            if (index >= imageFiles.length) {
                // All uploads complete
                this.isUploading = false;

                // Add all successful uploads to gallery
                successfulUploads.forEach(mediaItem => {
                    this.addMediaItemToGallery(mediaItem);
                });

                this.updateMediaItems(); // Update parent component
                return;
            }

            const file = imageFiles[index];
            this.mediaService.uploadFile(file)
                .pipe(
                    finalize(() => {
                        completedUploads++;
                        this.uploadProgress = Math.round((completedUploads / imageFiles.length) * 100);

                        // Process next file
                        uploadNext(index + 1);
                    })
                )
                .subscribe({
                    next: (event) => {
                        if (event.type === HttpEventType.Response) {
                            // Upload completed successfully
                            const mediaItem = event.body as MediaItem;
                            successfulUploads.push(mediaItem);
                        }
                    },
                    error: (err) => {
                        console.error(`Error uploading file ${file.name}:`, err);
                        this.uploadErrors.push(`Failed to upload ${file.name}`);
                    }
                });
        };

        // Start uploading the first file
        uploadNext(0);
    }

    // Add a new MediaItem to the gallery
    private addMediaItemToGallery(mediaItem: MediaItem): void {
        const isPrimary = this.galleryImages.length === 0; // Make primary if it's the first image

        this.galleryImages.push({
            id: mediaItem.id,
            name: mediaItem.filename,
            url: mediaItem.filePath,
            originalItem: mediaItem,
            isPrimary: isPrimary
        });
    }

    downloadImage(imageId: string): void {
        const image = this.galleryImages.find(img => img.id === imageId);
        if (image) {
            const link = document.createElement('a');
            link.href = 'https://127.0.0.1:8002' + image.url;
            link.download = image.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        this.closeAllMenus();
    }

    deleteImage(imageId: string): void {
        const index = this.galleryImages.findIndex(img => img.id === imageId);
        if (index !== -1) {
            // Check if deleting primary image
            const isPrimary = this.galleryImages[index].isPrimary;
            const mediaItem = this.galleryImages[index].originalItem;

            // Remove the image from the gallery
            this.galleryImages.splice(index, 1);

            // If it was primary, set the first remaining image as primary
            if (isPrimary && this.galleryImages.length > 0) {
                this.galleryImages[0].isPrimary = true;
            }

            // Optional: Delete from server if needed
            // Uncomment this section if you want to delete the file from the server
            /*
            this.mediaService.deleteMediaItem(mediaItem.id).subscribe({
                next: () => {
                    console.log('Media item deleted from server');
                },
                error: (err) => {
                    console.error('Error deleting media item from server:', err);
                }
            });
            */

            this.updateMediaItems(); // Update parent component
        }
        this.closeAllMenus();
    }

    makePrimary(imageId: string): void {
        // First, remove primary from all images
        this.galleryImages.forEach(img => {
            img.isPrimary = false;
        });

        // Then set the selected image as primary
        const image = this.galleryImages.find(img => img.id === imageId);
        if (image) {
            image.isPrimary = true;
            this.updateMediaItems(); // Update parent component with new primary image
        }
        this.closeAllMenus();
    }

    // Enhanced drag and drop functionality for reordering images
    dragStart(event: DragEvent, index: number): void {
        if (event.dataTransfer) {
            // Set the data for reordering
            event.dataTransfer.setData('text/plain', index.toString());
            // Set flag for image dragging
            this.isDraggingImage = true;

            // Store the dragged image ID
            if (this.galleryImages[index]) {
                this.draggedImageId = this.galleryImages[index].id;
            }

            // Add a custom class to the dragged element for styling
            const element = event.target as HTMLElement;
            if (element) {
                setTimeout(() => {
                    element.classList.add('image-gallery__item--dragging');
                }, 0);
            }
        }
    }

    dragEnd(event: DragEvent): void {
        this.isDraggingImage = false;
        this.draggedImageId = null;
        this.dropTargetImageId = null;

        // Remove dragging class from all items
        const dragItems = document.querySelectorAll('.image-gallery__item');
        dragItems.forEach(item => {
            item.classList.remove('image-gallery__item--dragging');
            item.classList.remove('image-gallery__item--drop-target');
        });
    }

    dragEnter(event: DragEvent, imageId: string): void {
        if (this.isDraggingImage && this.draggedImageId !== imageId) {
            this.dropTargetImageId = imageId;

            // Highlight the drop target
            const element = event.currentTarget as HTMLElement;
            if (element) {
                element.classList.add('image-gallery__item--drop-target');
            }
        }
    }

    dragLeave(event: DragEvent): void {
        const element = event.currentTarget as HTMLElement;
        if (element) {
            element.classList.remove('image-gallery__item--drop-target');
        }
        this.dropTargetImageId = null;
    }

    allowDrop(event: DragEvent): void {
        event.preventDefault();
    }

    drop(event: DragEvent, dropIndex: number): void {
        event.preventDefault();
        const dragIndex = Number(event.dataTransfer?.getData('text/plain'));

        if (!isNaN(dragIndex) && dragIndex !== dropIndex) {
            const item = this.galleryImages[dragIndex];
            this.galleryImages.splice(dragIndex, 1);
            this.galleryImages.splice(dropIndex, 0, item);

            this.updateMediaItems(); // Update parent component after reordering
        }

        // Reset all drag states
        this.isDraggingImage = false;
        this.draggedImageId = null;
        this.dropTargetImageId = null;

        // Remove all drag-related classes
        const dragItems = document.querySelectorAll('.image-gallery__item');
        dragItems.forEach(item => {
            item.classList.remove('image-gallery__item--dragging');
            item.classList.remove('image-gallery__item--drop-target');
        });
    }

    downloadAllImages(): void {
        this.galleryImages.forEach((image, index) => {
            const link = document.createElement('a');
            link.href = 'https://127.0.0.1:8002' + image.url;
            link.download = image.name;
            document.body.appendChild(link);

            // Use setTimeout to avoid browser blocking multiple downloads
            setTimeout(() => {
                link.click();
                document.body.removeChild(link);
            }, 100 * index); // Stagger downloads to avoid browser limitations
        });
    }

    deleteAllImages(): void {
        if (confirm('Are you sure you want to delete all images?')) {
            // Optional: Delete all images from server
            /*
            const deleteObservables = this.galleryImages.map(image =>
                this.mediaService.deleteMediaItem(image.originalItem.id)
            );

            forkJoin(deleteObservables).subscribe({
                next: () => {
                    console.log('All media items deleted from server');
                    this.galleryImages = [];
                    this.updateMediaItems();
                },
                error: (err) => {
                    console.error('Error deleting media items from server:', err);
                }
            });
            */

            // Just remove from UI if we're not deleting from server
            this.galleryImages = [];
            this.updateMediaItems(); // Update parent component
        }
    }

    startRenameImage(imageId: string): void {
        // Find the image and set isRenaming flag
        const image = this.galleryImages.find(img => img.id === imageId);
        if (image) {
            image.isRenaming = true;
            image.newName = image.name;
        }
        this.closeAllMenus();
    }

    saveImageRename(imageId: string, event?: Event): void {
        if (event) {
            event.preventDefault();
        }

        const image = this.galleryImages.find(img => img.id === imageId);
        if (image && image.newName && image.newName.trim() !== '') {
            image.name = image.newName;
            image.originalItem.filename = image.newName; // Update the original MediaItem
            image.isRenaming = false;

            // Optional: Update filename on server
            // This would require implementing a method in MediaService to update a MediaItem
            /*
            this.mediaService.updateMediaItem(image.originalItem.id, { filename: image.newName }).subscribe({
                next: (updatedItem) => {
                    console.log('Media item renamed successfully');
                },
                error: (err) => {
                    console.error('Error renaming media item:', err);
                }
            });
            */

            this.updateMediaItems(); // Update parent component
        } else if (image) {
            // If invalid name, revert back
            image.isRenaming = false;
        }
    }

    cancelImageRename(imageId: string): void {
        const image = this.galleryImages.find(img => img.id === imageId);
        if (image) {
            image.isRenaming = false;
        }
    }
}
