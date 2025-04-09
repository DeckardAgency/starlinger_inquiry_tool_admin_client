import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { InvoiceComponent } from './invoice.component';
import { InvoiceListingComponent } from "./invoice-listing/invoice-listing.component";
import { InvoiceViewComponent } from "./invoice-view/invoice-view.component";

@NgModule({
  declarations: [InvoiceComponent],
  imports: [
    CommonModule,
    RouterModule.forChild([
      {
        path: 'list',
        component: InvoiceListingComponent,
      },
      {
        path: ':id/view',
        component: InvoiceViewComponent,
      },
    ]),
  ],
})
export class InvoiceModule {}
