import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MediaItem } from '@models/media.model';
import { MediaService } from '@services/http/media.service';
import { HttpEventType } from '@angular/common/http';
import { finalize } from 'rxjs/operators';

@Component({
    selector: 'app-product-featured-image',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './product-featured-image.component.html',
    styleUrls: ['./product-featured-image.component.scss']
})
export class ProductFeaturedImageComponent implements OnInit {
    @Input() featuredImage: MediaItem | null = null;
    @Output() featuredImageChange = new EventEmitter<MediaItem | null>();

    isUploading = false;
    uploadProgress = 0;
    isDraggingOver = false;
    imageUrl: string | null = null;
    uploadError: string | null = null;

    constructor(private mediaService: MediaService) {}

    ngOnInit(): void {
        // Set the image URL if a featured image exists
        this.updateImageUrl();
    }

    private updateImageUrl(): void {
        if (this.featuredImage) {
            // Check if featuredImage is a string (IRI) or an object
            if (typeof this.featuredImage === 'string') {
                // Handle IRI case - we would need to fetch the actual media item
                // This would depend on your API structure
                console.log('Featured image is an IRI:', this.featuredImage);
                this.imageUrl = null;
            } else {
                // Handle object case - use the filePath property
                this.imageUrl = this.featuredImage.filePath
                    ? 'https://127.0.0.1:8002' + this.featuredImage.filePath
                    : null;
            }
        } else {
            this.imageUrl = null;
        }
    }

    onFileInputClick(): void {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';

        fileInput.onchange = (event: Event) => {
            const input = event.target as HTMLInputElement;
            if (input.files && input.files.length > 0) {
                this.uploadFile(input.files[0]);
            }
        };

        fileInput.click();
    }

    // Drag and drop handlers
    onDragOver(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.isDraggingOver = true;
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
            // Get only the first dropped file, as featured image is a single image
            this.uploadFile(files[0]);
        }
    }

    uploadFile(file: File): void {
        // Reset upload status
        this.isUploading = true;
        this.uploadProgress = 0;
        this.uploadError = null;

        // Upload the file using the MediaService
        this.mediaService.uploadFile(file)
            .pipe(
                finalize(() => {
                    this.isUploading = false;
                })
            )
            .subscribe({
                next: (event) => {
                    if (event.type === HttpEventType.UploadProgress && event.total) {
                        // Calculate and update progress percentage
                        this.uploadProgress = Math.round(100 * event.loaded / event.total);
                    } else if (event.type === HttpEventType.Response) {
                        // Upload completed, get the response data
                        const mediaItem = event.body as MediaItem;

                        // Update the featured image and notify parent component
                        this.featuredImage = mediaItem;
                        this.featuredImageChange.emit(mediaItem);

                        // Update the image URL
                        this.updateImageUrl();
                    }
                },
                error: (err) => {
                    console.error('Error uploading file:', err);
                    this.uploadError = 'Failed to upload image. Please try again.';
                }
            });
    }

    removeFeaturedImage(): void {
        this.featuredImage = null;
        this.imageUrl = null;
        this.featuredImageChange.emit(null);
    }
}
