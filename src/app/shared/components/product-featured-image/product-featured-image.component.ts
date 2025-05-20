import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MediaItem } from '@models/media.model';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { finalize, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

const API_BASE_URL = 'https://127.0.0.1:8002';
const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/400x300?text=No+Image';

@Component({
    selector: 'app-product-featured-image',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './product-featured-image.component.html',
    styleUrls: ['./product-featured-image.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductFeaturedImageComponent implements OnChanges {
    @Input() featuredImage: MediaItem | null = null;
    @Output() featuredImageChange = new EventEmitter<MediaItem | null>();

    isDraggingOver = false;
    isUploading = false;
    uploadProgress = 0;
    readonly apiUrl = `${API_BASE_URL}/api/v1/media_items`;
    readonly acceptedFileTypes = 'image/jpeg, image/png, image/gif';

    constructor(private http: HttpClient) {}

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['featuredImage']) {
            console.log('Featured image changed in component:', this.featuredImage);
        }
    }

    onUploadButtonClick(): void {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = this.acceptedFileTypes;

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

    getImageUrl(): string {
        if (this.featuredImage) {
            return `${API_BASE_URL}/${this.featuredImage.filePath}` || PLACEHOLDER_IMAGE;
        }
        return PLACEHOLDER_IMAGE;
    }

    removeFeaturedImage(): void {
        if (confirm('Are you sure you want to remove the featured image?')) {
            this.featuredImageChange.emit(null);
        }
    }

    private uploadFeaturedImage(file: File): void {
        // Only process image files
        if (!this.isValidImageFile(file)) {
            this.showErrorMessage('Please upload an image file (JPEG, PNG, GIF, etc).');
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
        }).pipe(
            catchError(error => {
                console.error('Upload failed:', error);
                this.showErrorMessage('Failed to upload image. Please try again.');
                return throwError(() => error);
            }),
            finalize(() => {
                if (this.uploadProgress < 100) {
                    this.isUploading = false;
                }
            })
        ).subscribe(event => {
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
        });
    }

    private isValidImageFile(file: File): boolean {
        return file.type.startsWith('image/');
    }

    private showErrorMessage(message: string): void {
        alert(message); // In a real app, replace with a proper notification service
    }
}
