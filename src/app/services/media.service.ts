import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {MediaItem, MediaItemsResponse} from '../interfaces/mediaItems.interface';

@Injectable({
    providedIn: 'root'
})
export class MediaService {
    private apiUrl = 'https://127.0.0.1:8002/api/v1/media_items';

    constructor(private http: HttpClient) {}

    getMediaItems(): Observable<MediaItemsResponse> {
        return this.http.get<MediaItemsResponse>(`${this.apiUrl}?itemsPerPage=300`);
    }

    getMediaItem(id: string | null): Observable<MediaItem> {
        return this.http.get<MediaItem>(`${this.apiUrl}/${id}`);
    }

    createMediaItem(mediaItemData: FormData): Observable<MediaItem> {
        return this.http.post<MediaItem>(this.apiUrl, mediaItemData);
    }

    updateMediaItem(id: string, mediaItemData: FormData): Observable<MediaItem> {
        return this.http.put<MediaItem>(`${this.apiUrl}/${id}`, mediaItemData);
    }

    deleteMediaItem(id: string): Observable<any> {
        return this.http.delete<any>(`${this.apiUrl}/${id}`);
    }
}
