import { Component, OnInit } from '@angular/core';
import { SearchComponent } from '@shared/components/ui/search/search.component';
import { MobileMenuService } from '@services/mobile-menu.service';

@Component({
    selector: 'app-top-bar',
    imports: [SearchComponent],
    templateUrl: './top-bar.component.html',
    styleUrls: ['./top-bar.component.scss']
})
export class TopBarComponent implements OnInit {
    constructor(private mobileMenuService: MobileMenuService) {}

    ngOnInit(): void {}

    toggleMobileMenu(): void {
        this.mobileMenuService.toggle();
    }
}
