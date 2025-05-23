// accounts-list.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { registerLocaleData } from '@angular/common';
import localeHr from '@angular/common/locales/hr';
import {BreadcrumbsComponent} from "@shared/components/ui/breadcrumbs/breadcrumbs.component";

interface Account {
    id: string;
    code: string;
    oib: string;
    name: string;
    email: string;
    status: 'Active' | 'Inactive';
    purchaseLimit: number | string;
    amountSpent: number;
}

@Component({
    selector: 'app-accounts-list',
    imports: [CommonModule, BreadcrumbsComponent],
    templateUrl: './accounts-list.component.html',
    styleUrls: ['./accounts-list.component.scss']
})
export class AccountsListComponent implements OnInit {
    breadcrumbs = [
        { label: 'Accounts' }
    ];
    accounts: Account[] = [];
    showOptions: boolean = false;
    selectedAccountId: string | null = null;

    ngOnInit(): void {
        // Register Croatian locale
        registerLocaleData(localeHr);

        // Mock data to match the image
        this.accounts = [
            { id: '317330', code: '408170', oib: 'PL7151954741', name: 'Akpol Recykling Sp.z.o.o.', email: 'anes@company.com', status: 'Active', purchaseLimit: '', amountSpent: 0 },
            { id: '317331', code: '', oib: '1262330853', name: 'Alaxe Italia Recycling S.p.A.', email: 'emanuel@company.com', status: 'Active', purchaseLimit: '', amountSpent: 0 },
            { id: '317332', code: '542319', oib: 'ESAA3931358', name: 'Kugo Repara SL', email: 'eroghan@company.com', status: 'Inactive', purchaseLimit: 15000, amountSpent: 0 },
            { id: '317333', code: '693192', oib: 'ESAA4941362', name: 'OMT Recycling Project S.L.', email: 'linda@company.com', status: 'Inactive', purchaseLimit: 25000, amountSpent: 1500 },
            { id: '317334', code: '743123', oib: 'ATU72944977', name: 'PRT Rodomska', email: 'allen@company.com', status: 'Active', purchaseLimit: 0, amountSpent: 0 },
            { id: '317335', code: '852374', oib: 'BE043913824', name: 'Rymoplast n.v.', email: 'dupton@company.com', status: 'Inactive', purchaseLimit: 15000, amountSpent: 200 },
            { id: '317336', code: '912845', oib: 'PL7151954742', name: 'EcoCycle Solutions Inc.', email: 'marissa@company.com', status: 'Active', purchaseLimit: '', amountSpent: 0 },
            { id: '317337', code: '103672', oib: '1262330854', name: 'GreenTech Waste Management', email: 'jason@company.com', status: 'Active', purchaseLimit: '', amountSpent: 0 },
            { id: '317338', code: '114589', oib: 'ESAA3931359', name: 'Reclaim Innovations Ltd.', email: 'carmen@company.com', status: 'Inactive', purchaseLimit: 15000, amountSpent: 0 },
            { id: '317339', code: '125678', oib: 'ESAA4941363', name: 'Sustainable Materials Group', email: 'thomas@company.com', status: 'Inactive', purchaseLimit: 25000, amountSpent: 1500 },
            { id: '317340', code: '136789', oib: 'ATU72944978', name: 'TerraRenew Recycling Partners', email: 'natalie@company.com', status: 'Active', purchaseLimit: 0, amountSpent: 0 },
            { id: '317341', code: '147890', oib: 'BE043913825', name: 'WasteWise Environmental', email: 'paul@company.com', status: 'Inactive', purchaseLimit: '', amountSpent: 200 },
        ];
    }

    toggleOptions(accountId: string): void {
        if (this.selectedAccountId === accountId) {
            this.showOptions = !this.showOptions;
        } else {
            this.selectedAccountId = accountId;
            this.showOptions = true;
        }
    }

    editAccount(id: string): void {
        console.log('Edit account:', id);
        this.showOptions = false;
    }

    deleteAccount(id: string): void {
        console.log('Delete account:', id);
        this.showOptions = false;
    }

    formatCurrency(value: number): string {
        return value.toLocaleString('hr-HR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    getResultsText(): string {
        return `Showing 1 to ${this.accounts.length} from ${this.accounts.length} results`;
    }
}
