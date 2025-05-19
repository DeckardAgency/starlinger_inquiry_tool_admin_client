import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MediaItem } from '@models/media.model';
import { HttpClient, HttpHeaders, HttpEventType } from '@angular/common/http';

@Component({
    selector: 'app-product-featured-image',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './product-featured-image.component.html',
    styleUrls: ['./product-featured-image.component.scss']
})
export class ProductFeaturedImageComponent implements OnChanges {
    @Input() featuredImage: MediaItem | null = null;
    @Output() featuredImageChange = new EventEmitter<MediaItem | null>();

    isDraggingOver = false;
    isUploading = false;
    uploadProgress = 0;
    apiUrl = 'https://127.0.0.1:8002/api/v1/media_items';

    constructor(private http: HttpClient) {}

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['featuredImage']) {
            console.log('Featured image changed in component:', this.featuredImage);
        }
    }

    onUploadButtonClick(): void {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';

        fileInput.onchange = (event: Event) => {
            const input = event.target as HTMLInputElement;
            if (input.files && input.files.length > 0) {
                this.uploadFeaturedImage(input.files[0]);
            }
        };

        fileInput.click();
    }

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
            // Get only the first file for featured image
            this.uploadFeaturedImage(files[0]);
        }
    }

    private uploadFeaturedImage(file: File): void {
        // Only process image files
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file (JPEG, PNG, GIF, etc).');
            return;
        }

        this.isUploading = true;
        this.uploadProgress = 0;

        // Create form data for the file upload
        const formData = new FormData();
        formData.append('file', file);

        // Set up the request with progress tracking
        this.http.post<MediaItem>(this.apiUrl, formData, {
            reportProgress: true,
            observe: 'events'
        }).subscribe({
            next: (event) => {
                if (event.type === HttpEventType.UploadProgress && event.total) {
                    this.uploadProgress = Math.round(100 * event.loaded / event.total);
                } else if (event.type === HttpEventType.Response) {
                    // When the upload is complete and we get a response
                    const mediaItem = event.body as MediaItem;
                    console.log('Upload successful:', mediaItem);

                    // Emit the new media item
                    this.featuredImageChange.emit(mediaItem);
                    this.isUploading = false;
                }
            },
            error: (error) => {
                console.error('Upload failed:', error);
                alert('Failed to upload image. Please try again.');
                this.isUploading = false;
            }
        });
    }

    getImageUrl(): string {
        if (this.featuredImage) {
            return 'https://127.0.0.1:8002/' + this.featuredImage.filePath || 'https://via.placeholder.com/400x300?text=No+Image';
        }
        return 'https://via.placeholder.com/400x300?text=No+Image';
    }

    removeFeaturedImage(): void {
        if (confirm('Are you sure you want to remove the featured image?')) {
            this.featuredImageChange.emit(null);
        }
    }
}
