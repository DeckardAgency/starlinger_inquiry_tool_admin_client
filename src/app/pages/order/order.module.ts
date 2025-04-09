import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { OrderComponent } from './order.component';
import { OrderListingComponent } from "./order-listing/order-listing.component";
import { OrderNewComponent } from "./order-new/order-new.component";
import { OrderEditComponent } from "./order-edit/order-edit.component";
import {OrderViewComponent} from "./order-view/order-view.component";

@NgModule({
  declarations: [OrderComponent],
  imports: [
    CommonModule,
    RouterModule.forChild([
      {
        path: 'list',
        component: OrderListingComponent,
      },
      {
        path: 'new',
        component: OrderNewComponent,
      },
      {
        path: ':id/edit',
        component: OrderEditComponent,
      },
      {
        path: ':id/view',
        component: OrderViewComponent,
      },
    ]),
  ],
})
export class OrderModule {}
