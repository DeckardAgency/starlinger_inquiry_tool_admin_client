import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ProductService } from "../../../services/product.service";
import { Product } from '../../../interfaces/product.interface';
import {animate, state, style, transition, trigger} from "@angular/animations";

@Component({
    selector: 'app-shipment-view',
    standalone: true,
    templateUrl: './shipment-view.component.html',
    styleUrls: ['./shipment-view.component.scss'],
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    animations: [
        trigger('tabAnimation', [
            state('void', style({ opacity: 0 })),
            state('*', style({ opacity: 1 })),
            transition('void <=> *', animate('300ms ease-in-out')),
            transition('* <=> *', animate('300ms ease-in-out'))
        ])
    ]
})
export class ShipmentViewComponent implements OnInit {
    activeTab: string = 'general';

    ngOnInit(): void {
        this.setActiveTab('general');
    }

    setActiveTab(tabId: 'general' | 'advanced'): void {
        this.activeTab = tabId;
    }

    isTabActive(tabId: string): boolean {
        return this.activeTab === tabId;
    }
}
