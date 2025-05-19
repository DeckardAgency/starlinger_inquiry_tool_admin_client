import { Component, OnInit } from '@angular/core';
import { SearchComponent } from '@shared/components/ui/search/search.component';

@Component({
  selector: 'app-top-bar',
  standalone: true,
  imports: [ SearchComponent ],
  templateUrl: './top-bar.component.html',
  styleUrls: ['./top-bar.component.scss']
})
export class TopBarComponent implements OnInit {
  constructor() {}

  ngOnInit(): void {}
}
