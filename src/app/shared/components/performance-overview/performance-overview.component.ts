import { Component, Input, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DatePickerComponent } from "@shared/components/date-picker/date-picker.component";
import { ReactiveFormsModule, FormGroup, FormBuilder } from "@angular/forms";

interface PerformanceMetric {
    label: string;
    value: number | string;
    percentage: number;
    isIncreasing: boolean;
    infoTooltip?: string;
}

@Component({
    selector: 'app-performance-overview',
    standalone: true,
    imports: [CommonModule, DatePickerComponent, ReactiveFormsModule],
    templateUrl: './performance-overview.component.html',
    styleUrls: ['./performance-overview.component.scss']
})
export class PerformanceOverviewComponent implements OnInit, AfterViewInit {
    @Input() startDate: string = '';
    @Input() endDate: string = '';
    @ViewChild(DatePickerComponent) rangePicker!: DatePickerComponent;

    // Form for the date range
    dateRangeForm: FormGroup;

    metrics: PerformanceMetric[] = [
        {
            label: 'Shop orders',
            value: 20,
            percentage: 123.00,
            isIncreasing: true,
            infoTooltip: 'Total number of orders placed in your shop'
        },
        {
            label: 'Manual inquiries',
            value: 33,
            percentage: 97.00,
            isIncreasing: true,
            infoTooltip: 'Inquiries created manually by shop administrators'
        },
        {
            label: 'Active inquiries',
            value: 7,
            percentage: 30.00,
            isIncreasing: false,
            infoTooltip: 'Inquiries that are currently in process'
        },
        {
            label: 'Cancelled inquiries',
            value: 3,
            percentage: 15.00,
            isIncreasing: false,
            infoTooltip: 'Inquiries that were cancelled'
        },
        {
            label: 'Active carts',
            value: 5,
            percentage: 10.00,
            isIncreasing: false,
            infoTooltip: 'Shopping carts that are currently active'
        },
        {
            label: 'Completed carts',
            value: 20,
            percentage: 20.00,
            isIncreasing: true,
            infoTooltip: 'Shopping carts that were completed'
        },
        {
            label: 'Total shop revenue',
            value: '20.504,30 €',
            percentage: 93.00,
            isIncreasing: true,
            infoTooltip: 'Total revenue generated from completed orders'
        },
        {
            label: 'Cancelled orders revenue',
            value: '8.304,29 €',
            percentage: 15.00,
            isIncreasing: false,
            infoTooltip: 'Revenue lost from cancelled orders'
        }
    ];

    constructor(private fb: FormBuilder) {
        // Initialize a form group
        this.dateRangeForm = this.fb.group({
            dateRange: [null]
        });
    }

    ngOnInit() {
        // Set up form value change subscription
        this.dateRangeForm.get('dateRange')?.valueChanges.subscribe(range => {
            if (range) {
                this.onDateRangeChanged(range);
            }
        });
    }

    ngAfterViewInit() {
        // Set initial date range if provided via inputs
        // Apply restrictions if needed
        this.rangePicker.setMinDate('2022-01-01');
        this.rangePicker.setDisableFutureDates(true);

        setTimeout(() => {
            if (this.rangePicker && this.startDate && this.endDate) {
                // Set initial values based on input dates
                const start = new Date(this.startDate);
                const end = new Date(this.endDate);

                // Set the form value which will update the date picker
                this.dateRangeForm.get('dateRange')?.setValue({ start, end });
            }
        });
    }

    onDateRangeChanged(range: { start: Date, end: Date }) {
        if (range && range.start && range.end) {
            console.log('Date range changed:', range);

            // Update your component state or fetch new data based on the range
            // For example:
            // this.fetchMetricsByDateRange(range.start, range.end);

            // You can also update the input properties if needed
            this.startDate = range.start.toISOString();
            this.endDate = range.end.toISOString();
        }
    }

    // Method to fetch metrics based on date range (example)
    fetchMetricsByDateRange(start: Date, end: Date) {
        // Implement your API call or data update logic here
        console.log(`Fetching metrics from ${start.toDateString()} to ${end.toDateString()}`);
    }
}
