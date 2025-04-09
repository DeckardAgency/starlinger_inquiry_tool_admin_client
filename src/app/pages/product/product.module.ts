import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ProductComponent } from './product.component';
import { ProductListingComponent } from "./product-listing/product-listing.component";
import { ProductNewComponent } from "./product-new/product-new.component";
import { ProductEditComponent } from "./product-edit/product-edit.component";

@NgModule({
  declarations: [ProductComponent],
  imports: [
    CommonModule,
    RouterModule.forChild([
      {
        path: 'list',
        component: ProductListingComponent,
      },
      {
        path: 'new',
        component: ProductNewComponent,
      },
      {
        path: ':id/edit',
        component: ProductEditComponent,
      },
    ]),
  ],
})
export class ProductModule {}
