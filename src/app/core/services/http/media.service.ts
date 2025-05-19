import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MediaItem } from '@models/media.model';

@Injectable({
    providedIn: 'root'
})
export class MediaService {
    private apiUrl = 'https://127.0.0.1:8002/api/v1/media_items';
    private httpOptions = {
        headers: new HttpHeaders({
            'Accept': 'application/ld+json'
        })
    };

    constructor(private http: HttpClient) {}

    /**
     * Upload a file to the media API
     * @param file The file to upload
     * @returns An Observable that emits HTTP events for tracking progress
     */
    uploadFile(file: File): Observable<HttpEvent<MediaItem>> {
        // Create form data for the file upload
        const formData = new FormData();
        formData.append('file', file);

        // For file uploads, we don't set Content-Type because the browser will
        // automatically set the correct multipart/form-data Content-Type with boundary
        return this.http.post<MediaItem>(this.apiUrl, formData, {
            headers: this.httpOptions.headers,
            reportProgress: true,
            observe: 'events'
        });
    }

    /**
     * Get a single media item by ID
     * @param id The ID of the media item to get
     * @returns An Observable that emits the media item
     */
    getMediaItem(id: string): Observable<MediaItem> {
        return this.http.get<MediaItem>(`${this.apiUrl}/${id}`, this.httpOptions);
    }

    /**
     * Delete a media item
     * @param id The ID of the media item to delete
     * @returns An Observable that emits the response
     */
    deleteMediaItem(id: string): Observable<any> {
        return this.http.delete<any>(`${this.apiUrl}/${id}`, this.httpOptions);
    }

    /**
     * Get a collection of media items
     * @returns An Observable that emits the collection response
     */
    getMediaItems(): Observable<any> {
        return this.http.get<any>(this.apiUrl, this.httpOptions);
    }
}
