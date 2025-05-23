import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Component, DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule, FormControl, FormGroup } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { DatePickerComponent } from './date-picker.component';
import { CalendarComponent } from "@shared/components/calendar/calendar.component";

// Mock localStorage
const mockLocalStorage = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: jest.fn((key: string) => store[key] || null),
        setItem: jest.fn((key: string, value: string) => {
            store[key] = value;
        }),
        removeItem: jest.fn((key: string) => {
            delete store[key];
        }),
        clear: jest.fn(() => {
            store = {};
        })
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage
});

// Test host component for reactive forms testing
@Component({
    template: `
    <form [formGroup]="testForm">
      <app-date-picker
        formControlName="dateControl"
        [isRange]="isRange"
        [placeholder]="placeholder"
        [rangePlaceholder]="rangePlaceholder"
        [dateFormat]="dateFormat"
        [minDate]="minDate"
        [maxDate]="maxDate"
        [disableFutureDates]="disableFutureDates"
        [disablePastDates]="disablePastDates"
        [storageKey]="storageKey">
      </app-date-picker>
    </form>
  `,
    standalone: false
})
class ReactiveFormHostComponent {
    testForm = new FormGroup({
        dateControl: new FormControl()
    });

    isRange = false;
    placeholder = 'Select date';
    rangePlaceholder = 'Select date range';
    dateFormat = 'mediumDate';
    minDate: Date | null = null;
    maxDate: Date | null = null;
    disableFutureDates = false;
    disablePastDates = false;
    storageKey = 'test-storage-key';

    get dateControl() {
        return this.testForm.get('dateControl');
    }
}

// Simple test host component
@Component({
    template: `
    <app-date-picker
      [isRange]="isRange"
      [placeholder]="placeholder"
      [storageKey]="storageKey">
    </app-date-picker>
  `,
    standalone: false
})
class SimpleHostComponent {
    isRange = false;
    placeholder = 'Select date';
    storageKey = 'simple-test-key';
}

describe('DatePickerComponent', () => {
    let component: DatePickerComponent;
    let hostComponent: ReactiveFormHostComponent;
    let fixture: ComponentFixture<ReactiveFormHostComponent>;
    let datePickerElement: DebugElement;

    const today = new Date();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [
                CommonModule,
                FormsModule,
                ReactiveFormsModule,
                BrowserAnimationsModule,
                DatePickerComponent,
                CalendarComponent
            ],
            declarations: [ReactiveFormHostComponent, SimpleHostComponent],
            providers: [DatePipe]
        }).compileComponents();

        // Clear localStorage before each test
        mockLocalStorage.clear();

        fixture = TestBed.createComponent(ReactiveFormHostComponent);
        hostComponent = fixture.componentInstance;
        datePickerElement = fixture.debugElement.query(By.directive(DatePickerComponent));
        component = datePickerElement.componentInstance;

        // Set consistent dates
        today.setHours(0, 0, 0, 0);
        tomorrow.setHours(0, 0, 0, 0);
        yesterday.setHours(0, 0, 0, 0);

        fixture.detectChanges();
    });

    afterEach(() => {
        mockLocalStorage.clear();
    });

    describe('Component Initialization', () => {
        it('should create', () => {
            expect(component).toBeTruthy();
        });

        it('should initialize with default values', () => {
            expect(component.isRange).toBe(false);
            expect(component.placeholder).toBe('Select date');
            expect(component.showCalendar()).toBe(false);
            expect(component.disabled()).toBe(false);
            expect(component.touched()).toBe(false);
        });

        it('should display placeholder when no date selected', () => {
            const button = fixture.debugElement.query(By.css('.date-picker-button'));
            const valueSpan = button.query(By.css('.date-picker-value'));

            expect(valueSpan.nativeElement.textContent.trim()).toBe('Select date');
            expect(valueSpan.nativeElement).toHaveClass('date-picker-placeholder');
        });

        it('should display range placeholder in range mode', () => {
            hostComponent.isRange = true;
            fixture.detectChanges();

            const button = fixture.debugElement.query(By.css('.date-picker-button'));
            const valueSpan = button.query(By.css('.date-picker-value'));

            expect(valueSpan.nativeElement.textContent.trim()).toBe('Select date range');
        });
    });

    describe('Calendar Toggle', () => {
        it('should open calendar when button clicked', () => {
            const button = fixture.debugElement.query(By.css('.date-picker-button'));

            button.nativeElement.click();
            fixture.detectChanges();

            expect(component.showCalendar()).toBe(true);
            const calendar = fixture.debugElement.query(By.directive(CalendarComponent));
            expect(calendar).toBeTruthy();
        });

        it('should close calendar when clicking outside', fakeAsync(() => {
            // Open calendar
            const button = fixture.debugElement.query(By.css('.date-picker-button'));
            button.nativeElement.click();
            fixture.detectChanges();
            expect(component.showCalendar()).toBe(true);

            // Click outside
            const backdrop = fixture.debugElement.query(By.css('.backdrop'));
            backdrop.nativeElement.click();
            tick();
            fixture.detectChanges();

            expect(component.showCalendar()).toBe(false);
        }));

        it('should not open calendar when disabled', () => {
            component.setDisabledState(true);
            fixture.detectChanges();

            const button = fixture.debugElement.query(By.css('.date-picker-button'));
            button.nativeElement.click();
            fixture.detectChanges();

            expect(component.showCalendar()).toBe(false);
        });

        it('should mark as touched when opening calendar', () => {
            const button = fixture.debugElement.query(By.css('.date-picker-button'));

            button.nativeElement.click();

            expect(component.touched()).toBe(true);
        });
    });

    describe('Single Date Selection', () => {
        beforeEach(() => {
            hostComponent.isRange = false;
            fixture.detectChanges();
        });

        it('should display selected date', () => {
            const testDate = new Date(2024, 5, 15);
            component.writeValue(testDate);
            fixture.detectChanges();

            const valueSpan = fixture.debugElement.query(By.css('.date-picker-value'));
            expect(valueSpan.nativeElement.textContent.trim()).toContain('Jun 15, 2024');
            expect(valueSpan.nativeElement).not.toHaveClass('date-picker-placeholder');
        });

        it('should handle date selection from calendar', () => {
            // Open calendar
            const button = fixture.debugElement.query(By.css('.date-picker-button'));
            button.nativeElement.click();
            fixture.detectChanges();

            // Simulate date selection
            const testDate = new Date(2024, 5, 15);
            component.onDateSelected(testDate);
            fixture.detectChanges();

            expect(component.selectedDate()).toEqual(testDate);
            expect(component.showCalendar()).toBe(false);
        });

        it('should update form control value', () => {
            const testDate = new Date(2024, 5, 15);
            component.onDateSelected(testDate);

            expect(hostComponent.dateControl?.value).toEqual(testDate);
        });

        it('should programmatically set date', () => {
            const testDate = new Date(2024, 5, 15);
            component.setDate(testDate);
            fixture.detectChanges();

            expect(component.selectedDate()).toEqual(testDate);
            expect(hostComponent.dateControl?.value).toEqual(testDate);
        });
    });

    describe('Range Selection', () => {
        beforeEach(() => {
            hostComponent.isRange = true;
            fixture.detectChanges();
        });

        it('should display selected range', () => {
            const startDate = new Date(2024, 5, 15);
            const endDate = new Date(2024, 5, 20);
            const range = { start: startDate, end: endDate };

            component.writeValue(range);
            fixture.detectChanges();

            const valueSpan = fixture.debugElement.query(By.css('.date-picker-value'));
            const text = valueSpan.nativeElement.textContent.trim();
            expect(text).toContain('Jun 15, 2024');
            expect(text).toContain('Jun 20, 2024');
            expect(text).toContain('-');
        });

        it('should display partial range selection', () => {
            component.startDate.set(new Date(2024, 5, 15));
            fixture.detectChanges();

            const valueSpan = fixture.debugElement.query(By.css('.date-picker-value'));
            const text = valueSpan.nativeElement.textContent.trim();
            expect(text).toContain('Jun 15, 2024');
            expect(text).toContain('Select end date');
        });

        it('should handle range selection from calendar', () => {
            const startDate = new Date(2024, 5, 15);
            const endDate = new Date(2024, 5, 20);
            const range = { start: startDate, end: endDate };

            component.onRangeSelected(range);
            fixture.detectChanges();

            expect(component.startDate()).toEqual(startDate);
            expect(component.endDate()).toEqual(endDate);
            expect(hostComponent.dateControl?.value).toEqual(range);
        });

        it('should programmatically set date range', () => {
            const startDate = new Date(2024, 5, 15);
            const endDate = new Date(2024, 5, 20);

            component.setDateRange(startDate, endDate);
            fixture.detectChanges();

            expect(component.startDate()).toEqual(startDate);
            expect(component.endDate()).toEqual(endDate);
        });
    });

    describe('Date Restrictions', () => {
        it('should set min date', () => {
            const minDate = new Date(2024, 5, 1);
            component.setMinDate(minDate);

            expect(component.minDate).toEqual(minDate);
        });

        it('should set max date', () => {
            const maxDate = new Date(2024, 5, 30);
            component.setMaxDate(maxDate);

            expect(component.maxDate).toEqual(maxDate);
        });

        it('should set min date from string', () => {
            const dateString = '2024-06-01';
            component.setMinDate(dateString);

            expect(component.minDate).toEqual(new Date(dateString));
        });

        it('should disable future dates', () => {
            component.setDisableFutureDates(true);

            expect(component.disableFutureDates).toBe(true);
        });

        it('should disable past dates', () => {
            component.setDisablePastDates(true);

            expect(component.disablePastDates).toBe(true);
        });
    });

    describe('ControlValueAccessor', () => {
        it('should implement writeValue for single date', () => {
            const testDate = new Date(2024, 5, 15);
            component.writeValue(testDate);

            expect(component.selectedDate()).toEqual(testDate);
        });

        it('should implement writeValue for date range', () => {
            hostComponent.isRange = true;
            const range = {
                start: new Date(2024, 5, 15),
                end: new Date(2024, 5, 20)
            };

            component.writeValue(range);

            expect(component.startDate()).toEqual(range.start);
            expect(component.endDate()).toEqual(range.end);
        });

        it('should handle null value', () => {
            component.writeValue(null);

            expect(component.selectedDate()).toBeNull();
            expect(component.startDate()).toBeNull();
            expect(component.endDate()).toBeNull();
        });

        it('should register onChange callback', () => {
            const onChangeSpy = jest.fn();
            component.registerOnChange(onChangeSpy);

            const testDate = new Date(2024, 5, 15);
            component.onDateSelected(testDate);

            expect(onChangeSpy).toHaveBeenCalledWith(testDate);
        });

        it('should register onTouched callback', () => {
            const onTouchedSpy = jest.fn();
            component.registerOnTouched(onTouchedSpy);

            const button = fixture.debugElement.query(By.css('.date-picker-button'));
            button.nativeElement.click();

            expect(onTouchedSpy).toHaveBeenCalled();
        });

        it('should handle disabled state', () => {
            component.setDisabledState(true);

            expect(component.disabled()).toBe(true);

            const button = fixture.debugElement.query(By.css('.date-picker-button'));
            expect(button.nativeElement.disabled).toBe(true);
        });
    });

    describe('Local Storage Persistence', () => {
        let simpleFixture: ComponentFixture<SimpleHostComponent>;
        let simpleComponent: DatePickerComponent;

        beforeEach(fakeAsync(() => {
            simpleFixture = TestBed.createComponent(SimpleHostComponent);
            const simpleElement = simpleFixture.debugElement.query(By.directive(DatePickerComponent));
            simpleComponent = simpleElement.componentInstance;
            simpleFixture.detectChanges();
            tick(200); // Wait for debounced save effect
        }));

        it('should save single date selection to localStorage', fakeAsync(() => {
            const testDate = new Date(2024, 5, 15);
            simpleComponent.setDate(testDate);
            tick(200); // Wait for debounced save

            expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
                'simple-test-key',
                JSON.stringify({ selectedDate: testDate.toISOString() })
            );
        }));

        it('should save range selection to localStorage', fakeAsync(() => {
            simpleFixture.componentInstance.isRange = true;
            simpleFixture.detectChanges();

            const startDate = new Date(2024, 5, 15);
            const endDate = new Date(2024, 5, 20);
            simpleComponent.setDateRange(startDate, endDate);
            tick(200); // Wait for debounced save

            expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
                'simple-test-key',
                JSON.stringify({
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString()
                })
            );
        }));

        it('should load saved selection on initialization', () => {
            const testDate = new Date(2024, 5, 15);
            mockLocalStorage.setItem('new-storage-key', JSON.stringify({
                selectedDate: testDate.toISOString()
            }));

            // Create new component with different storage key
            const newFixture = TestBed.createComponent(SimpleHostComponent);
            newFixture.componentInstance.storageKey = 'new-storage-key';
            newFixture.detectChanges();

            const newComponent = newFixture.debugElement.query(By.directive(DatePickerComponent)).componentInstance;

            expect(newComponent.selectedDate()?.getTime()).toBe(testDate.getTime());
        });

        it('should clear localStorage when clearing selection', () => {
            simpleComponent.clearSelection();

            expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('simple-test-key');
        });

        it('should handle localStorage errors gracefully', () => {
            mockLocalStorage.setItem.mockImplementation(() => {
                throw new Error('Storage error');
            });

            expect(() => {
                simpleComponent.setDate(new Date());
            }).not.toThrow();
        });
    });

    describe('Display Value Computation', () => {
        it('should compute display value for single date', () => {
            hostComponent.isRange = false;
            component.selectedDate.set(new Date(2024, 5, 15));
            fixture.detectChanges();

            expect(component.displayValue()).toContain('Jun 15, 2024');
        });

        it('should compute display value for complete range', () => {
            hostComponent.isRange = true;
            component.startDate.set(new Date(2024, 5, 15));
            component.endDate.set(new Date(2024, 5, 20));
            fixture.detectChanges();

            const displayValue = component.displayValue();
            expect(displayValue).toContain('Jun 15, 2024');
            expect(displayValue).toContain('Jun 20, 2024');
            expect(displayValue).toContain('-');
        });

        it('should compute display value for partial range', () => {
            hostComponent.isRange = true;
            component.startDate.set(new Date(2024, 5, 15));
            fixture.detectChanges();

            const displayValue = component.displayValue();
            expect(displayValue).toContain('Jun 15, 2024');
            expect(displayValue).toContain('Select end date');
        });

        it('should show placeholder when no selection', () => {
            expect(component.displayValue()).toBe('Select date');
        });
    });

    describe('Validation State', () => {
        it('should be invalid for single date mode with no selection', () => {
            hostComponent.isRange = false;
            fixture.detectChanges();

            expect(component.isValid()).toBe(false);
        });

        it('should be valid for single date mode with selection', () => {
            hostComponent.isRange = false;
            component.selectedDate.set(new Date());
            fixture.detectChanges();

            expect(component.isValid()).toBe(true);
        });

        it('should be invalid for range mode with no selection', () => {
            hostComponent.isRange = true;
            fixture.detectChanges();

            expect(component.isValid()).toBe(false);
        });

        it('should be invalid for range mode with partial selection', () => {
            hostComponent.isRange = true;
            component.startDate.set(new Date());
            fixture.detectChanges();

            expect(component.isValid()).toBe(false);
        });

        it('should be valid for range mode with complete selection', () => {
            hostComponent.isRange = true;
            component.startDate.set(new Date(2024, 5, 15));
            component.endDate.set(new Date(2024, 5, 20));
            fixture.detectChanges();

            expect(component.isValid()).toBe(true);
        });
    });

    describe('Date Formatting', () => {
        it('should format date with default format', () => {
            const testDate = new Date(2024, 5, 15);
            const formatted = component['formatDate'](testDate);

            expect(formatted).toContain('Jun 15, 2024');
        });

        it('should format date with custom format', () => {
            hostComponent.dateFormat = 'shortDate';
            fixture.detectChanges();

            const testDate = new Date(2024, 5, 15);
            const formatted = component['formatDate'](testDate);

            expect(formatted).toMatch(/6\/15\/24/);
        });
    });

    describe('Error Handling', () => {
        it('should handle invalid date gracefully', () => {
            expect(() => {
                component.writeValue(new Date('invalid'));
            }).not.toThrow();
        });

        it('should handle malformed localStorage data', () => {
            mockLocalStorage.getItem.mockReturnValue('invalid json');

            expect(() => {
                const newFixture = TestBed.createComponent(SimpleHostComponent);
                newFixture.detectChanges();
            }).not.toThrow();
        });

        it('should handle missing localStorage gracefully', () => {
            // Temporarily remove localStorage
            const originalLocalStorage = window.localStorage;
            delete (window as any).localStorage;

            expect(() => {
                const newComponent = new DatePickerComponent();
                newComponent.ngOnInit();
            }).not.toThrow();

            // Restore localStorage
            (window as any).localStorage = originalLocalStorage;
        });
    });

    describe('Component Integration', () => {
        it('should pass correct props to calendar component', () => {
            // Open calendar
            const button = fixture.debugElement.query(By.css('.date-picker-button'));
            button.nativeElement.click();
            fixture.detectChanges();

            const calendar = fixture.debugElement.query(By.directive(CalendarComponent));
            const calendarComponent = calendar.componentInstance;

            expect(calendarComponent.isRange).toBe(component.isRange);
            expect(calendarComponent.selectedDate).toBe(component.selectedDate());
            expect(calendarComponent.minDate).toBe(component.minDate);
            expect(calendarComponent.maxDate).toBe(component.maxDate);
        });

        it('should handle calendar events correctly', () => {
            // Open calendar
            const button = fixture.debugElement.query(By.css('.date-picker-button'));
            button.nativeElement.click();
            fixture.detectChanges();

            const calendar = fixture.debugElement.query(By.directive(CalendarComponent));
            const calendarComponent = calendar.componentInstance;

            const testDate = new Date(2024, 5, 15);
            calendarComponent.dateSelected.emit(testDate);

            expect(component.selectedDate()).toEqual(testDate);
            expect(component.showCalendar()).toBe(false);
        });
    });
});
