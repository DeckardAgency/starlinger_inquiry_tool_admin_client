import { Component, OnInit, HostListener, ElementRef, Pipe, PipeTransform, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SearchResult } from '@core/models';

@Pipe({
  name: 'filterResults',
  standalone: true
})
export class FilterResultsPipe implements PipeTransform {
  transform(items: SearchResult[], searchQuery: string): SearchResult[] {
    if (!items) return [];
    if (!searchQuery || searchQuery.trim() === '') return items;

    const query = searchQuery.toLowerCase().trim();
    return items.filter(item => item.title.toLowerCase().includes(query));
  }
}

@Component({
    selector: 'app-search',
    imports: [CommonModule, FormsModule, FilterResultsPipe],
    templateUrl: './search.component.html',
    styleUrls: ['./search.component.scss']
})
export class SearchComponent implements OnInit {
  @ViewChild('searchInput') searchInput!: ElementRef;

  searchQuery: string = '';
  showResults: boolean = false;
  minSearchLength: number = 1;
  searchPlaceholder: string = '';

  mockResults: SearchResult[] = [
    { id: '1', title: 'AIVV-01152 Power Panel T30 4,3" WQVGA Colour Touch', type: 'Machine part', badge: 'Machine part', active: true },
    { id: '2', title: 'AIVV-01210 Power Panel T30 2,7" LCD Screen', type: 'Machine part', badge: 'Machine part' },
    { id: '3', title: 'AIVV-0120001 Power Panel T10 7,0" LED Screen', type: 'Machine part', badge: 'Machine part' },
    { id: '4', title: 'AIVV-01152-back.jpg', type: 'Photo', badge: 'Photo' },
    { id: '5', title: 'AIVV-01152-instructions.pdf', type: 'File', badge: 'File' },
    { id: '6', title: 'AIVV Machine name', type: 'Machine', badge: 'Machine' },
    { id: '7', title: 'Inquiry AIVV-2024', type: 'Order', badge: 'Order' }
  ];

  constructor(private router: Router, private elementRef: ElementRef) {
    this.setSearchPlaceholder();
  }

  ngOnInit(): void {}

  // Search functionality
  search(): void {
    if (this.searchQuery.trim().length >= this.minSearchLength) {
      const filteredResults = this.getFilteredResults();

      if (filteredResults.length > 0) {
        this.showResults = true;
        this.resetActiveStates();
        filteredResults[0].active = true;
      } else {
        this.showResults = false;
      }
    } else {
      this.showResults = false;
    }
  }

  selectResult(result: SearchResult): void {
    console.log('Selected:', result);
    this.showResults = false;
    // In a real app, navigate to the selected result
    // this.router.navigate(['/details', result.id]);
  }

  focusSearchInput(): void {
    if (this.searchInput?.nativeElement) {
      this.searchInput.nativeElement.focus();
    }
  }

  // Keyboard event handlers
  @HostListener('document:keydown', ['$event'])
  handleShortcut(event: KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault();
      this.focusSearchInput();
    }
  }

  @HostListener('document:keydown.arrowup', ['$event'])
  handleArrowUp(event: KeyboardEvent) {
    if (!this.showResults) return;

    event.preventDefault();
    const filteredResults = this.getFilteredResults();
    const currentIndex = filteredResults.findIndex(result => result.active);

    if (currentIndex > 0) {
      this.resetActiveStates();
      filteredResults[currentIndex - 1].active = true;
    }
  }

  @HostListener('document:keydown.arrowdown', ['$event'])
  handleArrowDown(event: KeyboardEvent) {
    if (!this.showResults) return;

    event.preventDefault();
    const filteredResults = this.getFilteredResults();
    const currentIndex = filteredResults.findIndex(result => result.active);

    if (currentIndex < filteredResults.length - 1) {
      this.resetActiveStates();
      filteredResults[currentIndex + 1].active = true;
    }
  }

  @HostListener('document:keydown.enter', ['$event'])
  handleEnterKey(event: KeyboardEvent) {
    if (!this.showResults) return;

    const activeResult = this.mockResults.find(result => result.active);
    if (activeResult) {
      this.selectResult(activeResult);
    } else {
      const filteredResults = this.getFilteredResults();
      if (filteredResults.length > 0) {
        this.selectResult(filteredResults[0]);
      }
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  handleEscapeKey(event: KeyboardEvent) {
    this.showResults = false;
  }

  @HostListener('document:click', ['$event'])
  handleClickOutside(event: Event) {
    const clickedInside = this.elementRef.nativeElement.contains(event.target);
    if (!clickedInside) {
      this.showResults = false;
    }
  }

  // Helper methods
  private getFilteredResults(): SearchResult[] {
    if (!this.searchQuery || this.searchQuery.trim() === '') return this.mockResults;

    const query = this.searchQuery.toLowerCase().trim();
    return this.mockResults.filter(item => item.title.toLowerCase().includes(query));
  }

  private resetActiveStates(): void {
    this.mockResults.forEach(result => result.active = false);
  }

  private setSearchPlaceholder(): void {
    // Default to Windows/Linux shortcut
    this.searchPlaceholder = "Search";

    // Check for macOS in a way that's safe for SSR
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      if (isMac) {
        this.searchPlaceholder = "Search";
      }
    }
  }
}
