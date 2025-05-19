import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { animate, style, transition, trigger } from '@angular/animations';

export interface Inquiry {
  id: string;
  machine?: string;
  dateCreated: string;
  partsOrdered: number;
  status: string;
  internalReference?: string;
}

@Component({
  selector: 'app-inquiry-card',
  templateUrl: './inquiry-card.component.html',
  styleUrls: ['./inquiry-card.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('400ms ease-out', style({ opacity: 1 }))
      ])
    ])
  ]
})
export class InquiryCardComponent {
  @Input() inquiry!: Inquiry;
}
