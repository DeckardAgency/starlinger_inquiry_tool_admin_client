import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PaymentComponent } from './payment.component';
import { PaymentListingComponent } from "./payment-listing/payment-listing.component";
import { PaymentViewComponent } from "./payment-view/payment-view.component";

@NgModule({
  declarations: [PaymentComponent],
  imports: [
    CommonModule,
    RouterModule.forChild([
      {
        path: 'list',
        component: PaymentListingComponent,
      },
      {
        path: ':id/view',
        component: PaymentViewComponent,
      },
    ]),
  ],
})
export class PaymentModule {}
