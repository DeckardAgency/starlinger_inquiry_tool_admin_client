import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [CommonModule],
  template: `<span class="icon" [ngClass]="iconClass" [innerHTML]="svgIcon"></span>`,
  styles: [`
    .icon {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    svg {
      width: 100%;
      height: 100%;
    }
  `]
})
export class IconComponent implements OnChanges {
  @Input() name!: string;
  @Input() size: string = '24px';
  @Input() color: string = 'currentColor';

  svgIcon: SafeHtml | null = null;
  iconClass: string = '';

  constructor(private sanitizer: DomSanitizer) {}

  ngOnChanges(): void {
    this.updateIcon();
  }

  private updateIcon(): void {
    const icon = ICONS[this.name];
    if (icon) {
      this.iconClass = `icon-${this.name}`;

      // Add size and color styles to SVG markup
      const svg = icon.replace('<svg', `<svg style="width:${this.size};height:${this.size};color:${this.color}"`);

      this.svgIcon = this.sanitizer.bypassSecurityTrustHtml(svg);
    } else {
      console.warn(`Icon "${this.name}" not found`);
      this.svgIcon = null;
    }
  }
}

// Icon registry
const ICONS: {[key: string]: string} = {
  cart: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="9" cy="21" r="1"></circle>
    <circle cx="20" cy="21" r="1"></circle>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
  </svg>`,

  heart: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
  </svg>`,

  search: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>`,

  grid: `<svg fill="none" xmlns="http://www.w3.org/2000/svg"><path
                d="M6 2H2.667A.667.667 0 0 0 2 2.667V6c0 .368.298.667.667.667H6A.667.667 0 0 0 6.667 6V2.667A.667.667 0 0 0 6 2ZM13.333 2H10a.667.667 0 0 0-.667.667V6c0 .368.299.667.667.667h3.333A.667.667 0 0 0 14 6V2.667A.667.667 0 0 0 13.333 2ZM13.333 9.333H10a.667.667 0 0 0-.667.667v3.333c0 .368.299.667.667.667h3.333a.667.667 0 0 0 .667-.667V10a.667.667 0 0 0-.667-.667ZM6 9.333H2.667A.667.667 0 0 0 2 10v3.333c0 .368.298.667.667.667H6a.667.667 0 0 0 .667-.667V10A.667.667 0 0 0 6 9.333Z"
                stroke="currentColor" stroke-width="1.33" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  list: `<svg fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9.333 2.667H14M9.333 6H14m-4.667 4H14m-4.667 3.333H14M2.667 2H6c.368 0 .667.298.667.667V6A.667.667 0 0 1 6 6.667H2.667A.667.667 0 0 1 2 6V2.667C2 2.298 2.298 2 2.667 2Zm0 7.333H6c.368 0 .667.299.667.667v3.333A.667.667 0 0 1 6 14H2.667A.667.667 0 0 1 2 13.333V10c0-.368.298-.667.667-.667Z" stroke="currentColor" stroke-width="1.33" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  magnifier: `<svg fill="none" xmlns="http://www.w3.org/2000/svg"><path d="m14 14-2.867-2.867m1.534-3.8A5.333 5.333 0 1 1 2 7.333a5.333 5.333 0 0 1 10.667 0Z" stroke="currentColor" stroke-width="1.33" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  filter: `<svg fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2.5 4h12M5.167 8h6.666m-4.666 4h2.666"
                  stroke="currentColor"
                  stroke-width="1.33"
                  stroke-linecap="round"
                  stroke-linejoin="round"/>
          </svg>`,

  arrowDown: `<svg fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="m4 6 4 4 4-4" stroke="currentColor" stroke-width="1.33" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>`,

  close: `<svg viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 3L3 9M3 3L9 9" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>`,

  packageSearch: `<svg fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14M7.5 4.27l9 5.15M3.29 7 12 12m0 0 8.71-5M12 12v10m8.27-4.73L22 19m-1-3.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  carouselArowLeft: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none"><path d="M7.99998 12.6666L3.33331 7.99992M3.33331 7.99992L7.99998 3.33325M3.33331 7.99992H12.6666" stroke="currentColor" stroke-width="1.33" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  carouselArowRight: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none"><path d="M3.33337 7.99992H12.6667M12.6667 7.99992L8.00004 3.33325M12.6667 7.99992L8.00004 12.6666" stroke="currentColor" stroke-width="1.33" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  home: `<svg fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M6 14.667V8h4v6.667M2 6l6-4.667L14 6v7.333a1.334 1.334 0 0 1-1.333 1.334H3.333A1.334 1.334 0 0 1 2 13.333V6Z" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  breadcrumbsSeparator: `<svg fill="none" xmlns="http://www.w3.org/2000/svg"><path fill="#1E1E1E" d="M0 0h2v16H0z"/><g clip-path="url(#a)"><path d="M-307-98a6 6 0 0 1 6-6h1524c3.31 0 6 2.686 6 6V938c0 3.314-2.69 6-6 6H-301a6 6 0 0 1-6-6V-98Z" fill="#FAFAFA"/><g clip-path="url(#b)"><mask id="d" fill="#fff"><path d="M-51-24h1280v968H-51V-24Z"/></mask><path d="M-51-24h1280v968H-51V-24Z" fill="#fff"/><path d="M-51-24h1280v968H-51V-24Z" fill="#F4F4F5"/><path d="M-51-24h1280v968H-51V-24Z" fill="#fff" fill-opacity=".1"/><mask id="c" fill="#fff"><path d="M-51-24h1280v64H-51v-64Z"/></mask><path d="M1229 39H-51v2h1280v-2Z" fill="#E4E4E7" mask="url(#c)"/><path d="M1 .5v15" stroke="#E4E4E7"/></g><path d="M-50 944V-24h-2v968h2Z" fill="#E4E4E7" mask="url(#d)"/></g><path d="M-306.5-98a5.5 5.5 0 0 1 5.5-5.5h1524c3.04 0 5.5 2.462 5.5 5.5V938c0 3.038-2.46 5.5-5.5 5.5H-301a5.5 5.5 0 0 1-5.5-5.5V-98Z" stroke="currentColor"/><defs><clipPath id="a"><path d="M-307-98a6 6 0 0 1 6-6h1524c3.31 0 6 2.686 6 6V938c0 3.314-2.69 6-6 6H-301a6 6 0 0 1-6-6V-98Z" fill="#fff"/></clipPath><clipPath id="b"><path d="M-51-24h1280v968H-51V-24Z" fill="#fff"/></clipPath></defs></svg>`,

  breadcrumbsArrow: `<svg fill="none" xmlns="http://www.w3.org/2000/svg"><path d="m9 18 6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  sidebarIconDashboard: `<svg fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 14.667V8h4v6.667M2 6l6-4.667L14 6v7.333a1.334 1.334 0 0 1-1.333 1.334H3.333A1.334 1.334 0 0 1 2 13.333V6Z" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  spinner: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><style>.spinner_7WDj{transform-origin:center;animation:spinner_PBVY .75s linear infinite}@keyframes spinner_PBVY{100%{transform:rotate(360deg)}}</style><path d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,19a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z" opacity=".25"/><circle class="spinner_7WDj" cx="12" cy="2.5" r="1.5"/></svg>`,

  cartBag: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none">
    <path d="M2.5 5.00008L5 1.66675H15L17.5 5.00008M2.5 5.00008V16.6667C2.5 17.1088 2.67559 17.5327 2.98816 17.8453C3.30072 18.1578 3.72464 18.3334 4.16667 18.3334H15.8333C16.2754 18.3334 16.6993 18.1578 17.0118 17.8453C17.3244 17.5327 17.5 17.1088 17.5 16.6667V5.00008M2.5 5.00008H17.5M13.3333 8.33342C13.3333 9.21747 12.9821 10.0653 12.357 10.6904C11.7319 11.3156 10.8841 11.6667 10 11.6667C9.11594 11.6667 8.2681 11.3156 7.64298 10.6904C7.01786 10.0653 6.66667 9.21747 6.66667 8.33342" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  minus: `<svg fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3.333 8h9.334" stroke="currentColor" stroke-width="1.33" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  plus: `<svg fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3.333 8h9.334M8 3.333v9.334" stroke="currentColor" stroke-width="1.33" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  trash: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none">
    <path d="M2 3.99992H14M12.6667 3.99992V13.3333C12.6667 13.9999 12 14.6666 11.3333 14.6666H4.66667C4 14.6666 3.33333 13.9999 3.33333 13.3333V3.99992M5.33333 3.99992V2.66659C5.33333 1.99992 6 1.33325 6.66667 1.33325H9.33333C10 1.33325 10.6667 1.99992 10.6667 2.66659V3.99992M6.66667 7.33325V11.3333M9.33333 7.33325V11.3333" stroke="currentColor" stroke-width="1.33" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  truck: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none">
    <path d="M11.6665 14.9999V4.99992C11.6665 4.55789 11.4909 4.13397 11.1783 3.82141C10.8658 3.50885 10.4419 3.33325 9.99984 3.33325H3.33317C2.89114 3.33325 2.46722 3.50885 2.15466 3.82141C1.8421 4.13397 1.6665 4.55789 1.6665 4.99992V14.1666C1.6665 14.3876 1.7543 14.5996 1.91058 14.7558C2.06686 14.9121 2.27882 14.9999 2.49984 14.9999H4.1665M4.1665 14.9999C4.1665 15.9204 4.9127 16.6666 5.83317 16.6666C6.75365 16.6666 7.49984 15.9204 7.49984 14.9999M4.1665 14.9999C4.1665 14.0794 4.9127 13.3333 5.83317 13.3333C6.75365 13.3333 7.49984 14.0794 7.49984 14.9999M12.4998 14.9999H7.49984M12.4998 14.9999C12.4998 15.9204 13.246 16.6666 14.1665 16.6666C15.087 16.6666 15.8332 15.9204 15.8332 14.9999M12.4998 14.9999C12.4998 14.0794 13.246 13.3333 14.1665 13.3333C15.087 13.3333 15.8332 14.0794 15.8332 14.9999M15.8332 14.9999H17.4998C17.7209 14.9999 17.9328 14.9121 18.0891 14.7558C18.2454 14.5996 18.3332 14.3876 18.3332 14.1666V11.1249C18.3328 10.9358 18.2682 10.7524 18.1498 10.6049L15.2498 6.97992C15.1719 6.88232 15.073 6.80349 14.9605 6.74925C14.848 6.69501 14.7247 6.66676 14.5998 6.66659H11.6665" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  currency: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none">
    <path d="M13.3333 7.41667V5.83333H6.66667L10 10L6.66667 14.1667H13.3333V12.5833M4.16667 2.5H15.8333C16.7538 2.5 17.5 3.24619 17.5 4.16667V15.8333C17.5 16.7538 16.7538 17.5 15.8333 17.5H4.16667C3.24619 17.5 2.5 16.7538 2.5 15.8333V4.16667C2.5 3.24619 3.24619 2.5 4.16667 2.5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  chevronRight: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none">
    <path d="M6 12L10 8L6 4" stroke="currentColor" stroke-width="1.33" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  save: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none">
    <path d="M2.66657 9.9326C2.17126 9.42654 1.79761 8.81441 1.57392 8.14256C1.35023 7.47071 1.28237 6.75676 1.37547 6.0548C1.46858 5.35284 1.7202 4.68127 2.1113 4.09096C2.50239 3.50064 3.02269 3.00708 3.63279 2.64763C4.24289 2.28819 4.92678 2.0723 5.63268 2.01632C6.33857 1.96033 7.04795 2.06572 7.70708 2.32451C8.36621 2.58329 8.9578 2.98867 9.43706 3.50996C9.91631 4.03124 10.2706 4.65475 10.4732 5.33327H11.6666C12.3102 5.33319 12.9369 5.54015 13.4539 5.92356C13.9709 6.30697 14.3509 6.84651 14.5377 7.46247C14.7246 8.07843 14.7084 8.73815 14.4915 9.34418C14.2746 9.95021 13.8685 10.4704 13.3332 10.8279M8 7.99992V13.9999M8 7.99992L10.6667 10.6666M8 7.99992L5.33333 10.6666" stroke="currentColor" stroke-width="1.33" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  cartEmpty: `<svg fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 56c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm24 0c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zM5.01 8h5.42c1.23 0 2.28.88 2.5 2.08l6.06 31.92H47.1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  inputForm: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 17 16" fill="none">
    <path d="M3.83325 2.66699H4.49992C5.03035 2.66699 5.53906 2.87771 5.91413 3.25278C6.28921 3.62785 6.49992 4.13656 6.49992 4.66699M6.49992 4.66699C6.49992 4.13656 6.71063 3.62785 7.0857 3.25278C7.46078 2.87771 7.96949 2.66699 8.49992 2.66699H9.16659M6.49992 4.66699V11.3337M9.16659 13.3337H8.49992C7.96949 13.3337 7.46078 13.1229 7.0857 12.7479C6.71063 12.3728 6.49992 11.8641 6.49992 11.3337M6.49992 11.3337C6.49992 11.8641 6.28921 12.3728 5.91413 12.7479C5.53906 13.1229 5.03035 13.3337 4.49992 13.3337H3.83325M3.83325 10.667H3.16659C2.81296 10.667 2.47382 10.5265 2.22378 10.2765C1.97373 10.0264 1.83325 9.68728 1.83325 9.33366V6.66699C1.83325 6.31337 1.97373 5.97423 2.22378 5.72418C2.47382 5.47413 2.81296 5.33366 3.16659 5.33366H3.83325M9.16659 5.33366H13.8333C14.1869 5.33366 14.526 5.47413 14.7761 5.72418C15.0261 5.97423 15.1666 6.31337 15.1666 6.66699V9.33366C15.1666 9.68728 15.0261 10.0264 14.7761 10.2765C14.526 10.5265 14.1869 10.667 13.8333 10.667H9.16659" stroke="currentColor" stroke-width="1.33" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  template: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 17 16" fill="none">
    <path d="M2.5 6H14.5M2.5 10H14.5M6.5 6V14M10.5 6V14M3.83333 2H13.1667C13.903 2 14.5 2.59695 14.5 3.33333V12.6667C14.5 13.403 13.903 14 13.1667 14H3.83333C3.09695 14 2.5 13.403 2.5 12.6667V3.33333C2.5 2.59695 3.09695 2 3.83333 2Z" stroke="currentColor" stroke-width="1.33" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  searchInput: `<svg width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="m14 14-2.867-2.867m1.534-3.8A5.333 5.333 0 1 1 2 7.333a5.333 5.333 0 0 1 10.667 0Z" stroke="currentColor" stroke-width="1.33" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  filterType: `<svg width="17" height="16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2.5 4h12M5.167 8h6.666m-4.666 4h2.666" stroke="currentColor" stroke-width="1.33" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  filterRemove: `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 3L3 9M3 3L9 9" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  calculator: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M6.66659 5.33317H6.67325M7.99992 7.99984H8.00659M9.33325 5.33317H9.33992M10.6666 7.99984H10.6733M11.9999 5.33317H12.0066M3.99992 5.33317H4.00659M4.66659 10.6665H11.3333M5.33325 7.99984H5.33992M2.66659 2.6665H13.3333C14.0696 2.6665 14.6666 3.26346 14.6666 3.99984V11.9998C14.6666 12.7362 14.0696 13.3332 13.3333 13.3332H2.66659C1.93021 13.3332 1.33325 12.7362 1.33325 11.9998V3.99984C1.33325 3.26346 1.93021 2.6665 2.66659 2.6665Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  trashPart: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 4H14M5 4V3C5 2.44772 5.44772 2 6 2H10C10.5523 2 11 2.44772 11 3V4M12 4V13C12 13.5523 11.5523 14 11 14H5C4.44772 14 4 13.5523 4 13V4H12Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  addPlus: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
    <path d="M16 24H32M24 16V32M44 24C44 35.0457 35.0457 44 24 44C12.9543 44 4 35.0457 4 24C4 12.9543 12.9543 4 24 4C35.0457 4 44 12.9543 44 24Z" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  imageIcon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM5 19V5H19V19H5ZM8.5 13.5L11 16.51L14.5 12L19 18H5L8.5 13.5Z" fill="currentColor"/>
  </svg>`,

  fileIcon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20Z" fill="currentColor"/>
  </svg>`,

  cancelUpload: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  </svg>`,

  retryUpload: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M14 8C14 9.18669 13.6481 10.3467 12.9888 11.3334C12.3295 12.3201 11.3925 13.0892 10.2961 13.5433C9.19975 13.9974 7.99335 14.1162 6.82946 13.8847C5.66558 13.6532 4.59648 13.0818 3.75736 12.2426C2.91825 11.4035 2.3468 10.3344 2.11529 9.17054C1.88378 8.00666 2.0026 6.80026 2.45673 5.7039C2.91085 4.60754 3.67989 3.67047 4.66658 3.01118C5.65328 2.35189 6.81331 2 8 2C9.68 2 11.2867 2.66667 12.4933 3.82667L14 5.33333M14 5.33333L14 2M14 5.33333H10.6667" stroke="currentColor" stroke-width="1.33" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  successCheck: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  addMore: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M3.3335 8.00016H12.6668M8.00016 3.3335V12.6668" stroke="currentColor" stroke-width="1.33" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  addPart: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 3V13M3 8H13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  </svg>`,

  continueArrow: `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="16" viewBox="0 0 17 16" fill="none">
    <path d="M6.5 12L10.5 8L6.5 4" stroke="currentColor" stroke-width="1.33" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  fileWarning: `<svg fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 7.5v3.333m0 3.334h.008m2.492-12.5H5a1.667 1.667 0 0 0-1.667 1.666v13.334A1.666 1.666 0 0 0 5 18.333h10a1.666 1.666 0 0 0 1.667-1.666V5.833L12.5 1.667Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  filePlusTwo: `<svg fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 33h21a3 3 0 0 0 3-3V10.5L22.5 3H9a3 3 0 0 0-3 3v6m15-9v6a3 3 0 0 0 3 3h6M4.5 22.5h9M9 18v9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  clipboardList: `<svg fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M24.333 6h3a3 3 0 0 1 3 3v21a3 3 0 0 1-3 3h-18a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3h3m6 10.5h6m-6 7.5h6m-12-7.5h.015m-.015 7.5h.015m1.485-21h9a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-9a1.5 1.5 0 0 1-1.5-1.5v-3a1.5 1.5 0 0 1 1.5-1.5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  contact: `<svg fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M26.167 27a3 3 0 0 0-3-3h-9a3 3 0 0 0-3 3m1.5-24v3m12-3v3m-16.5 0h21a3 3 0 0 1 3 3v21a3 3 0 0 1-3 3h-21a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3Zm13.5 9a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  buttonArrowRight: `<svg fill="none" xmlns="http://www.w3.org/2000/svg"><path d="m6 12 4-4-4-4" stroke="currentColor" stroke-width="1.33" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

};
