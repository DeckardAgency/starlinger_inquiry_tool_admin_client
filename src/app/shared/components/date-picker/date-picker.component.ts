import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  inject,
  DestroyRef,
  signal,
  computed,
  LOCALE_ID,
  forwardRef,
  Input,
  ElementRef,
  effect,
  Injector
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  FormsModule,
  ReactiveFormsModule
} from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { CalendarComponent } from "@shared/components/calendar/calendar.component";

type DateValue = Date | { start: Date, end: Date } | null;

interface StoredSelection {
  selectedDate?: string;
  startDate?: string;
  endDate?: string;
}

@Component({
  selector: 'app-date-picker',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, CalendarComponent],
  templateUrl: './date-picker.component.html',
  styleUrls: ['./date-picker.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DatePickerComponent),
      multi: true
    }
  ],
  animations: [
    trigger('calendarAnimation', [
      transition('void => visible', [
        style({
          opacity: 0,
          transform: 'translateY(-20px) scale(0.95)'
        }),
        animate('200ms ease-out', style({
          opacity: 1,
          transform: 'translateY(0) scale(1)'
        }))
      ]),
      transition('visible => hidden', [
        animate('150ms ease-in', style({
          opacity: 0,
          transform: 'translateY(-20px) scale(0.95)'
        }))
      ])
    ])
  ]
})
export class DatePickerComponent implements OnInit, ControlValueAccessor {
  private readonly destroyRef = inject(DestroyRef);
  private readonly locale = inject(LOCALE_ID);
  private readonly datePipe = new DatePipe(this.locale);
  private readonly elementRef = inject(ElementRef);
  private readonly injector = inject(Injector);

  // Configuration inputs
  @Input() isRange = true;
  @Input() placeholder = 'Select date';
  @Input() rangePlaceholder = 'Select date range';
  @Input() dateFormat = 'mediumDate';
  @Input() monthsToShow: 1 | 2 = 2; // New input for number of months to display

  // Date restrictions
  @Input() minDate: Date | null = null;
  @Input() maxDate: Date | null = null;
  @Input() disableFutureDates = false;
  @Input() disablePastDates = false;

  // Storage key for persistence
  @Input() storageKey: string | null = null;

  // UI state signals
  readonly showCalendar = signal<boolean>(false);
  readonly disabled = signal<boolean>(false);
  readonly touched = signal<boolean>(false);

  // Value state signals
  readonly selectedDate = signal<Date | null>(null);
  readonly startDate = signal<Date | null>(null);
  readonly endDate = signal<Date | null>(null);
  readonly hoveredDate = signal<Date | null>(null);
  readonly isSelectingRange = signal<boolean>(false);

  // Computed display value with memoization
  readonly displayValue = computed(() => {
    if (this.isRange) {
      const start = this.startDate();
      const end = this.endDate();

      if (start && end) {
        return `${this.formatDate(start)} - ${this.formatDate(end)}`;
      } else if (start) {
        return `${this.formatDate(start)} - Select end date`;
      } else {
        return this.rangePlaceholder;
      }
    } else {
      const date = this.selectedDate();
      return date ? this.formatDate(date) : this.placeholder;
    }
  });

  // Computed validation state
  readonly isValid = computed(() => {
    if (this.isRange) {
      return this.startDate() && this.endDate();
    }
    return !!this.selectedDate();
  });

  // Control Value Accessor callbacks
  private onChange: (value: DateValue) => void = () => {};
  private onTouched: () => void = () => {};

  // Storage management
  private readonly storageManager = {
    save: (selection: StoredSelection) => {
      try {
        if (typeof window === 'undefined') return;
        const key = this.getStorageKey();
        localStorage.setItem(key, JSON.stringify(selection));
      } catch (error) {
        console.warn('Failed to save date selection:', error);
      }
    },

    load: (): StoredSelection | null => {
      try {
        if (typeof window === 'undefined') return null;
        const key = this.getStorageKey();
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : null;
      } catch (error) {
        console.warn('Failed to load date selection:', error);
        return null;
      }
    },

    clear: () => {
      try {
        if (typeof window === 'undefined') return;
        const key = this.getStorageKey();
        localStorage.removeItem(key);
      } catch (error) {
        console.warn('Failed to clear date selection:', error);
      }
    }
  };

  constructor() {
    // Auto-save effect with debouncing
    effect(() => {
      const selection = this.createStoredSelection();
      if (this.shouldSave(selection)) {
        // Use setTimeout for debouncing
        setTimeout(() => this.storageManager.save(selection), 100);
      }
    }, { injector: this.injector });

    // Load saved selection on init
    if (typeof window !== 'undefined') {
      this.loadSavedSelection();
    }
  }

  ngOnInit(): void {
    // Component is fully initialized via constructor and effects
  }

  // ControlValueAccessor implementation
  writeValue(value: DateValue): void {
    if (!value) {
      this.resetValues();
      return;
    }

    if (this.isRange && this.isRangeValue(value)) {
      // Ensure dates are normalized to avoid timezone issues
      this.startDate.set(this.normalizeDate(value.start));
      this.endDate.set(this.normalizeDate(value.end));
    } else if (!this.isRange && value instanceof Date) {
      this.selectedDate.set(this.normalizeDate(value));
    }
  }

  registerOnChange(fn: (value: DateValue) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  // Public API methods
  toggleCalendar(event: MouseEvent): void {
    if (this.disabled()) return;

    event.stopPropagation();
    const newValue = !this.showCalendar();
    this.showCalendar.set(newValue);

    if (newValue) {
      this.markAsTouched();
    }
  }

  onRangeSelected(range: { start: Date, end: Date }): void {
    const normalizedRange = {
      start: this.normalizeDate(range.start),
      end: this.normalizeDate(range.end)
    };
    this.startDate.set(normalizedRange.start);
    this.endDate.set(normalizedRange.end);
    this.isSelectingRange.set(false);
    this.hoveredDate.set(null);
    this.showCalendar.set(false);
    this.onChange(normalizedRange);
    this.markAsTouched();
  }

  onDateSelected(date: Date): void {
    if (this.isRange) {
      // Handle range selection step by step
      if (!this.startDate()) {
        // First click - select start date
        this.startDate.set(this.normalizeDate(date));
        this.isSelectingRange.set(true);
        this.markAsTouched();
      } else if (!this.endDate()) {
        // Second click - complete the range
        const endDate = this.normalizeDate(date);
        const startDate = this.startDate()!;

        // Ensure start is before end
        if (startDate.getTime() <= endDate.getTime()) {
          this.onRangeSelected({ start: startDate, end: endDate });
        } else {
          this.onRangeSelected({ start: endDate, end: startDate });
        }
      } else {
        // Reset and start new selection
        this.startDate.set(this.normalizeDate(date));
        this.endDate.set(null);
        this.isSelectingRange.set(true);
        this.markAsTouched();
      }
    } else {
      // Single date selection
      const normalizedDate = this.normalizeDate(date);
      this.selectedDate.set(normalizedDate);
      this.showCalendar.set(false);
      this.onChange(normalizedDate);
      this.markAsTouched();
    }
  }

  onRangeStartSelected(date: Date): void {
    const normalizedDate = this.normalizeDate(date);
    this.startDate.set(normalizedDate);
    this.endDate.set(null);
    this.isSelectingRange.set(true);
    this.hoveredDate.set(null);
    this.markAsTouched();
  }

  onDateHovered(date: Date | null): void {
    if (this.isRange && this.isSelectingRange()) {
      this.hoveredDate.set(date ? this.normalizeDate(date) : null);
    }
  }

  onCloseCalendar(): void {
    this.showCalendar.set(false);
    this.isSelectingRange.set(false);
    this.hoveredDate.set(null);
    this.markAsTouched();
  }

  // Programmatic control methods
  setDateRange(start: Date, end: Date): void {
    const range = {
      start: this.normalizeDate(start),
      end: this.normalizeDate(end)
    };
    this.startDate.set(range.start);
    this.endDate.set(range.end);
    this.isSelectingRange.set(false);
    this.hoveredDate.set(null);
    this.onChange(range);
    this.markAsTouched();
  }

  setDate(date: Date): void {
    const normalizedDate = this.normalizeDate(date);
    this.selectedDate.set(normalizedDate);
    this.onChange(normalizedDate);
    this.markAsTouched();
  }

  clearSelection(): void {
    this.storageManager.clear();
    this.resetValues();
    this.isSelectingRange.set(false);
    this.hoveredDate.set(null);
    this.onChange(null);
    this.markAsTouched();
  }

  // Date restriction helpers
  setMinDate(date: Date | string): void {
    this.minDate = typeof date === 'string' ? this.parseDate(date) : this.normalizeDate(date);
  }

  setMaxDate(date: Date | string): void {
    this.maxDate = typeof date === 'string' ? this.parseDate(date) : this.normalizeDate(date);
  }

  setDisableFutureDates(disable: boolean): void {
    this.disableFutureDates = disable;
  }

  setDisablePastDates(disable: boolean): void {
    this.disablePastDates = disable;
  }

  // Private helper methods
  private markAsTouched(): void {
    if (!this.touched()) {
      this.touched.set(true);
      this.onTouched();
    }
  }

  formatDate(date: Date): string {
    return this.datePipe.transform(date, this.dateFormat) || '';
  }

  private getStorageKey(): string {
    return this.storageKey || 'datepicker-selection';
  }

  private resetValues(): void {
    this.selectedDate.set(null);
    this.startDate.set(null);
    this.endDate.set(null);
    this.isSelectingRange.set(false);
    this.hoveredDate.set(null);
  }

  private isRangeValue(value: any): value is { start: Date, end: Date } {
    return value && typeof value === 'object' && 'start' in value && 'end' in value;
  }

  /**
   * Normalizes a date to ensure consistent behavior across timezones
   * Sets time to noon (12:00) in local timezone to avoid DST issues
   */
  private normalizeDate(date: Date): Date {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      throw new Error('Invalid date provided to normalizeDate');
    }

    const normalized = new Date(date);
    // Set to noon to avoid timezone issues when dates cross DST boundaries
    normalized.setHours(12, 0, 0, 0);
    return normalized;
  }

  /**
   * Parses a date string to a normalized Date object
   * Handles both ISO strings and date-only strings (YYYY-MM-DD)
   */
  private parseDate(dateString: string): Date {
    // Handle date-only format (YYYY-MM-DD) to avoid timezone issues
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-').map(Number);
      return new Date(year, month - 1, day, 12, 0, 0, 0);
    }

    // Handle ISO string or other formats
    const parsed = new Date(dateString);
    return this.normalizeDate(parsed);
  }

  /**
   * Converts a date to a date-only string (YYYY-MM-DD) to avoid timezone issues in storage
   */
  private dateToDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private createStoredSelection(): StoredSelection {
    if (this.isRange) {
      return {
        startDate: this.startDate() ? this.dateToDateString(this.startDate()!) : undefined,
        endDate: this.endDate() ? this.dateToDateString(this.endDate()!) : undefined
      };
    }
    return {
      selectedDate: this.selectedDate() ? this.dateToDateString(this.selectedDate()!) : undefined
    };
  }

  private shouldSave(selection: StoredSelection): boolean {
    if (this.isRange) {
      return !!(selection.startDate && selection.endDate);
    }
    return !!selection.selectedDate;
  }

  private loadSavedSelection(): void {
    const saved = this.storageManager.load();
    if (!saved) return;

    try {
      if (this.isRange) {
        if (saved.startDate) this.startDate.set(this.parseDate(saved.startDate));
        if (saved.endDate) this.endDate.set(this.parseDate(saved.endDate));

        if (saved.startDate && saved.endDate) {
          this.onChange({
            start: this.parseDate(saved.startDate),
            end: this.parseDate(saved.endDate)
          });
        }
      } else if (saved.selectedDate) {
        const date = this.parseDate(saved.selectedDate);
        this.selectedDate.set(date);
        this.onChange(date);
      }
    } catch (error) {
      console.warn('Error loading saved date selection:', error);
      this.resetValues();
    }
  }
}
