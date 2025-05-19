import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-inquiry-shimmer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inquiry-shimmer.component.html',
  styleUrls: ['./inquiry-shimmer.component.scss']
})
export class InquiryShimmerComponent {
  @Input() rows: number = 5;

  // Generate array of length 'rows' for ngFor
  get rowsArray(): number[] {
    return Array(this.rows).fill(0).map((_, i) => i);
  }
}
