// manual-entry-list.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {BreadcrumbsComponent} from "@shared/components/ui/breadcrumbs/breadcrumbs.component";

interface ManualEntry {
    id: string;
    type: string;
    dateCreated: string;
    internalReference: string;
    customer: {
        initials: string;
        name: string;
        hasPhoto?: boolean;
    };
    partsOrdered: number;
    status: 'Completed' | 'Cancelled' | 'Rejected' | 'Archived';
}

@Component({
    selector: 'app-manual-entry-list',
    standalone: true,
    imports: [CommonModule, BreadcrumbsComponent],
    templateUrl: './manual-entry-list.component.html',
    styleUrls: ['./manual-entry-list.component.scss']
})
export class ManualEntryListComponent implements OnInit {
    breadcrumbs = [
        { label: 'Manual entry' }
    ];
    entries: ManualEntry[] = [];
    showOptions: boolean = false;
    selectedEntryId: string | null = null;
    currentPage: number = 1;
    totalPages: number = 3;
    activeTab: 'all' | 'completed' | 'cancelled' | 'rejected' | 'archived' = 'all';
    totalEntries: number = 192;

    constructor(private router: Router) {}

    ngOnInit(): void {
        this.loadMockData();
    }

    loadMockData(): void {
        this.entries = [
            { id: '0001', type: 'Inquiry', dateCreated: '14-03-2024', internalReference: '000123-ABC', customer: { initials: 'AK', name: 'Anes Kapetanovic' }, partsOrdered: 12, status: 'Completed' },
            { id: '0002', type: 'Inquiry', dateCreated: '14-03-2024', internalReference: '000987-EAD', customer: { initials: 'AK', name: 'Anes Kapetanovic' }, partsOrdered: 192, status: 'Completed' },
            { id: '0003', type: 'Inquiry', dateCreated: '14-03-2024', internalReference: '004231-UGR', customer: { initials: 'ME', name: 'Martin Ertl' }, partsOrdered: 48, status: 'Archived' },
            { id: '0004', type: 'Inquiry', dateCreated: '14-03-2024', internalReference: '001456-ZXY', customer: { initials: 'ME', name: 'Martin Ertl' }, partsOrdered: 36, status: 'Rejected' },
            { id: '0005', type: 'Inquiry', dateCreated: '14-03-2024', internalReference: '002789-WPQ', customer: { initials: 'AK', name: 'Anes Kapetanovic', hasPhoto: true }, partsOrdered: 24, status: 'Cancelled' },
            { id: '0006', type: 'Inquiry', dateCreated: '14-03-2024', internalReference: '005678-MNB', customer: { initials: 'AK', name: 'Anes Kapetanovic' }, partsOrdered: 60, status: 'Completed' },
            { id: '0007', type: 'Inquiry', dateCreated: '14-03-2024', internalReference: '003234-LJK', customer: { initials: 'IJ', name: 'Ivan Jozic' }, partsOrdered: 72, status: 'Completed' },
            { id: '0008', type: 'Inquiry', dateCreated: '14-03-2024', internalReference: '007890-QWE', customer: { initials: 'MK', name: 'Mira Kulic' }, partsOrdered: 15, status: 'Completed' },
            { id: '0009', type: 'Inquiry', dateCreated: '14-03-2024', internalReference: '009876-RYT', customer: { initials: 'SL', name: 'Sofia Lichtenstein' }, partsOrdered: 84, status: 'Completed' },
            { id: '0010', type: 'Inquiry', dateCreated: '14-03-2024', internalReference: '006543-PLM', customer: { initials: 'TB', name: 'Tommy Barlow' }, partsOrdered: 30, status: 'Archived' },
            { id: '0011', type: 'Inquiry', dateCreated: '14-03-2024', internalReference: '008765-VBN', customer: { initials: 'YN', name: 'Yara Nasr' }, partsOrdered: 99, status: 'Rejected' },
            { id: '0012', type: 'Inquiry', dateCreated: '14-03-2024', internalReference: '010101-XYZ', customer: { initials: 'DP', name: 'Diana Patel' }, partsOrdered: 57, status: 'Completed' },
            { id: '0013', type: 'Inquiry', dateCreated: '14-03-2024', internalReference: '011213-ABC', customer: { initials: 'RL', name: 'Roger Lee' }, partsOrdered: 81, status: 'Completed' },
            { id: '0014', type: 'Inquiry', dateCreated: '14-03-2024', internalReference: '012345-DEF', customer: { initials: 'SW', name: 'Sara Wong' }, partsOrdered: 40, status: 'Archived' },
            { id: '0015', type: 'Inquiry', dateCreated: '14-03-2024', internalReference: '013456-GHI', customer: { initials: 'JM', name: 'Jack Monroe' }, partsOrdered: 22, status: 'Rejected' },
            { id: '0016', type: 'Inquiry', dateCreated: '14-03-2024', internalReference: '014567-JKL', customer: { initials: 'CT', name: 'Clara Thompson' }, partsOrdered: 66, status: 'Cancelled' },
            { id: '0017', type: 'Inquiry', dateCreated: '14-03-2024', internalReference: '015678-MNO', customer: { initials: 'ZN', name: 'Zara Nguyen' }, partsOrdered: 3, status: 'Completed' }
        ];
    }

    toggleOptions(entryId: string): void {
        if (this.selectedEntryId === entryId) {
            this.showOptions = !this.showOptions;
        } else {
            this.selectedEntryId = entryId;
            this.showOptions = true;
        }
    }

    setActiveTab(tab: 'all' | 'completed' | 'cancelled' | 'rejected' | 'archived'): void {
        this.activeTab = tab;
    }

    filteredEntries(): ManualEntry[] {
        if (this.activeTab === 'all') {
            return this.entries;
        }
        return this.entries.filter(entry =>
            entry.status.toLowerCase() === this.activeTab.toLowerCase()
        );
    }

    changePage(page: number): void {
        this.currentPage = page;
    }

    nextPage(): void {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
        }
    }

    getResultsText(): string {
        return `Showing 1 to 13 from 13 results`;
    }
}
