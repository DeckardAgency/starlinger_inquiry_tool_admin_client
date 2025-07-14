import {
    Component,
    OnInit,
    Input,
    Output,
    EventEmitter,
    OnChanges,
    SimpleChanges,
    ChangeDetectionStrategy,
    DestroyRef,
    inject,
    TrackByFunction,
    ViewChild,
    ElementRef
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MediaItem } from '@models/media.model';
import { MediaService } from '@services/http/media.service';
import { HttpEventType } from '@angular/common/http';
import { finalize, forkJoin, Observable, of, Subject, debounceTime } from 'rxjs';
import {environment} from "@env/environment";

interface GalleryImage {
    id: string;
    name: string;
    url: string;
    originalItem: MediaItem;
    isPrimary?: boolean;
    isRenaming?: boolean;
    newName?: string;
}

interface UploadProgress {
    total: number;
    completed: number;
    errors: string[];
}

@Component({
    selector: 'app-product-image-gallery',
    imports: [CommonModule, FormsModule],
    templateUrl: './product-image-gallery.component.html',
    styleUrls: ['./product-image-gallery.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductImageGalleryComponent implements OnInit, OnChanges {
    @Input() mediaItems: MediaItem[] = [];
    @Output() mediaItemsChange = new EventEmitter<MediaItem[]>();
    @Output() primaryImageChange = new EventEmitter<MediaItem>();

    @ViewChild('fileInput', { static: false }) fileInput?: ElementRef<HTMLInputElement>;

    private readonly destroyRef = inject(DestroyRef);
    private readonly dragLeaveSubject = new Subject<DragEvent>();

    galleryImages: GalleryImage[] = [];
    activeImageMenu: string | null = null;
    isUploading = false;
    isDraggingOver = false;
    isDraggingImage = false;
    draggedImageId: string | null = null;
    dropTargetImageId: string | null = null;
    uploadProgress: UploadProgress = { total: 0, completed: 0, errors: [] };

    // Memoized track by function for better performance
    readonly trackByImageId: TrackByFunction<GalleryImage> = (index, item) => item.id;

    // Accepted file types
    private readonly ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    constructor(private readonly mediaService: MediaService) {
        // Debounce drag leave events to prevent flickering
        this.dragLeaveSubject
            .pipe(
                debounceTime(100),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(() => {
                this.isDraggingOver = false;
            });
    }

    ngOnInit(): void {
        this.initializeGalleryImages();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['mediaItems'] && !changes['mediaItems'].firstChange) {
            this.initializeGalleryImages();
        }
    }

    private initializeGalleryImages(): void {
        if (!this.mediaItems?.length) {
            this.galleryImages = [];
            return;
        }

        this.galleryImages = this.mediaItems.map((item, index) => ({
            id: item.id || item['@id'] || `temp-${index}`,
            name: item.filename || `Image-${index + 1}`,
            url: item.filePath || '',
            originalItem: item,
            isPrimary: index === 0,
            isRenaming: false
        }));
    }

    private updateMediaItems(): void {
        const updatedMediaItems = this.galleryImages.map(image => image.originalItem);
        this.mediaItemsChange.emit(updatedMediaItems);

        const primaryImage = this.galleryImages.find(img => img.isPrimary);
        if (primaryImage) {
            this.primaryImageChange.emit(primaryImage.originalItem);
        }
    }

    toggleImageMenu(imageId: string): void {
        this.activeImageMenu = this.activeImageMenu === imageId ? null : imageId;
    }

    closeAllMenus(): void {
        this.activeImageMenu = null;
    }

    // Optimized drag and drop handlers
    onDragOver(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();

        if (this.hasFiles(event.dataTransfer)) {
            this.isDraggingOver = true;
        }
    }

    onDragLeave(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();

        // Use debounced subject to prevent flickering
        this.dragLeaveSubject.next(event);
    }

    onDrop(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.isDraggingOver = false;

        const files = event.dataTransfer?.files;
        if (files?.length) {
            this.uploadFiles(Array.from(files));
        }
    }

    onFileInputClick(): void {
        // Create a temporary file input for better control
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.multiple = true;
        fileInput.accept = this.ACCEPTED_TYPES.join(',');

        fileInput.addEventListener('change', (event) => {
            const input = event.target as HTMLInputElement;
            if (input.files?.length) {
                this.uploadFiles(Array.from(input.files));
            }
        });

        fileInput.click();
    }

    private hasFiles(dataTransfer: DataTransfer | null): boolean {
        return dataTransfer?.types.includes('Files') ?? false;
    }

    private validateFile(file: File): string | null {
        if (!this.ACCEPTED_TYPES.includes(file.type)) {
            return `${file.name}: Unsupported file type. Please use JPEG, PNG, GIF, or WebP.`;
        }

        if (file.size > this.MAX_FILE_SIZE) {
            return `${file.name}: File size exceeds 10MB limit.`;
        }

        return null;
    }

    private uploadFiles(files: File[]): void {
        if (!files.length) return;

        // Validate files first
        const validationErrors: string[] = [];
        const validFiles: File[] = [];

        files.forEach(file => {
            const error = this.validateFile(file);
            if (error) {
                validationErrors.push(error);
            } else {
                validFiles.push(file);
            }
        });

        if (!validFiles.length) {
            this.uploadProgress = { total: 0, completed: 0, errors: validationErrors };
            return;
        }

        this.isUploading = true;
        this.uploadProgress = {
            total: validFiles.length,
            completed: 0,
            errors: validationErrors
        };

        // Use concurrent uploads with limit
        this.uploadFilesConcurrently(validFiles, 3); // Max 3 concurrent uploads
    }

    private uploadFilesConcurrently(files: File[], concurrencyLimit: number): void {
        const successfulUploads: MediaItem[] = [];
        let activeUploads = 0;
        let fileIndex = 0;

        const processNext = () => {
            while (activeUploads < concurrencyLimit && fileIndex < files.length) {
                const file = files[fileIndex++];
                activeUploads++;

                this.mediaService.uploadFile(file)
                    .pipe(
                        finalize(() => {
                            activeUploads--;
                            this.uploadProgress.completed++;

                            if (this.uploadProgress.completed === this.uploadProgress.total) {
                                this.finalizeUpload(successfulUploads);
                            } else {
                                processNext(); // Process next file
                            }
                        }),
                        takeUntilDestroyed(this.destroyRef)
                    )
                    .subscribe({
                        next: (event) => {
                            if (event.type === HttpEventType.Response && event.body) {
                                successfulUploads.push(event.body as MediaItem);
                            }
                        },
                        error: (err) => {
                            console.error(`Upload failed for ${file.name}:`, err);
                            this.uploadProgress.errors.push(`Failed to upload ${file.name}`);
                        }
                    });
            }
        };

        processNext();
    }

    private finalizeUpload(successfulUploads: MediaItem[]): void {
        this.isUploading = false;

        successfulUploads.forEach(mediaItem => {
            this.addMediaItemToGallery(mediaItem);
        });

        if (successfulUploads.length > 0) {
            this.updateMediaItems();
        }
    }

    private addMediaItemToGallery(mediaItem: MediaItem): void {
        const isPrimary = this.galleryImages.length === 0;

        this.galleryImages.push({
            id: mediaItem.id,
            name: mediaItem.filename,
            url: mediaItem.filePath,
            originalItem: mediaItem,
            isPrimary
        });
    }

    downloadImage(imageId: string): void {
        const image = this.galleryImages.find(img => img.id === imageId);
        if (!image) return;

        // Use a more robust download approach
        fetch(`${environment.apiBaseUrl}${image.url}`)
            .then(response => response.blob())
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = image.name;
                link.target = '_blank'; // Open in new tab
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            })
            .catch(err => {
                console.error('Download failed:', err);
                // Fallback to direct link in new tab
                const imageUrl = `${environment.apiBaseUrl}${image.url}`;
                window.open(imageUrl, '_blank');
            });

        this.closeAllMenus();
    }

    deleteImage(imageId: string): void {
        const index = this.galleryImages.findIndex(img => img.id === imageId);
        if (index === -1) return;

        const isPrimary = this.galleryImages[index].isPrimary;
        this.galleryImages.splice(index, 1);

        // Set new primary if needed
        if (isPrimary && this.galleryImages.length > 0) {
            this.galleryImages[0].isPrimary = true;
        }

        this.updateMediaItems();
        this.closeAllMenus();
    }

    makePrimary(imageId: string): void {
        const targetImage = this.galleryImages.find(img => img.id === imageId);
        if (!targetImage) return;

        // Remove primary from all images and set new primary
        this.galleryImages.forEach(img => {
            img.isPrimary = img.id === imageId;
        });

        this.updateMediaItems();
        this.closeAllMenus();
    }

    // Optimized drag and drop for reordering
    dragStart(event: DragEvent, index: number): void {
        if (!event.dataTransfer || !this.galleryImages[index]) return;

        event.dataTransfer.setData('text/plain', index.toString());
        event.dataTransfer.effectAllowed = 'move';

        this.isDraggingImage = true;
        this.draggedImageId = this.galleryImages[index].id;

        // Use requestAnimationFrame for better performance
        requestAnimationFrame(() => {
            const element = event.target as HTMLElement;
            element?.classList.add('image-gallery__item--dragging');
        });
    }

    dragEnd(event: DragEvent): void {
        this.resetDragState();
    }

    dragEnter(event: DragEvent, imageId: string): void {
        if (this.isDraggingImage && this.draggedImageId !== imageId) {
            this.dropTargetImageId = imageId;
        }
    }

    dragLeave(event: DragEvent): void {
        // Only reset if leaving the actual item, not child elements
        if (!event.currentTarget || !event.relatedTarget) return;

        const currentTarget = event.currentTarget as HTMLElement;
        const relatedTarget = event.relatedTarget as HTMLElement;

        if (!currentTarget.contains(relatedTarget)) {
            this.dropTargetImageId = null;
        }
    }

    allowDrop(event: DragEvent): void {
        event.preventDefault();
    }

    drop(event: DragEvent, dropIndex: number): void {
        event.preventDefault();

        const dragIndex = Number(event.dataTransfer?.getData('text/plain'));
        if (isNaN(dragIndex) || dragIndex === dropIndex) {
            this.resetDragState();
            return;
        }

        // Perform the reorder
        const [draggedItem] = this.galleryImages.splice(dragIndex, 1);
        this.galleryImages.splice(dropIndex, 0, draggedItem);

        this.updateMediaItems();
        this.resetDragState();
    }

    private resetDragState(): void {
        this.isDraggingImage = false;
        this.draggedImageId = null;
        this.dropTargetImageId = null;

        // Clean up drag classes
        requestAnimationFrame(() => {
            document.querySelectorAll('.image-gallery__item--dragging, .image-gallery__item--drop-target')
                .forEach(el => {
                    el.classList.remove('image-gallery__item--dragging', 'image-gallery__item--drop-target');
                });
        });
    }

    downloadAllImages(): void {
        if (!this.galleryImages.length) return;

        // Open each image in a new tab with proper delay to avoid browser blocking
        this.galleryImages.forEach((image, index) => {
            setTimeout(() => {
                const imageUrl = `${environment.apiBaseUrl}${image.url}`;
                // Open each image in a new tab
                window.open(imageUrl, '_blank');
            }, index * 200); // 200ms delay between each tab opening
        });
    }

    async deleteAllImages(): Promise<void> {
        if (!confirm('Are you sure you want to delete all images?')) return;

        this.galleryImages = [];
        this.updateMediaItems();
    }

    startRenameImage(imageId: string): void {
        const image = this.galleryImages.find(img => img.id === imageId);
        if (image) {
            image.isRenaming = true;
            image.newName = image.name;

            // Focus the input after the view updates
            setTimeout(() => {
                const input = document.querySelector(`input[data-image-id="${imageId}"]`) as HTMLInputElement;
                input?.focus();
            });
        }
        this.closeAllMenus();
    }

    saveImageRename(imageId: string, event?: Event): void {
        event?.preventDefault();

        const image = this.galleryImages.find(img => img.id === imageId);
        if (!image?.newName?.trim()) {
            this.cancelImageRename(imageId);
            return;
        }

        image.name = image.newName.trim();
        image.originalItem.filename = image.name;
        image.isRenaming = false;

        this.updateMediaItems();
    }

    cancelImageRename(imageId: string): void {
        const image = this.galleryImages.find(img => img.id === imageId);
        if (image) {
            image.isRenaming = false;
            image.newName = undefined;
        }
    }

    // Getter for upload progress percentage
    get uploadProgressPercentage(): number {
        if (this.uploadProgress.total === 0) return 0;
        return Math.round((this.uploadProgress.completed / this.uploadProgress.total) * 100);
    }

    // Getter for has upload errors
    get hasUploadErrors(): boolean {
        return this.uploadProgress.errors.length > 0;
    }

    protected readonly environment = environment;
}
