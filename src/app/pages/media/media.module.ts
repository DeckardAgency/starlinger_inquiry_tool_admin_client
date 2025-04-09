import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MediaComponent } from './media.component';
import { MediaListingComponent } from "./media-listing/media-listing.component";
import { MediaNewComponent } from "./media-new/media-new.component";
import { MediaEditComponent } from "./media-edit/media-edit.component";

@NgModule({
  declarations: [MediaComponent],
  imports: [
    CommonModule,
    RouterModule.forChild([
      {
        path: 'list',
        component: MediaListingComponent,
      },
      {
        path: 'new',
        component: MediaNewComponent,
      },
      {
        path: ':id/edit',
        component: MediaEditComponent,
      },
    ]),
  ],
})
export class MediaModule {}
