// contacts-list.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {BreadcrumbsComponent} from "@shared/components/ui/breadcrumbs/breadcrumbs.component";

interface Contact {
    id: string;
    firstName: string;
    lastName: string;
    account: string;
    email: string;
    phone: string;
}

@Component({
    selector: 'app-contacts-list',
    imports: [CommonModule, BreadcrumbsComponent],
    templateUrl: './contacts-list.component.html',
    styleUrls: ['./contacts-list.component.scss']
})
export class ContactsListComponent implements OnInit {
    breadcrumbs = [
        { label: 'Accounts' }
    ];
    contacts: Contact[] = [];
    showOptions: boolean = false;
    selectedContactId: string | null = null;

    constructor(private router: Router) {}

    ngOnInit(): void {
        this.loadMockData();
    }

    loadMockData(): void {
        this.contacts = [
            { id: '147144', firstName: 'Alexander', lastName: 'Pas', account: 'Alexander Pas', email: 'grafit.pas@grafit.net', phone: '-' },
            { id: '147145', firstName: 'Anja', lastName: 'Makas', account: 'Kuga Repora SL', email: 'emanuel@company.com', phone: '-' },
            { id: '147146', firstName: 'Paola', lastName: 'Alvarez', account: 'PET Recycling team Gmbh', email: 'eroghan@company.com', phone: '+34942835040' },
            { id: '147147', firstName: 'Christian', lastName: 'Jovanovic', account: 'Unistrap Gmbh', email: 'linda@company.com', phone: '+4366488903488' },
            { id: '147148', firstName: 'Christopher', lastName: 'Cenga', account: 'Rymoplast n.v.', email: 'allen@company.com', phone: '+4366460595847' },
            { id: '147149', firstName: 'David', lastName: 'Aerts', account: 'Unistrap Gmbh', email: 'dupton@company.com', phone: '098123456' },
            { id: '147160', firstName: 'Davor', lastName: 'Kemper', account: 'PET Recycling team', email: 'marissa@company.com', phone: '-' },
            { id: '147166', firstName: 'Erika', lastName: 'Gutierrez', account: 'Rymoplast n.v.', email: 'jason@company.com', phone: '-' },
            { id: '147142', firstName: 'Francesco', lastName: 'Lissak', account: 'Kuga Repora SL', email: 'carmen@company.com', phone: '0048533734241' },
            { id: '147131', firstName: 'Irfan', lastName: 'Nussbaumer', account: 'Kuga Repora SL', email: 'thomas@company.com', phone: '+32470595840' },
            { id: '147155', firstName: 'Lander', lastName: 'Dekkers', account: 'Unistrap Gmbh', email: 'natalie@company.com', phone: '-' },
            { id: '147189', firstName: 'Nancy', lastName: 'Roth', account: 'PET Recycling team Gmbh', email: 'paul@company.com', phone: '-' }
        ];
    }

    toggleOptions(contactId: string): void {
        if (this.selectedContactId === contactId) {
            this.showOptions = !this.showOptions;
        } else {
            this.selectedContactId = contactId;
            this.showOptions = true;
        }
    }

    editContact(id: string): void {
        console.log('Edit contact with ID:', id);
        this.showOptions = false;
    }

    deleteContact(id: string): void {
        console.log('Delete contact with ID:', id);
        this.showOptions = false;
    }

    addContact(): void {
        this.router.navigate(['/contacts/new']);
    }

    getResultsText(): string {
        return `Showing 1 to ${this.contacts.length} from ${this.contacts.length} results`;
    }
}
