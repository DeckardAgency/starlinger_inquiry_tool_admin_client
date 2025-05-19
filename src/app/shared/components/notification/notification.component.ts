import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { trigger, state, style, transition, animate } from '@angular/animations';
import {NotificationService, Notification } from "@services/notification.service";

@Component({
    selector: 'app-notification',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './notification.component.html',
    styleUrls: ['./notification.component.scss'],
    animations: [
        trigger('toastAnimation', [
            // Toast enters from the right
            transition(':enter', [
                style({ transform: 'translateX(100%)', opacity: 0 }),
                animate('300ms ease-out', style({ transform: 'translateX(0)', opacity: 1 }))
            ]),
            // Toast exits by fading out and sliding down slightly
            transition(':leave', [
                animate('200ms ease-in', style({ opacity: 0, transform: 'translateY(10px)' }))
            ])
        ])
    ]
})
export class NotificationComponent implements OnInit, OnDestroy {
    activeNotifications: Array<{ id: number; notification: Notification }> = [];
    private subscription!: Subscription;
    private lastId = 0;

    constructor(private notificationService: NotificationService) {}

    ngOnInit(): void {
        this.subscription = this.notificationService.notifications$.subscribe(notification => {
            this.showNotification(notification);
        });
    }

    ngOnDestroy(): void {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }

    private showNotification(notification: Notification): void {
        const id = ++this.lastId;

        // Add the notification to the active list
        this.activeNotifications.push({ id, notification });

        // Remove the notification after the specified duration
        setTimeout(() => {
            this.removeNotification(id);
        }, notification.duration || 3000);
    }

    removeNotification(id: number): void {
        const index = this.activeNotifications.findIndex(item => item.id === id);
        if (index !== -1) {
            this.activeNotifications.splice(index, 1);
        }
    }

    getIconClass(type: string): string {
        switch (type) {
            case 'success': return 'notification__icon--success';
            case 'error': return 'notification__icon--error';
            case 'warning': return 'notification__icon--warning';
            case 'info': return 'notification__icon--info';
            default: return 'notification__icon--info';
        }
    }
}
