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
      this.startDate.set(new Date(value.start));
      this.endDate.set(new Date(value.end));
    } else if (!this.isRange && value instanceof Date) {
      this.selectedDate.set(new Date(value));
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

  onDateSelected(date: Date): void {
    this.selectedDate.set(date);
    this.showCalendar.set(false);
    this.onChange(date);
    this.markAsTouched();
  }

  onRangeSelected(range: { start: Date, end: Date }): void {
    this.startDate.set(range.start);
    this.endDate.set(range.end);
    this.onChange(range);
    this.markAsTouched();
  }

  onCloseCalendar(): void {
    this.showCalendar.set(false);
    this.markAsTouched();
  }

  // Programmatic control methods
  setDateRange(start: Date, end: Date): void {
    const range = { start: new Date(start), end: new Date(end) };
    this.startDate.set(range.start);
    this.endDate.set(range.end);
    this.onChange(range);
    this.markAsTouched();
  }

  setDate(date: Date): void {
    const newDate = new Date(date);
    this.selectedDate.set(newDate);
    this.onChange(newDate);
    this.markAsTouched();
  }

  clearSelection(): void {
    this.storageManager.clear();
    this.resetValues();
    this.onChange(null);
    this.markAsTouched();
  }

  // Date restriction helpers
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

  // Private helper methods
  private markAsTouched(): void {
    if (!this.touched()) {
      this.touched.set(true);
      this.onTouched();
    }
  }

  private formatDate(date: Date): string {
    return this.datePipe.transform(date, this.dateFormat) || '';
  }

  private getStorageKey(): string {
    return this.storageKey || 'datepicker-selection';
  }

  private resetValues(): void {
    this.selectedDate.set(null);
    this.startDate.set(null);
    this.endDate.set(null);
  }

  private isRangeValue(value: any): value is { start: Date, end: Date } {
    return value && typeof value === 'object' && 'start' in value && 'end' in value;
  }

  private createStoredSelection(): StoredSelection {
    if (this.isRange) {
      return {
        startDate: this.startDate()?.toISOString(),
        endDate: this.endDate()?.toISOString()
      };
    }
    return {
      selectedDate: this.selectedDate()?.toISOString()
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
        if (saved.startDate) this.startDate.set(new Date(saved.startDate));
        if (saved.endDate) this.endDate.set(new Date(saved.endDate));

        if (saved.startDate && saved.endDate) {
          this.onChange({
            start: new Date(saved.startDate),
            end: new Date(saved.endDate)
          });
        }
      } else if (saved.selectedDate) {
        const date = new Date(saved.selectedDate);
        this.selectedDate.set(date);
        this.onChange(date);
      }
    } catch (error) {
      console.warn('Error loading saved date selection:', error);
      this.resetValues();
    }
  }
}
