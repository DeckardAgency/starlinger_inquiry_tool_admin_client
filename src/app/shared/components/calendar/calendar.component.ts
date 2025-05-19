import {
  Component,
  OnInit,
  EventEmitter,
  Output,
  Input,
  HostListener,
  ElementRef,
  OnDestroy,
  ChangeDetectionStrategy,
  inject,
  DestroyRef,
  LOCALE_ID,
  signal,
  computed,
  AfterViewInit
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

export interface CalendarDate {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isInRange: boolean;
  isRangeStart: boolean;
  isRangeEnd: boolean;
  isHovered: boolean;
  monthIndex: number;
  isDisabled: boolean;
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CalendarComponent implements OnInit, OnDestroy, AfterViewInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly locale = inject(LOCALE_ID);
  private datePipe = new DatePipe(this.locale);

  // Required inputs
  @Input({ required: true }) isRange!: boolean;

  // Optional inputs with default values
  @Input() selectedDate: Date | null = null;
  @Input() startDate: Date | null = null;
  @Input() endDate: Date | null = null;

  // Date restriction inputs
  @Input() minDate: Date | null = null;
  @Input() maxDate: Date | null = null;
  @Input() disableFutureDates = false;
  @Input() disablePastDates = false;

  // Output events
  @Output() dateSelected = new EventEmitter<Date>();
  @Output() rangeSelected = new EventEmitter<{ start: Date, end: Date }>();
  @Output() closeCalendar = new EventEmitter<void>();

  // State signals
  daysOfWeek = signal<string[]>(['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']);
  firstMonthDays = signal<CalendarDate[]>([]);
  secondMonthDays = signal<CalendarDate[]>([]);
  currentMonth = signal<Date>(new Date());
  nextMonth = computed(() => {
    const next = new Date(this.currentMonth());
    next.setDate(1);
    next.setMonth(next.getMonth() + 1);
    return next;
  });

  // For range selection
  selectionInProgress = signal<boolean>(false);
  hoverDate = signal<Date | null>(null);

  // For focus trap implementation
  private focusTrapEnabled = signal<boolean>(false);
  private focusableElements: HTMLElement[] = [];
  private focusedElementIndex = signal<number>(-1);
  private documentKeydownSubscription?: Subscription;

  // Track original focus to restore when trap is disabled
  private originalFocusedElement: HTMLElement | null = null;

  // Getters for computed properties
  firstMonthName = computed(() => this.getMonthName(this.currentMonth()));
  secondMonthName = computed(() => this.getMonthName(this.nextMonth()));

  constructor(private elementRef: ElementRef) {
    // Subscription will be automatically cleaned up using takeUntilDestroyed
    fromEvent<MouseEvent>(document, 'click')
        .pipe(
            filter(event =>
                this.elementRef.nativeElement &&
                !this.elementRef.nativeElement.contains(event.target)
            ),
            takeUntilDestroyed(this.destroyRef)
        )
        .subscribe(() => {
          this.closeCalendar.emit();
        });
  }

  ngOnInit() {
    this.initializeCalendar();
  }

  ngAfterViewInit() {
    // Initialize focus trap
    this.initFocusTrap();

    // Set initial focus
    this.enableFocusTrap();
  }

  ngOnChanges() {
    // Regenerate calendar days when inputs change
    if (this.firstMonthDays().length > 0) {
      this.generateCalendarDays();
    }
  }

  ngOnDestroy() {
    // Ensure focus trap is disabled and subscription is cleaned up
    this.disableFocusTrap();
    if (this.documentKeydownSubscription) {
      this.documentKeydownSubscription.unsubscribe();
    }
  }

  // Initialize calendar with currently selected date/range
  initializeCalendar(): void {
    let initialMonth: Date;

    // If we have a selected date range, start with that month
    if (this.isRange && this.startDate) {
      initialMonth = new Date(this.startDate);
    } else if (!this.isRange && this.selectedDate) {
      initialMonth = new Date(this.selectedDate);
    } else {
      // Default to current month if no dates are selected
      initialMonth = new Date();
    }

    // Reset to start of the month
    initialMonth.setDate(1);
    initialMonth.setHours(0, 0, 0, 0);

    this.currentMonth.set(initialMonth);

    // Check if we are in the middle of a range selection
    this.selectionInProgress.set(this.isRange && this.startDate !== null && this.endDate === null);

    this.generateCalendarDays();
  }

  // Custom focus trap implementation
  private initFocusTrap(): void {
    // Listen for keydown events on the document
    this.documentKeydownSubscription = fromEvent<KeyboardEvent>(document, 'keydown')
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(event => {
          if (!this.focusTrapEnabled()) return;

          if (event.key === 'Tab') {
            this.handleTabKey(event);
          }
        });
  }

  private enableFocusTrap(): void {
    // Store the original focused element to restore later
    this.originalFocusedElement = document.activeElement as HTMLElement;

    // Find all focusable elements
    this.updateFocusableElements();

    // Enable the trap
    this.focusTrapEnabled.set(true);

    // Set focus to the first focusable element
    if (this.focusableElements.length > 0) {
      this.focusableElements[0].focus();
      this.focusedElementIndex.set(0);
    }
  }

  private disableFocusTrap(): void {
    this.focusTrapEnabled.set(false);

    // Restore original focus
    if (this.originalFocusedElement && typeof this.originalFocusedElement.focus === 'function') {
      this.originalFocusedElement.focus();
    }
  }

  private updateFocusableElements(): void {
    const selector = [
      'button:not([disabled])',
      '[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '.day.current-month:not(.disabled)'
    ].join(',');

    this.focusableElements = Array.from(
        this.elementRef.nativeElement.querySelectorAll(selector)
    ) as HTMLElement[];
  }

  private handleTabKey(event: KeyboardEvent): void {
    if (this.focusableElements.length === 0) return;

    const currentIndex = this.focusedElementIndex();
    let nextIndex = 0;

    if (event.shiftKey) {
      // Tab backwards
      nextIndex = currentIndex <= 0 ? this.focusableElements.length - 1 : currentIndex - 1;
    } else {
      // Tab forwards
      nextIndex = currentIndex >= this.focusableElements.length - 1 ? 0 : currentIndex + 1;
    }

    event.preventDefault();
    this.focusableElements[nextIndex].focus();
    this.focusedElementIndex.set(nextIndex);
  }

  generateCalendarDays(): void {
    // Generate days for both months
    this.firstMonthDays.set(this.generateMonthDays(this.currentMonth(), 0));
    this.secondMonthDays.set(this.generateMonthDays(this.nextMonth(), 1));
  }

  generateMonthDays(month: Date, monthIndex: number): CalendarDate[] {
    const days: CalendarDate[] = [];

    // Create a new date to avoid mutation
    const firstDayOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
    const lastDayOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);

    // Calculate the first day to show (might be from previous month)
    const firstDayToShow = new Date(firstDayOfMonth);
    firstDayToShow.setDate(firstDayToShow.getDate() - firstDayOfMonth.getDay());

    // Generate six weeks of days to ensure we have enough for all month views
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 42; i++) {
      const currentDate = new Date(firstDayToShow);
      currentDate.setDate(currentDate.getDate() + i);
      currentDate.setHours(0, 0, 0, 0);

      const isCurrentMonth = currentDate.getMonth() === month.getMonth();
      const isToday = currentDate.getTime() === today.getTime();

      let isSelected = false;
      let isInRange = false;
      let isRangeStart = false;
      let isRangeEnd = false;
      let isHovered = false;
      let isDisabled = false;

      // Check if date is disabled based on restrictions
      isDisabled = this.isDateDisabled(currentDate);

      // Single date selection
      if (this.selectedDate && !this.isRange) {
        isSelected = this.isSameDay(currentDate, this.selectedDate);
      }

      // Range selection - both start and end dates selected
      if (this.isRange && this.startDate && this.endDate) {
        const startTime = new Date(this.startDate).setHours(0,0,0,0);
        const endTime = new Date(this.endDate).setHours(0,0,0,0);
        const currentTime = currentDate.getTime();

        isRangeStart = this.isSameDay(currentDate, this.startDate);
        isRangeEnd = this.isSameDay(currentDate, this.endDate);

        // Only mark as in range if this date is in the current month
        isInRange = isCurrentMonth && currentTime >= startTime && currentTime <= endTime;
      }
      // Range selection in progress - only start date selected
      else if (this.isRange && this.startDate && !this.endDate) {
        isRangeStart = this.isSameDay(currentDate, this.startDate);

        // Handle hover preview for range selection in progress
        const currentHoverDate = this.hoverDate();
        if (currentHoverDate && isCurrentMonth) {
          const startTime = new Date(this.startDate).setHours(0,0,0,0);
          const hoverTime = new Date(currentHoverDate).setHours(0,0,0,0);
          const currentTime = currentDate.getTime();

          isHovered = this.isSameDay(currentDate, currentHoverDate);

          // Show preview range from start date to hover date
          if (hoverTime >= startTime) {
            // Forward selection
            isInRange = currentTime > startTime && currentTime < hoverTime;
          } else {
            // Backward selection
            isInRange = currentTime < startTime && currentTime > hoverTime;
          }
        }
      }

      days.push({
        date: currentDate,
        isCurrentMonth,
        isToday,
        isSelected,
        isInRange,
        isRangeStart,
        isRangeEnd,
        isHovered,
        monthIndex,
        isDisabled
      });
    }

    return days;
  }

  // Handle mouse enter on a date cell for range preview
  onDateHover(date: Date): void {
    if (this.isRange && this.selectionInProgress()) {
      this.hoverDate.set(new Date(date));
      this.generateCalendarDays();
    }
  }

  // Reset hover state when mouse leaves the calendar grid
  onCalendarMouseLeave(): void {
    if (this.hoverDate()) {
      this.hoverDate.set(null);
      this.generateCalendarDays();
    }
  }

  // Keyboard navigation handler
  @HostListener('keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;

    // If the target has a date attribute, we can navigate using arrow keys
    const dateAttr = target.getAttribute('data-date');
    if (!dateAttr) return;

    const currentDate = new Date(parseInt(dateAttr));
    let newDate: Date | null = new Date(currentDate);

    switch (event.key) {
      case 'ArrowLeft':
        newDate.setDate(newDate.getDate() - 1);
        event.preventDefault();
        break;
      case 'ArrowRight':
        newDate.setDate(newDate.getDate() + 1);
        event.preventDefault();
        break;
      case 'ArrowUp':
        newDate.setDate(newDate.getDate() - 7);
        event.preventDefault();
        break;
      case 'ArrowDown':
        newDate.setDate(newDate.getDate() + 7);
        event.preventDefault();
        break;
      case 'Home':
        newDate.setDate(1);
        event.preventDefault();
        break;
      case 'End':
        newDate = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0);
        event.preventDefault();
        break;
      case 'PageUp':
        newDate.setMonth(newDate.getMonth() - 1);
        event.preventDefault();
        break;
      case 'PageDown':
        newDate.setMonth(newDate.getMonth() + 1);
        event.preventDefault();
        break;
      case 'Enter':
      case ' ':
        this.selectDate(currentDate);
        event.preventDefault();
        break;
      case 'Escape':
        this.closeCalendar.emit();
        event.preventDefault();
        break;
      default:
        return;
    }

    // Navigate to different month if needed
    if (newDate) {
      const newMonth = newDate.getMonth();
      const currentVisibleMonth = this.currentMonth().getMonth();
      const nextVisibleMonth = this.nextMonth().getMonth();

      if (newMonth !== currentVisibleMonth && newMonth !== nextVisibleMonth) {
        // Update the current month to include the new date
        const newCurrentMonth = new Date(newDate);
        newCurrentMonth.setDate(1);
        this.currentMonth.set(newCurrentMonth);
        this.generateCalendarDays();
      }

      // Find and focus the day element for the new date
      this.focusDateElement(newDate);
    }
  }

  // Find and focus a specific date element
  private focusDateElement(date: Date): void {
    setTimeout(() => {
      const dateTime = date.getTime();
      const selector = `.day[data-date="${dateTime}"]`;
      const element = this.elementRef.nativeElement.querySelector(selector) as HTMLElement;

      if (element) {
        element.focus();

        // Update focusable elements and current index
        this.updateFocusableElements();
        const newIndex = this.focusableElements.indexOf(element);
        if (newIndex !== -1) {
          this.focusedElementIndex.set(newIndex);
        }
      }
    }, 0);
  }

  // Used by ngFor to optimize rendering
  trackByDate(index: number, day: CalendarDate): number {
    return day.date.getTime();
  }

  // Helper to check if a date is disabled based on all restriction criteria
  isDateDisabled(date: Date): boolean {
    // Set date to start of day for consistent comparisons
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if date is before minimum date
    if (this.minDate) {
      const minDate = new Date(this.minDate);
      minDate.setHours(0, 0, 0, 0);
      if (compareDate < minDate) {
        return true;
      }
    }

    // Check if date is after maximum date
    if (this.maxDate) {
      const maxDate = new Date(this.maxDate);
      maxDate.setHours(0, 0, 0, 0);
      if (compareDate > maxDate) {
        return true;
      }
    }

    // Check if future dates should be disabled
    if (this.disableFutureDates && compareDate > today) {
      return true;
    }

    // Check if past dates should be disabled
    if (this.disablePastDates && compareDate < today) {
      return true;
    }

    return false;
  }

  // Helper to check if two dates are the same day
  isSameDay(date1: Date, date2: Date | null): boolean {
    if (!date2) return false;
    return date1.getDate() === date2.getDate() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getFullYear() === date2.getFullYear();
  }

  prevMonth(): void {
    const newMonth = new Date(this.currentMonth());
    newMonth.setMonth(newMonth.getMonth() - 1);
    this.currentMonth.set(newMonth);
    this.generateCalendarDays();
  }

  nextMonthClick(): void {
    const newMonth = new Date(this.currentMonth());
    newMonth.setMonth(newMonth.getMonth() + 1);
    this.currentMonth.set(newMonth);
    this.generateCalendarDays();
  }

  selectDate(date: Date): void {
    // Don't allow selection of disabled dates
    if (this.isDateDisabled(date)) {
      return;
    }

    if (!this.isRange) {
      // Single date selection
      this.selectedDate = new Date(date);
      this.dateSelected.emit(new Date(date));
      this.generateCalendarDays();
    } else {
      // Range selection
      if (!this.selectionInProgress() || !this.startDate) {
        // First click in range selection
        this.startDate = new Date(date);
        this.endDate = null;
        this.selectionInProgress.set(true);
      } else {
        // Second click in range selection
        if (date.getTime() < this.startDate!.getTime()) {
          // If clicked date is before start date, swap them
          this.endDate = new Date(this.startDate);
          this.startDate = new Date(date);
        } else {
          this.endDate = new Date(date);
        }
        this.selectionInProgress.set(false);
        this.hoverDate.set(null); // Reset hover state
        this.rangeSelected.emit({
          start: new Date(this.startDate!),
          end: new Date(this.endDate!)
        });
      }
      this.generateCalendarDays();
    }
  }

  getMonthName(date: Date): string {
    return this.datePipe.transform(date, 'MMMM yyyy') || '';
  }

  clearSelection(): void {
    this.selectedDate = null;
    this.startDate = null;
    this.endDate = null;
    this.selectionInProgress.set(false);
    this.hoverDate.set(null);
    this.generateCalendarDays();
  }

  applySelection(): void {
    if (this.isRange && this.startDate && this.endDate) {
      this.rangeSelected.emit({
        start: new Date(this.startDate),
        end: new Date(this.endDate)
      });
    } else if (this.isRange && this.startDate && this.hoverDate()) {
      // If user applied with only hover selection, convert hover to end date
      const currentHoverDate = this.hoverDate()!;
      if (currentHoverDate.getTime() < this.startDate.getTime()) {
        this.rangeSelected.emit({
          start: new Date(currentHoverDate),
          end: new Date(this.startDate)
        });
      } else {
        this.rangeSelected.emit({
          start: new Date(this.startDate),
          end: new Date(currentHoverDate)
        });
      }
    } else if (!this.isRange && this.selectedDate) {
      this.dateSelected.emit(new Date(this.selectedDate));
    }
    this.closeCalendar.emit();
  }
}
