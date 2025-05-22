import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { CommonModule, DatePipe } from '@angular/common';
import { CalendarComponent, CalendarDate } from './calendar.component';

// Test host component for the testing calendar in isolation
@Component({
    template: `
    <app-calendar
      [isRange]="isRange"
      [selectedDate]="selectedDate"
      [startDate]="startDate"
      [endDate]="endDate"
      [minDate]="minDate"
      [maxDate]="maxDate"
      [disableFutureDates]="disableFutureDates"
      [disablePastDates]="disablePastDates"
      (dateSelected)="onDateSelected($event)"
      (rangeSelected)="onRangeSelected($event)"
      (closeCalendar)="onCloseCalendar()">
    </app-calendar>
  `
})
class TestHostComponent {
    isRange = false;
    selectedDate: Date | null = null;
    startDate: Date | null = null;
    endDate: Date | null = null;
    minDate: Date | null = null;
    maxDate: Date | null = null;
    disableFutureDates = false;
    disablePastDates = false;

    dateSelectedSpy = jest.fn();
    rangeSelectedSpy = jest.fn();
    closeCalendarSpy = jest.fn();

    onDateSelected(date: Date): void {
        this.dateSelectedSpy(date);
        this.selectedDate = date;
    }

    onRangeSelected(range: { start: Date, end: Date }): void {
        this.rangeSelectedSpy(range);
        this.startDate = range.start;
        this.endDate = range.end;
    }

    onCloseCalendar(): void {
        this.closeCalendarSpy();
    }
}

describe('CalendarComponent', () => {
    let component: CalendarComponent;
    let hostComponent: TestHostComponent;
    let fixture: ComponentFixture<TestHostComponent>;
    let calendarElement: DebugElement;

    const today = new Date();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [CommonModule, CalendarComponent],
            declarations: [TestHostComponent],
            providers: [DatePipe]
        }).compileComponents();

        fixture = TestBed.createComponent(TestHostComponent);
        hostComponent = fixture.componentInstance;
        calendarElement = fixture.debugElement.query(By.directive(CalendarComponent));
        component = calendarElement.componentInstance;

        // Set consistent date for testing
        today.setHours(0, 0, 0, 0);
        tomorrow.setHours(0, 0, 0, 0);
        yesterday.setHours(0, 0, 0, 0);
    });

    describe('Component Initialization', () => {
        it('should create', () => {
            expect(component).toBeTruthy();
        });

        it('should initialize with current month when no dates provided', () => {
            fixture.detectChanges();

            const currentMonth = component.currentMonth();
            const expectedMonth = new Date();
            expectedMonth.setDate(1);
            expectedMonth.setHours(0, 0, 0, 0);

            expect(currentMonth.getMonth()).toBe(expectedMonth.getMonth());
            expect(currentMonth.getFullYear()).toBe(expectedMonth.getFullYear());
        });

        it('should initialize with selected date month in single date mode', () => {
            const testDate = new Date(2024, 5, 15); // June 15, 2024
            hostComponent.isRange = false;
            hostComponent.selectedDate = testDate;
            fixture.detectChanges();

            const currentMonth = component.currentMonth();
            expect(currentMonth.getMonth()).toBe(5); // June
            expect(currentMonth.getFullYear()).toBe(2024);
        });

        it('should initialize with start date month in range mode', () => {
            const startDate = new Date(2024, 3, 10); // April 10, 2024
            hostComponent.isRange = true;
            hostComponent.startDate = startDate;
            fixture.detectChanges();

            const currentMonth = component.currentMonth();
            expect(currentMonth.getMonth()).toBe(3); // April
            expect(currentMonth.getFullYear()).toBe(2024);
        });
    });

    describe('Single Date Selection', () => {
        beforeEach(() => {
            hostComponent.isRange = false;
            fixture.detectChanges();
        });

        it('should select a date when clicked', () => {
            const dayElements = fixture.debugElement.queryAll(By.css('.day.current-month:not(.disabled)'));
            const firstDay = dayElements[0];

            firstDay.nativeElement.click();

            expect(hostComponent.dateSelectedSpy).toHaveBeenCalled();
            expect(hostComponent.selectedDate).toBeTruthy();
        });

        it('should highlight selected date', () => {
            hostComponent.selectedDate = today;
            fixture.detectChanges();

            const selectedDay = fixture.debugElement.query(By.css('.day.selected'));
            expect(selectedDay).toBeTruthy();
            expect(selectedDay.nativeElement.textContent.trim()).toBe(today.getDate().toString());
        });

        it('should not select disabled dates', () => {
            hostComponent.disableFutureDates = true;
            fixture.detectChanges();

            const futureDays = fixture.debugElement.queryAll(By.css('.day.disabled'));
            if (futureDays.length > 0) {
                futureDays[0].nativeElement.click();
                expect(hostComponent.dateSelectedSpy).not.toHaveBeenCalled();
            }
        });
    });

    describe('Range Selection', () => {
        beforeEach(() => {
            hostComponent.isRange = true;
            fixture.detectChanges();
        });

        it('should start range selection on first click', () => {
            const dayElements = fixture.debugElement.queryAll(By.css('.day.current-month:not(.disabled)'));
            const firstDay = dayElements[0];

            firstDay.nativeElement.click();

            expect(component.selectionInProgress()).toBe(true);
            expect(component.startDate).toBeTruthy();
            expect(component.endDate).toBeFalsy();
        });

        it('should complete range selection on second click', () => {
            const dayElements = fixture.debugElement.queryAll(By.css('.day.current-month:not(.disabled)'));
            const firstDay = dayElements[0];
            const secondDay = dayElements[7]; // One week later

            // First click
            firstDay.nativeElement.click();
            fixture.detectChanges();

            // Second click
            secondDay.nativeElement.click();

            expect(component.selectionInProgress()).toBe(false);
            expect(hostComponent.rangeSelectedSpy).toHaveBeenCalled();
            expect(component.startDate).toBeTruthy();
            expect(component.endDate).toBeTruthy();
        });

        it('should swap dates if end date is before start date', () => {
            const dayElements = fixture.debugElement.queryAll(By.css('.day.current-month:not(.disabled)'));
            const laterDay = dayElements[7];
            const earlierDay = dayElements[0];

            // Select later date first
            laterDay.nativeElement.click();
            fixture.detectChanges();

            // Select earlier date second
            earlierDay.nativeElement.click();

            expect(component.startDate!.getTime()).toBeLessThan(component.endDate!.getTime());
        });

        it('should show range preview on hover', () => {
            const dayElements = fixture.debugElement.queryAll(By.css('.day.current-month:not(.disabled)'));
            const firstDay = dayElements[0];
            const hoverDay = dayElements[7];

            // Start range selection
            firstDay.nativeElement.click();
            fixture.detectChanges();

            // Hover over another day
            hoverDay.nativeElement.dispatchEvent(new MouseEvent('mouseenter'));
            fixture.detectChanges();

            const rangePreview = fixture.debugElement.queryAll(By.css('.day.in-range'));
            expect(rangePreview.length).toBeGreaterThan(0);
        });

        it('should highlight complete range', () => {
            hostComponent.startDate = new Date(today);
            hostComponent.endDate = new Date(tomorrow);
            fixture.detectChanges();

            const rangeStart = fixture.debugElement.query(By.css('.day.range-start'));
            const rangeEnd = fixture.debugElement.query(By.css('.day.range-end'));

            expect(rangeStart).toBeTruthy();
            expect(rangeEnd).toBeTruthy();
        });
    });

    describe('Date Restrictions', () => {
        it('should disable past dates when disablePastDates is true', () => {
            hostComponent.disablePastDates = true;
            fixture.detectChanges();

            const pastDates = fixture.debugElement.queryAll(By.css('.day.disabled'));
            expect(pastDates.length).toBeGreaterThan(0);
        });

        it('should disable future dates when disableFutureDates is true', () => {
            hostComponent.disableFutureDates = true;
            fixture.detectChanges();

            const futureDates = fixture.debugElement.queryAll(By.css('.day.disabled'));
            expect(futureDates.length).toBeGreaterThan(0);
        });

        it('should disable dates before minDate', () => {
            hostComponent.minDate = today;
            fixture.detectChanges();

            const isDateDisabled = component.isDateDisabled(yesterday);
            expect(isDateDisabled).toBe(true);
        });

        it('should disable dates after maxDate', () => {
            hostComponent.maxDate = today;
            fixture.detectChanges();

            const isDateDisabled = component.isDateDisabled(tomorrow);
            expect(isDateDisabled).toBe(true);
        });
    });

    describe('Navigation', () => {
        beforeEach(() => {
            fixture.detectChanges();
        });

        it('should navigate to previous month', () => {
            const initialMonth = component.currentMonth().getMonth();

            const prevButton = fixture.debugElement.query(By.css('.nav-button'));
            prevButton.nativeElement.click();

            const newMonth = component.currentMonth().getMonth();
            expect(newMonth).toBe((initialMonth - 1 + 12) % 12);
        });

        it('should navigate to next month', () => {
            const initialMonth = component.currentMonth().getMonth();

            const nextButton = fixture.debugElement.queryAll(By.css('.nav-button'))[1];
            nextButton.nativeElement.click();

            const newMonth = component.currentMonth().getMonth();
            expect(newMonth).toBe((initialMonth + 1) % 12);
        });

        it('should update calendar days after month navigation', () => {
            const initialDays = component.firstMonthDays();

            const nextButton = fixture.debugElement.queryAll(By.css('.nav-button'))[1];
            nextButton.nativeElement.click();

            const newDays = component.firstMonthDays();
            expect(newDays).not.toEqual(initialDays);
        });
    });

    describe('Keyboard Navigation', () => {
        beforeEach(() => {
            fixture.detectChanges();
        });

        it('should navigate with arrow keys', () => {
            const dayElement = fixture.debugElement.query(By.css('.day.current-month:not(.disabled)'));
            dayElement.nativeElement.focus();

            const arrowRightEvent = new KeyboardEvent('keydown', { key: 'ArrowRight' });
            Object.defineProperty(arrowRightEvent, 'target', {
                value: dayElement.nativeElement
            });

            spyOn(arrowRightEvent, 'preventDefault');
            component.handleKeyDown(arrowRightEvent);

            expect(arrowRightEvent.preventDefault).toHaveBeenCalled();
        });

        it('should select date with Enter key', () => {
            const dayElement = fixture.debugElement.query(By.css('.day.current-month:not(.disabled)'));
            dayElement.nativeElement.focus();

            const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
            Object.defineProperty(enterEvent, 'target', {
                value: dayElement.nativeElement
            });

            spyOn(component, 'selectDate');
            component.handleKeyDown(enterEvent);

            expect(component.selectDate).toHaveBeenCalled();
        });

        it('should close calendar with Escape key', () => {
            const dayElement = fixture.debugElement.query(By.css('.day.current-month:not(.disabled)'));
            const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
            Object.defineProperty(escapeEvent, 'target', {
                value: dayElement.nativeElement
            });

            component.handleKeyDown(escapeEvent);

            expect(hostComponent.closeCalendarSpy).toHaveBeenCalled();
        });
    });

    describe('Focus Management', () => {
        beforeEach(() => {
            fixture.detectChanges();
        });

        it('should trap focus within calendar', () => {
            component.ngAfterViewInit();

            expect(component['focusTrapEnabled']()).toBe(true);
        });

        it('should restore focus when trap is disabled', () => {
            const mockElement = document.createElement('button');
            spyOn(mockElement, 'focus');
            component['originalFocusedElement'] = mockElement;

            component.ngOnDestroy();

            expect(mockElement.focus).toHaveBeenCalled();
        });
    });

    describe('Utility Methods', () => {
        it('should correctly identify same day', () => {
            const date1 = new Date(2024, 5, 15);
            const date2 = new Date(2024, 5, 15);
            const date3 = new Date(2024, 5, 16);

            expect(component.isSameDay(date1, date2)).toBe(true);
            expect(component.isSameDay(date1, date3)).toBe(false);
            expect(component.isSameDay(date1, null)).toBe(false);
        });

        it('should format month names correctly', () => {
            const testDate = new Date(2024, 5, 15); // June 2024
            const monthName = component.getMonthName(testDate);

            expect(monthName).toContain('2024');
            expect(monthName.toLowerCase()).toContain('june');
        });

        it('should clear selection', () => {
            hostComponent.isRange = true;
            hostComponent.startDate = today;
            hostComponent.endDate = tomorrow;
            fixture.detectChanges();

            component.clearSelection();

            expect(component.selectedDate).toBe(null);
            expect(component.startDate).toBe(null);
            expect(component.endDate).toBe(null);
            expect(component.selectionInProgress()).toBe(false);
        });
    });

    describe('Performance Optimizations', () => {
        it('should use trackBy function for day rendering', () => {
            const mockCalendarDate: CalendarDate = {
                date: today,
                dateTime: today.getTime(),
                isCurrentMonth: true,
                isToday: true,
                isSelected: false,
                isInRange: false,
                isRangeStart: false,
                isRangeEnd: false,
                isHovered: false,
                monthIndex: 0,
                isDisabled: false
            };

            const result = component.trackByDate(0, mockCalendarDate);
            expect(result).toBe(today.getTime());
        });

        it('should invalidate cache when restrictions change', () => {
            // Initial generation
            component.generateCalendarDays();
            const initialCacheSize = component['daysMemo'].size;

            // Change restrictions
            hostComponent.minDate = today;
            fixture.detectChanges();
            component.ngOnChanges({
                minDate: {
                    currentValue: today,
                    previousValue: null,
                    firstChange: false,
                    isFirstChange: () => false
                }
            });

            // Cache should be cleared
            expect(component['daysMemo'].size).toBe(0);
        });
    });

    describe('Action Buttons', () => {
        beforeEach(() => {
            fixture.detectChanges();
        });

        it('should clear selection when clear button is clicked', () => {
            spyOn(component, 'clearSelection');

            const clearButton = fixture.debugElement.query(By.css('.clear-button'));
            clearButton.nativeElement.click();

            expect(component.clearSelection).toHaveBeenCalled();
        });

        it('should apply selection when apply button is clicked', () => {
            hostComponent.isRange = false;
            hostComponent.selectedDate = today;
            fixture.detectChanges();

            const applyButton = fixture.debugElement.query(By.css('.apply-button'));
            applyButton.nativeElement.click();

            expect(hostComponent.closeCalendarSpy).toHaveBeenCalled();
        });

        it('should emit range selection on apply with complete range', () => {
            hostComponent.isRange = true;
            hostComponent.startDate = today;
            hostComponent.endDate = tomorrow;
            fixture.detectChanges();

            const applyButton = fixture.debugElement.query(By.css('.apply-button'));
            applyButton.nativeElement.click();

            expect(hostComponent.rangeSelectedSpy).toHaveBeenCalled();
        });
    });

    describe('Edge Cases', () => {
        it('should handle month overflow correctly', () => {
            // Set to December
            const december = new Date(2024, 11, 1);
            component.currentMonth.set(december);

            const nextMonth = component.nextMonth();
            expect(nextMonth.getMonth()).toBe(0); // January
            expect(nextMonth.getFullYear()).toBe(2025);
        });

        it('should handle leap year correctly', () => {
            const leapYearFeb = new Date(2024, 1, 1); // February 2024
            component.currentMonth.set(leapYearFeb);

            const days = component.generateMonthDays(leapYearFeb, 0);
            const februaryDays = days.filter(day =>
                day.isCurrentMonth && day.date.getMonth() === 1
            );

            expect(februaryDays.length).toBe(29); // Leap year has 29 days
        });

        it('should handle invalid date inputs gracefully', () => {
            hostComponent.minDate = new Date('invalid');

            expect(() => {
                fixture.detectChanges();
                component.generateCalendarDays();
            }).not.toThrow();
        });
    });
});
