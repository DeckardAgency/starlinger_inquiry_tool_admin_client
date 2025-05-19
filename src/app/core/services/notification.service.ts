import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

export interface Notification {
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    duration?: number;
}

@Injectable({
    providedIn: 'root'
})
export class NotificationService {
    private notificationSubject = new Subject<Notification>();
    notifications$: Observable<Notification> = this.notificationSubject.asObservable();

    constructor() {}

    /**
     * Show a success notification
     * @param message The message to display
     * @param duration How long to show the notification (in ms), defaults to 3000ms
     */
    success(message: string, duration: number = 3000): void {
        this.show({
            message,
            type: 'success',
            duration
        });
    }

    /**
     * Show an error notification
     * @param message The message to display
     * @param duration How long to show the notification (in ms), defaults to 5000ms
     */
    error(message: string, duration: number = 5000): void {
        this.show({
            message,
            type: 'error',
            duration
        });
    }

    /**
     * Show an info notification
     * @param message The message to display
     * @param duration How long to show the notification (in ms), defaults to 3000ms
     */
    info(message: string, duration: number = 3000): void {
        this.show({
            message,
            type: 'info',
            duration
        });
    }

    /**
     * Show a warning notification
     * @param message The message to display
     * @param duration How long to show the notification (in ms), defaults to 4000ms
     */
    warning(message: string, duration: number = 4000): void {
        this.show({
            message,
            type: 'warning',
            duration
        });
    }

    /**
     * Show a notification
     * @param notification The notification object to emit
     */
    private show(notification: Notification): void {
        this.notificationSubject.next(notification);
    }
}
