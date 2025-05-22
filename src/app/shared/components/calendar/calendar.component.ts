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
  AfterViewInit,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';
import { filter, debounceTime } from 'rxjs/operators';

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
  dateTime: number; // Pre-calculated for performance
}

interface DateRestrictions {
  minDate: Date | null;
  maxDate: Date | null;
  disableFutureDates: boolean;
  disablePastDates: boolean;
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CalendarComponent implements OnInit, OnDestroy, AfterViewInit, OnChanges {
  private readonly destroyRef = inject(DestroyRef);
  private readonly locale = inject(LOCALE_ID);
  private readonly datePipe = new DatePipe(this.locale);
  private readonly elementRef = inject(ElementRef);

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
  readonly daysOfWeek = signal<string[]>(['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']);
  readonly firstMonthDays = signal<CalendarDate[]>([]);
  readonly secondMonthDays = signal<CalendarDate[]>([]);
  readonly currentMonth = signal<Date>(new Date());

  // Computed values
  readonly nextMonth = computed(() => {
    const next = new Date(this.currentMonth());
    next.setDate(1);
    next.setMonth(next.getMonth() + 1);
    return next;
  });

  readonly firstMonthName = computed(() => this.getMonthName(this.currentMonth()));
  readonly secondMonthName = computed(() => this.getMonthName(this.nextMonth()));

  // Range selection state
  readonly selectionInProgress = signal<boolean>(false);
  readonly hoverDate = signal<Date | null>(null);

  // Focus management
  private readonly focusTrapEnabled = signal<boolean>(false);
  private focusableElements: HTMLElement[] = [];
  private readonly focusedElementIndex = signal<number>(-1);
  private originalFocusedElement: HTMLElement | null = null;

  // Performance optimizations
  private readonly todayTime = new Date().setHours(0, 0, 0, 0);
  private readonly daysMemo = new Map<string, CalendarDate[]>();
  private lastRestrictions: DateRestrictions | null = null;

  // Cache for date restrictions
  private readonly dateRestrictions = computed<DateRestrictions>(() => ({
    minDate: this.minDate,
    maxDate: this.maxDate,
    disableFutureDates: this.disableFutureDates,
    disablePastDates: this.disablePastDates
  }));

  constructor() {
    // Debounced click outside handler for better performance
    fromEvent<MouseEvent>(document, 'click')
        .pipe(
            debounceTime(10),
            filter(event =>
                this.elementRef.nativeElement &&
                !this.elementRef.nativeElement.contains(event.target)
            ),
            takeUntilDestroyed(this.destroyRef)
        )
        .subscribe(() => this.closeCalendar.emit());

    // Optimized keyboard handler
    fromEvent<KeyboardEvent>(document, 'keydown')
        .pipe(
            filter(() => this.focusTrapEnabled()),
            takeUntilDestroyed(this.destroyRef)
        )
        .subscribe(event => this.handleGlobalKeyDown(event));
  }

  ngOnInit(): void {
    this.initializeCalendar();
  }

  ngAfterViewInit(): void {
    this.initFocusTrap();
    this.enableFocusTrap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Only regenerate if relevant inputs changed
    const relevantChanges = ['selectedDate', 'startDate', 'endDate', 'minDate', 'maxDate', 'disableFutureDates', 'disablePastDates'];
    const hasRelevantChanges = relevantChanges.some(key => changes[key]);

    if (hasRelevantChanges && this.firstMonthDays().length > 0) {
      this.invalidateCache();
      this.generateCalendarDays();
    }
  }

  ngOnDestroy(): void {
    this.disableFocusTrap();
    this.daysMemo.clear();
  }

  private initializeCalendar(): void {
    let initialMonth: Date;

    if (this.isRange && this.startDate) {
      initialMonth = new Date(this.startDate);
    } else if (!this.isRange && this.selectedDate) {
      initialMonth = new Date(this.selectedDate);
    } else {
      initialMonth = new Date();
    }

    initialMonth.setDate(1);
    initialMonth.setHours(0, 0, 0, 0);
    this.currentMonth.set(initialMonth);

    this.selectionInProgress.set(
        this.isRange && this.startDate !== null && this.endDate === null
    );

    this.generateCalendarDays();
  }

  private initFocusTrap(): void {
    // Focus trap is now handled in the global keydown listener
    this.updateFocusableElements();
  }

  private enableFocusTrap(): void {
    this.originalFocusedElement = document.activeElement as HTMLElement;
    this.updateFocusableElements();
    this.focusTrapEnabled.set(true);

    if (this.focusableElements.length > 0) {
      this.focusableElements[0].focus();
      this.focusedElementIndex.set(0);
    }
  }

  private disableFocusTrap(): void {
    this.focusTrapEnabled.set(false);
    if (this.originalFocusedElement?.focus) {
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

  private handleGlobalKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Tab') {
      this.handleTabKey(event);
    }
  }

  private handleTabKey(event: KeyboardEvent): void {
    if (this.focusableElements.length === 0) return;

    const currentIndex = this.focusedElementIndex();
    const nextIndex = event.shiftKey
        ? (currentIndex <= 0 ? this.focusableElements.length - 1 : currentIndex - 1)
        : (currentIndex >= this.focusableElements.length - 1 ? 0 : currentIndex + 1);

    event.preventDefault();
    this.focusableElements[nextIndex].focus();
    this.focusedElementIndex.set(nextIndex);
  }

  private invalidateCache(): void {
    // Clear memoization when date restrictions change
    const currentRestrictions = this.dateRestrictions();
    if (!this.restrictionsEqual(this.lastRestrictions, currentRestrictions)) {
      this.daysMemo.clear();
      this.lastRestrictions = { ...currentRestrictions };
    }
  }

  private restrictionsEqual(a: DateRestrictions | null, b: DateRestrictions): boolean {
    if (!a) return false;
    return a.minDate?.getTime() === b.minDate?.getTime() &&
        a.maxDate?.getTime() === b.maxDate?.getTime() &&
        a.disableFutureDates === b.disableFutureDates &&
        a.disablePastDates === b.disablePastDates;
  }

  generateCalendarDays(): void {
    this.firstMonthDays.set(this.generateMonthDays(this.currentMonth(), 0));
    this.secondMonthDays.set(this.generateMonthDays(this.nextMonth(), 1));
  }

  generateMonthDays(month: Date, monthIndex: number): CalendarDate[] {
    // Use memoization for performance
    const cacheKey = `${month.getTime()}-${monthIndex}-${JSON.stringify(this.dateRestrictions())}`;
    if (this.daysMemo.has(cacheKey)) {
      return this.daysMemo.get(cacheKey)!;
    }

    const days: CalendarDate[] = [];
    const firstDayOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
    const firstDayToShow = new Date(firstDayOfMonth);
    firstDayToShow.setDate(firstDayToShow.getDate() - firstDayOfMonth.getDay());

    // Pre-calculate common values
    const monthTime = month.getMonth();
    const startTime = this.startDate?.setHours(0, 0, 0, 0);
    const endTime = this.endDate?.setHours(0, 0, 0, 0);
    const hoverTime = this.hoverDate()?.setHours(0, 0, 0, 0);

    for (let i = 0; i < 42; i++) {
      const currentDate = new Date(firstDayToShow);
      currentDate.setDate(currentDate.getDate() + i);
      currentDate.setHours(0, 0, 0, 0);

      const currentTime = currentDate.getTime();
      const isCurrentMonth = currentDate.getMonth() === monthTime;

      days.push(this.createCalendarDate(
          currentDate,
          currentTime,
          isCurrentMonth,
          monthIndex,
          startTime,
          endTime,
          hoverTime
      ));
    }

    this.daysMemo.set(cacheKey, days);
    return days;
  }

  private createCalendarDate(
      date: Date,
      dateTime: number,
      isCurrentMonth: boolean,
      monthIndex: number,
      startTime?: number,
      endTime?: number,
      hoverTime?: number
  ): CalendarDate {
    const isToday = dateTime === this.todayTime;
    const isDisabled = this.isDateDisabled(date);

    let isSelected = false;
    let isInRange = false;
    let isRangeStart = false;
    let isRangeEnd = false;
    let isHovered = false;

    // Single date selection
    if (!this.isRange && this.selectedDate) {
      isSelected = this.isSameDay(date, this.selectedDate);
    }

    // Range selection logic
    if (this.isRange) {
      if (this.startDate && this.endDate && startTime && endTime) {
        isRangeStart = this.isSameDay(date, this.startDate);
        isRangeEnd = this.isSameDay(date, this.endDate);
        isInRange = isCurrentMonth && dateTime >= startTime && dateTime <= endTime;
      } else if (this.startDate && !this.endDate && startTime) {
        isRangeStart = this.isSameDay(date, this.startDate);

        if (hoverTime && isCurrentMonth) {
          isHovered = dateTime === hoverTime;
          isInRange = hoverTime >= startTime
              ? (dateTime > startTime && dateTime < hoverTime)
              : (dateTime < startTime && dateTime > hoverTime);
        }
      }
    }

    return {
      date,
      dateTime,
      isCurrentMonth,
      isToday,
      isSelected,
      isInRange,
      isRangeStart,
      isRangeEnd,
      isHovered,
      monthIndex,
      isDisabled
    };
  }

  onDateHover(date: Date): void {
    if (this.isRange && this.selectionInProgress()) {
      this.hoverDate.set(new Date(date));
      this.generateCalendarDays();
    }
  }

  onCalendarMouseLeave(): void {
    if (this.hoverDate()) {
      this.hoverDate.set(null);
      this.generateCalendarDays();
    }
  }

  @HostListener('keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    const dateAttr = target.getAttribute('data-date');
    if (!dateAttr) return;

    const currentDate = new Date(parseInt(dateAttr));
    const newDate = this.calculateNewDate(currentDate, event.key);

    if (newDate) {
      event.preventDefault();

      if (event.key === 'Enter' || event.key === ' ') {
        this.selectDate(currentDate);
        return;
      }

      if (event.key === 'Escape') {
        this.closeCalendar.emit();
        return;
      }

      this.navigateToDate(newDate);
    }
  }

  private calculateNewDate(currentDate: Date, key: string): Date | null {
    const newDate = new Date(currentDate);

    switch (key) {
      case 'ArrowLeft':
        newDate.setDate(newDate.getDate() - 1);
        break;
      case 'ArrowRight':
        newDate.setDate(newDate.getDate() + 1);
        break;
      case 'ArrowUp':
        newDate.setDate(newDate.getDate() - 7);
        break;
      case 'ArrowDown':
        newDate.setDate(newDate.getDate() + 7);
        break;
      case 'Home':
        newDate.setDate(1);
        break;
      case 'End':
        return new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0);
      case 'PageUp':
        newDate.setMonth(newDate.getMonth() - 1);
        break;
      case 'PageDown':
        newDate.setMonth(newDate.getMonth() + 1);
        break;
      case 'Enter':
      case ' ':
      case 'Escape':
        return newDate;
      default:
        return null;
    }

    return newDate;
  }

  private navigateToDate(newDate: Date): void {
    const newMonth = newDate.getMonth();
    const currentVisibleMonth = this.currentMonth().getMonth();
    const nextVisibleMonth = this.nextMonth().getMonth();

    if (newMonth !== currentVisibleMonth && newMonth !== nextVisibleMonth) {
      const newCurrentMonth = new Date(newDate);
      newCurrentMonth.setDate(1);
      this.currentMonth.set(newCurrentMonth);
      this.generateCalendarDays();
    }

    this.focusDateElement(newDate);
  }

  private focusDateElement(date: Date): void {
    // Use requestAnimationFrame for better performance
    requestAnimationFrame(() => {
      const dateTime = date.getTime();
      const element = this.elementRef.nativeElement.querySelector(
          `.day[data-date="${dateTime}"]`
      ) as HTMLElement;

      if (element) {
        element.focus();
        this.updateFocusableElements();
        const newIndex = this.focusableElements.indexOf(element);
        if (newIndex !== -1) {
          this.focusedElementIndex.set(newIndex);
        }
      }
    });
  }

  trackByDate(index: number, day: CalendarDate): number {
    return day.dateTime; // Use pre-calculated dateTime for better performance
  }

  isDateDisabled(date: Date): boolean {
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    const compareTime = compareDate.getTime();

    // Use pre-calculated time today
    if (this.disableFutureDates && compareTime > this.todayTime) return true;
    if (this.disablePastDates && compareTime < this.todayTime) return true;

    if (this.minDate) {
      const minTime = new Date(this.minDate).setHours(0, 0, 0, 0);
      if (compareTime < minTime) return true;
    }

    if (this.maxDate) {
      const maxTime = new Date(this.maxDate).setHours(0, 0, 0, 0);
      if (compareTime > maxTime) return true;
    }

    return false;
  }

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
    if (this.isDateDisabled(date)) return;

    if (!this.isRange) {
      this.selectedDate = new Date(date);
      this.dateSelected.emit(new Date(date));
    } else {
      this.handleRangeSelection(date);
    }

    this.generateCalendarDays();
  }

  private handleRangeSelection(date: Date): void {
    if (!this.selectionInProgress() || !this.startDate) {
      this.startDate = new Date(date);
      this.endDate = null;
      this.selectionInProgress.set(true);
    } else {
      const selectedTime = date.getTime();
      const startTime = this.startDate.getTime();

      if (selectedTime < startTime) {
        this.endDate = new Date(this.startDate);
        this.startDate = new Date(date);
      } else {
        this.endDate = new Date(date);
      }

      this.selectionInProgress.set(false);
      this.hoverDate.set(null);
      this.rangeSelected.emit({
        start: new Date(this.startDate),
        end: new Date(this.endDate)
      });
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
    if (this.isRange) {
      this.applyRangeSelection();
    } else if (this.selectedDate) {
      this.dateSelected.emit(new Date(this.selectedDate));
    }
    this.closeCalendar.emit();
  }

  private applyRangeSelection(): void {
    if (this.startDate && this.endDate) {
      this.rangeSelected.emit({
        start: new Date(this.startDate),
        end: new Date(this.endDate)
      });
    } else if (this.startDate && this.hoverDate()) {
      const hoverDate = this.hoverDate()!;
      const range = hoverDate.getTime() < this.startDate.getTime()
          ? { start: new Date(hoverDate), end: new Date(this.startDate) }
          : { start: new Date(this.startDate), end: new Date(hoverDate) };

      this.rangeSelected.emit(range);
    }
  }
}
