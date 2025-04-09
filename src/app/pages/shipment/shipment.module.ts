import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ShipmentComponent } from './shipment.component';
import { ShipmentListingComponent } from "./shipment-listing/shipment-listing.component";
import { ShipmentViewComponent } from "./shipment-view/shipment-view.component";

@NgModule({
  declarations: [ShipmentComponent],
  imports: [
    CommonModule,
    RouterModule.forChild([
      {
        path: 'list',
        component: ShipmentListingComponent,
      },
      {
        path: ':id/view',
        component: ShipmentViewComponent,
      },
    ]),
  ],
})
export class ShipmentModule {}
