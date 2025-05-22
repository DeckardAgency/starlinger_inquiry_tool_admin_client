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
  ElementRef
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  FormsModule,
  ReactiveFormsModule
} from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import {CalendarComponent} from "@shared/components/calendar/calendar.component";

@Component({
  selector: 'app-date-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, CalendarComponent, DatePipe],
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
  private datePipe = new DatePipe(this.locale);

  // Configuration inputs
  @Input() isRange = true;
  @Input() placeholder = 'Select date';
  @Input() rangePlaceholder = 'Select date range';
  @Input() dateFormat = 'mediumDate';

  // Date restrictions
  @Input() minDate: Date | null = null;
  @Input() maxDate: Date | null = null;
  @Input() disableFutureDates = false;
  @Input() disablePastDates = false;

  // Storage key for persistence
  @Input() storageKey: string | null = null;

  // UI state signals
  showCalendar = signal<boolean>(false);
  disabled = signal<boolean>(false);
  touched = signal<boolean>(false);

  // Value state signals for both single date and range modes
  selectedDate = signal<Date | null>(null);
  startDate = signal<Date | null>(null);
  endDate = signal<Date | null>(null);

  // Display value based on current selection
  displayValue = computed(() => {
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

  // Control Value Accessor callbacks
  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private elementRef: ElementRef) {
    // Load saved selection
    if (typeof window !== 'undefined') {
      this.loadSavedSelection();
    }
  }

  ngOnInit(): void {
    // Additional initialization if needed
  }

  // ControlValueAccessor methods
  writeValue(value: Date | { start: Date, end: Date } | null): void {
    if (!value) {
      // Reset values
      this.selectedDate.set(null);
      this.startDate.set(null);
      this.endDate.set(null);
      return;
    }

    if (this.isRange && value && typeof value === 'object' && 'start' in value && 'end' in value) {
      // Handle range value
      this.startDate.set(new Date(value.start));
      this.endDate.set(new Date(value.end));
    } else if (!this.isRange && value instanceof Date) {
      // Handle single date value
      this.selectedDate.set(new Date(value));
    }
  }

  registerOnChange(fn: (value: any) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  // Mark as touched
  markAsTouched(): void {
    if (!this.touched()) {
      this.touched.set(true);
      this.onTouched();
    }
  }

  // UI event handlers
  toggleCalendar(event: MouseEvent): void {
    // Don't toggle if disabled
    if (this.disabled()) {
      return;
    }

    event.stopPropagation();
    const newValue = !this.showCalendar();
    this.showCalendar.set(newValue);

    // Mark as touched when opening calendar
    if (newValue) {
      this.markAsTouched();
    }
  }

  onDateSelected(date: Date): void {
    this.selectedDate.set(date);
    this.saveSelection();
    this.showCalendar.set(false);
    this.onChange(date);
    this.markAsTouched();
  }

  onRangeSelected(range: { start: Date, end: Date }): void {
    this.startDate.set(range.start);
    this.endDate.set(range.end);
    this.saveSelection();
    this.onChange(range);
    this.markAsTouched();
  }

  onCloseCalendar(): void {
    this.showCalendar.set(false);
    this.markAsTouched();
  }

  // Helper methods
  formatDate(date: Date): string {
    return this.datePipe.transform(date, this.dateFormat) || '';
  }

  // Helper methods to set date restrictions
  setMinDate(date: Date | string): void {
    this.minDate = typeof date === 'string' ? new Date(date) : date;
  }

  setMaxDate(date: Date | string): void {
    this.maxDate = typeof date === 'string' ? new Date(date) : date;
  }

  setDisableFutureDates(disable: boolean): void {
    this.disableFutureDates = disable;
  }

  setDisablePastDates(disable: boolean): void {
    this.disablePastDates = disable;
  }

  // Public API for programmatic control
  setDateRange(start: Date, end: Date): void {
    const range = { start: new Date(start), end: new Date(end) };
    this.startDate.set(range.start);
    this.endDate.set(range.end);
    this.saveSelection();
    this.onChange(range);
    this.markAsTouched();
  }

  setDate(date: Date): void {
    const newDate = new Date(date);
    this.selectedDate.set(newDate);
    this.saveSelection();
    this.onChange(newDate);
    this.markAsTouched();
  }

  clearSelection(): void {
    this.clearStoredSelection();

    if (this.isRange) {
      this.startDate.set(null);
      this.endDate.set(null);
      this.onChange(null);
    } else {
      this.selectedDate.set(null);
      this.onChange(null);
    }

    this.markAsTouched();
  }

  // Storage methods for persistence
  private getStorageKey(): string {
    return this.storageKey || 'datepicker-selection';
  }

  private loadSavedSelection(): void {
    try {
      const key = this.getStorageKey();
      const savedSelection = localStorage.getItem(key);

      if (savedSelection) {
        const parsed = JSON.parse(savedSelection);

        if (this.isRange) {
          // Handle range selection
          if (parsed.startDate) {
            this.startDate.set(new Date(parsed.startDate));
          }
          if (parsed.endDate) {
            this.endDate.set(new Date(parsed.endDate));
          }

          // Notify change if both dates are present
          if (parsed.startDate && parsed.endDate) {
            this.onChange({
              start: new Date(parsed.startDate),
              end: new Date(parsed.endDate)
            });
          }
        } else {
          // Handle single date selection
          if (parsed.selectedDate) {
            const date = new Date(parsed.selectedDate);
            this.selectedDate.set(date);
            this.onChange(date);
          }
        }
      }
    } catch (error) {
      console.error('Error loading saved date selection:', error);
      // If loading fails, reset to default state
      this.resetToDefaultState();
    }
  }

  private saveSelection(): void {
    try {
      const key = this.getStorageKey();
      const selection = this.isRange
          ? {
            startDate: this.startDate() ? this.startDate()!.toISOString() : null,
            endDate: this.endDate() ? this.endDate()!.toISOString() : null
          }
          : {
            selectedDate: this.selectedDate() ? this.selectedDate()!.toISOString() : null
          };

      localStorage.setItem(key, JSON.stringify(selection));
    } catch (error) {
      console.error('Error saving date selection:', error);
    }
  }

  private clearStoredSelection(): void {
    try {
      const key = this.getStorageKey();
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error clearing date selection:', error);
    }
  }

  private resetToDefaultState(): void {
    this.selectedDate.set(null);
    this.startDate.set(null);
    this.endDate.set(null);
  }
}
