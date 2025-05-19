import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  isCollapsed = signal<boolean>(false);

  toggleSidebar(): void {
    this.isCollapsed.update(value => !value);
  }
}
