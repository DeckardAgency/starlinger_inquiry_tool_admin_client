// accounts-edit.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';

interface Contact {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    billing: boolean;
}

@Component({
    selector: 'app-accounts-edit',
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    templateUrl: './accounts-edit.component.html',
    styleUrls: ['./accounts-edit.component.scss']
})
export class AccountsEditComponent implements OnInit {
    accountForm!: FormGroup;
    isActive: boolean = true;
    isLegalEntity: boolean = true;
    activeTab: 'contacts' | 'addresses' | 'shop-orders' | 'manual-entries' | 'machines' = 'contacts';
    contacts: Contact[] = [];

    constructor(private fb: FormBuilder, private router: Router) {}

    ngOnInit(): void {
        this.initForm();
        this.loadMockData();
    }

    initForm(): void {
        this.accountForm = this.fb.group({
            // Basic information
            title: ['Company title', Validators.required],
            accountType: ['Customer', Validators.required],
            code: ['X012341AC', Validators.required],
            oib: ['PL7151954741', Validators.required],
            purchaseLimit: ['€ 15.000,00'],
            amountSpent: ['€ 200,00'],

            // Contact information
            phone: ['0048544735352'],
            otherPhone: ['-'],
            email: ['name@company.com'],
            otherEmail: ['-'],
            fax: ['-'],
            web: ['www.company.com']
        });
    }

    loadMockData(): void {
        // Mock contacts data
        this.contacts = [
            { id: '317330', fullName: 'Akpol Recykling Sp.z.o.o.', email: 'anes@company.com', phone: '004873057807', billing: true },
            { id: '317331', fullName: 'Alaxe Italia Recycling S.p.A.', email: 'emanuel@company.com', phone: '004873057807', billing: true },
            { id: '317332', fullName: 'Kugo Repara SL', email: 'eroghan@company.com', phone: '004873057807', billing: false }
        ];
    }

    toggleActive(): void {
        this.isActive = !this.isActive;
    }

    toggleLegalEntity(): void {
        this.isLegalEntity = !this.isLegalEntity;
    }

    changeTab(tab: 'contacts' | 'addresses' | 'shop-orders' | 'manual-entries' | 'machines'): void {
        this.activeTab = tab;
    }

    addContact(): void {
        console.log('Add new contact');
    }

    goBack(): void {
        this.router.navigate(['/accounts']);
    }

    saveAccount(): void {
        if (this.accountForm.valid) {
            console.log('Account saved', this.accountForm.value);
        } else {
            console.log('Form is invalid');
        }
    }

    saveAndContinue(): void {
        if (this.accountForm.valid) {
            console.log('Account saved and continuing', this.accountForm.value);
        } else {
            console.log('Form is invalid');
        }
    }
}
