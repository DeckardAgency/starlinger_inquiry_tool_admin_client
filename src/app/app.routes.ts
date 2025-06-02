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
import { MachinesListComponent } from "@features/machines/list/machines-list.component";
import { MachinesNewComponent } from "@features/machines/new/machines-new.component";
import { MachinesEditComponent } from "@features/machines/edit/machines-edit.component";
import { OrderViewComponent } from "@features/orders/view/order-view.component";
import { AuthGuard } from "@core/auth/auth.guard";
import { AuthLayoutComponent } from "./layout/auth-layout.component";
import { MainLayoutComponent } from "./layout/main-layout.component";
import { RoleGuard } from "@core/auth/role.guard";
import {ClientsListComponent} from "@features/clients/list/clients-list.component";
import {UsersListComponent} from "@features/users/list/users-list.component";
import {ClientEditComponent} from "@features/clients/edit/client-edit.component";
import {ClientNewComponent} from "@features/clients/new/client-new.component";

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  // Auth routes with AuthLayoutComponent
  {
    path: '',
    component: AuthLayoutComponent,
    children: [
      {
        path: 'login',
        component: LoginComponent,
        title: 'Inquiry Tool | Login'
      }
    ]
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [AuthGuard, RoleGuard],
    children: [
      {
        path: 'dashboard',
        component: DashboardComponent,
        title: 'Inquiry Tool | Dashboard'
      },
      {
        path: 'clients/list',
        component: ClientsListComponent,
        title: 'Inquiry Tool | Clients List'
      },
      {
        path: 'clients/new',
        component: ClientNewComponent,
        title: 'Inquiry Tool | Clients New'
      },
      {
        path: 'clients/:id/edit',
        component: ClientEditComponent,
        title: 'Inquiry Tool | Clients Edit'
      },
      {
        path: 'accounts/list',
        component: AccountsListComponent,
        title: 'Inquiry Tool | Accounts List'
      },
      {
        path: 'accounts/new',
        component: AccountsNewComponent,
        title: 'Inquiry Tool | Accounts List'
      },
      {
        path: 'accounts/edit/:id',
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
        path: 'orders/:id/view',
        component: OrderViewComponent,
        title: 'Inquiry Tool | Orders View'
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
      {
        path: 'users/list',
        component: UsersListComponent,
        title: 'Inquiry Tool | Users List'
      },
    ]
  }
];
