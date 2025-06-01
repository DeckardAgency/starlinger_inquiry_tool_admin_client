import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MediaItem } from '@models/media.model';
import { MediaService } from '@services/http/media.service';
import { HttpEventType } from '@angular/common/http';
import { finalize, takeUntil } from 'rxjs/operators';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import {environment} from "@env/environment";

@Component({
    selector: 'app-product-featured-image',
    imports: [CommonModule],
    templateUrl: './product-featured-image.component.html',
    styleUrls: ['./product-featured-image.component.scss']
})
export class ProductFeaturedImageComponent implements OnInit, OnDestroy {
    @Input() featuredImage: MediaItem | null = null;
    @Output() featuredImageChange = new EventEmitter<MediaItem | null>();

    // Component state properties
    isUploading = false;
    uploadProgress = 0;
    isDraggingOver = false;
    imageUrl: SafeUrl | null = null;
    uploadError: string | null = null;
    maxFileSizeMB = 5; // 5MB file size limit

    // For unsubscribing from observables when the component is destroyed
    private destroy$ = new Subject<void>();

    constructor(
        private mediaService: MediaService,
        private sanitizer: DomSanitizer
    ) {}

    ngOnInit(): void {
        this.updateImageUrl();
    }

    ngOnDestroy(): void {
        // Clean up subscriptions to prevent memory leaks
        this.destroy$.next();
        this.destroy$.complete();
    }

    private updateImageUrl(): void {
        if (!this.featuredImage) {
            this.imageUrl = null;
            return;
        }

        // Check if the featuredImage is a string (IRI) or an object
        if (typeof this.featuredImage === 'string') {
            console.log('Featured image is an IRI:', this.featuredImage);
            this.imageUrl = null;
        } else if (this.featuredImage.filePath) {
            // Sanitize the URL to prevent XSS attacks
            const baseUrl = `${environment.apiBaseUrl}`;
            const fullUrl = baseUrl + this.featuredImage.filePath;
            this.imageUrl = this.sanitizer.bypassSecurityTrustUrl(fullUrl);
        } else {
            this.imageUrl = null;
        }
    }

    onFileInputClick(): void {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.ariaLabel = 'Select product featured image';

        fileInput.onchange = (event: Event) => {
            const input = event.target as HTMLInputElement;
            if (input.files && input.files.length > 0) {
                this.validateAndUploadFile(input.files[0]);
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
            this.validateAndUploadFile(files[0]);
        }
    }

    validateAndUploadFile(file: File): void {
        // Reset upload status
        this.uploadError = null;

        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            this.uploadError = 'Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.';
            return;
        }

        // Validate file size
        const maxSizeBytes = this.maxFileSizeMB * 1024 * 1024;
        if (file.size > maxSizeBytes) {
            this.uploadError = `File is too large. Maximum size is ${this.maxFileSizeMB}MB.`;
            return;
        }

        // All validations passed, upload file
        this.uploadFile(file);
    }

    uploadFile(file: File): void {
        // Start upload
        this.isUploading = true;
        this.uploadProgress = 0;

        // Upload the file using the MediaService
        this.mediaService.uploadFile(file)
            .pipe(
                takeUntil(this.destroy$),
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

                        // Update the featured image and notify a parent component
                        this.featuredImage = mediaItem;
                        this.featuredImageChange.emit(mediaItem);

                        // Update the image URL
                        this.updateImageUrl();
                    }
                },
                error: (err) => {
                    console.error('Error uploading file:', err);

                    // Provide more specific error messages based on error type
                    if (err.status === 413) {
                        this.uploadError = 'File is too large for the server. Please try a smaller image.';
                    } else if (err.status === 415) {
                        this.uploadError = 'File type not supported by the server.';
                    } else if (err.status === 401 || err.status === 403) {
                        this.uploadError = 'You don\'t have permission to upload this file.';
                    } else if (err.status >= 500) {
                        this.uploadError = 'Server error occurred. Please try again later.';
                    } else {
                        this.uploadError = 'Failed to upload image. Please try again.';
                    }
                }
            });
    }

    removeFeaturedImage(): void {
        this.featuredImage = null;
        this.imageUrl = null;
        this.featuredImageChange.emit(null);
    }
}
