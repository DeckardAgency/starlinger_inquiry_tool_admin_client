import { Routes } from '@angular/router';
import { LoginComponent } from '@features/login/login.component';
import { DashboardComponent } from '@features/dashboard/dashboard.component';
import { AccountsListComponent } from "@features/accounts/list/accounts-list.component";
import { AccountsEditComponent } from "@features/accounts/edit/accounts-edit.component";
import { AccountsNewComponent } from "@features/accounts/new/accounts-new.component";
import { ContactsListComponent } from "@features/contacts/list/contacts-list.component";
import { OrdersListComponent } from "@features/orders/list/orders-list.component";
import { ManualEntryListComponent } from "@features/manual-entry/list/manual-entry-list.component";
import { ProductsListComponent } from "@features/products/list/products-list.component";
import { ProductNewComponent } from "@features/products/new/product-new.component";
import { ProductEditComponent } from "@features/products/edit/product-edit.component";
import {MachinesListComponent} from "@features/machines/list/machines-list.component";
import {MachinesNewComponent} from "@features/machines/new/machines-new.component";
import {MachinesEditComponent} from "@features/machines/edit/machines-edit.component";

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'login',
    component: LoginComponent,
    title: 'Inquiry Tool | Login'
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    title: 'Inquiry Tool | Dashboard'
  },
  {
    path: 'accounts/list',
    component: AccountsListComponent,
    title: 'Inquiry Tool | Accounts List'
  },
  { path: 'accounts/new',
    component: AccountsNewComponent,
    title: 'Inquiry Tool | Accounts List'
  },
  { path: 'accounts/edit/:id',
    component: AccountsEditComponent,
    title: 'Inquiry Tool | Accounts List'
  },
  {
    path: 'contacts/list',
    component: ContactsListComponent,
    title: 'Inquiry Tool | Contacts List'
  },
  {
    path: 'orders/list',
    component: OrdersListComponent,
    title: 'Inquiry Tool | Orders List'
  },
  {
    path: 'manual-entry/list',
    component: ManualEntryListComponent,
    title: 'Inquiry Tool | Orders List'
  },
  {
    path: 'products/list',
    component: ProductsListComponent,
    title: 'Inquiry Tool | Orders List'
  },
  {
    path: 'products/new',
    component: ProductNewComponent,
    title: 'Inquiry Tool | Product New'
  },
  {
    path: 'products/:id/edit',
    component: ProductEditComponent,
    title: 'Inquiry Tool | Product New'
  },
  {
    path: 'machines/list',
    component: MachinesListComponent,
    title: 'Inquiry Tool | Machines List'
  },
  {
    path: 'machines/new',
    component: MachinesNewComponent,
    title: 'Inquiry Tool | Machine New'
  },
  {
    path: 'machines/:id/edit',
    component: MachinesEditComponent,
    title: 'Inquiry Tool | Machine New'
  },
];
