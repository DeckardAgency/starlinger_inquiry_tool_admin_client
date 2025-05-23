import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PerformanceOverviewComponent } from "@shared/components/performance-overview/performance-overview.component";
import { InquiryTableComponent } from '@shared/components/inquiry-table/inquiry-table.component';
import { InquiryCardComponent, Inquiry } from '@shared/components/inquiry-card/inquiry-card.component';

interface InquiryHistory {
  id: string;
  machine: string;
  dateCreated: string;
  customer: {
    initials: string;
    name: string;
    image?: string;
  };
  partsOrdered: number;
  status: 'Completed' | 'Confirmed' | 'Processing' | 'Cancelled';
}

@Component({
    selector: 'app-dashboard',
    imports: [
        CommonModule,
        PerformanceOverviewComponent,
        InquiryTableComponent,
        InquiryCardComponent
    ],
    templateUrl: "dashboard.component.html",
    styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {
  breadcrumbs = [
    { label: 'Dashboard' }
  ];

  recentInquiries: InquiryHistory[] = [
    {
      id: 'INQ-001',
      machine: 'XR5000',
      dateCreated: '2025-05-01',
      customer: {
        initials: 'JD',
        name: 'John Doe'
      },
      partsOrdered: 3,
      status: 'Completed'
    },
    {
      id: 'INQ-002',
      machine: 'T8 Pro',
      dateCreated: '2025-05-03',
      customer: {
        initials: 'AS',
        name: 'Alice Smith',
        image: 'assets/images/avatars/alice.jpg'
      },
      partsOrdered: 5,
      status: 'Processing'
    },
    {
      id: 'INQ-003',
      machine: 'M3000',
      dateCreated: '2025-05-05',
      customer: {
        initials: 'RJ',
        name: 'Robert Johnson'
      },
      partsOrdered: 2,
      status: 'Confirmed'
    },
    {
      id: 'INQ-004',
      machine: 'XR5000',
      dateCreated: '2025-05-07',
      customer: {
        initials: 'EW',
        name: 'Emma Williams'
      },
      partsOrdered: 7,
      status: 'Cancelled'
    },
    {
      id: 'INQ-005',
      machine: 'T8 Pro',
      dateCreated: '2025-05-10',
      customer: {
        initials: 'MB',
        name: 'Michael Brown',
        image: 'assets/images/avatars/michael.jpg'
      },
      partsOrdered: 1,
      status: 'Processing'
    }
  ];

  loading = false;

  featuredInquiries: Inquiry[] = [
    {
      id: 'FI-001',
      dateCreated: '2025-05-01',
      partsOrdered: 4,
      status: 'pending',
      internalReference: 'REF-2025-001'
    },
    {
      id: 'FI-002',
      machine: 'M3500 Pro',
      dateCreated: '2025-05-05',
      partsOrdered: 7,
      status: 'processing',
      internalReference: 'REF-2025-002'
    },
    {
      id: 'FI-003',
      machine: 'T9000',
      dateCreated: '2025-05-08',
      partsOrdered: 2,
      status: 'shipped'
    }
  ];
}
