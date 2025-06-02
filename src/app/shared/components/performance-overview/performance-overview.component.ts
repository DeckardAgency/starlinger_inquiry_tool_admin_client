import { Component, Input, OnInit, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DatePickerComponent } from "@shared/components/date-picker/date-picker.component";
import { ReactiveFormsModule, FormGroup, FormBuilder } from "@angular/forms";
import { HttpClient } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';
import {environment} from "@env/environment";

interface PerformanceMetric {
    label: string;
    value: number | string;
    percentage: number;
    isIncreasing: boolean;
    infoTooltip?: string;
}

interface MetricData {
    value: number;
    formatted?: string;
    percentageChange: number;
    trend: 'up' | 'down' | 'neutral';
}

interface DashboardResponse {
    '@context': string;
    '@id': string;
    '@type': string;
    period: {
        start: string;
        end: string;
    };
    shopOrders: MetricData;
    manualInquiries: MetricData;
    activeInquiries: MetricData;
    cancelledInquiries: MetricData;
    activeCarts: MetricData;
    completedCarts: MetricData;
    totalShopRevenue: MetricData & { formatted: string };
    cancelledOrdersRevenue: MetricData & { formatted: string };
}

@Component({
    selector: 'app-performance-overview',
    imports: [CommonModule, DatePickerComponent, ReactiveFormsModule],
    templateUrl: './performance-overview.component.html',
    styleUrls: ['./performance-overview.component.scss']
})
export class PerformanceOverviewComponent implements OnInit, AfterViewInit, OnDestroy {
    @Input() startDate: string = '';
    @Input() endDate: string = '';
    @ViewChild(DatePickerComponent) rangePicker!: DatePickerComponent;

    private destroy$ = new Subject<void>();
    private apiUrl = `${environment.apiBaseUrl}/api/v1/dashboard/performance`;

    // Form for the date range
    dateRangeForm: FormGroup;

    metrics: PerformanceMetric[] = [];

    // Loading state
    isLoading = false;
    error: string | null = null;

    constructor(
        private fb: FormBuilder,
        private http: HttpClient
    ) {
        // Initialize a form group
        this.dateRangeForm = this.fb.group({
            dateRange: [null]
        });
    }

    ngOnInit() {
        // Set up form value change subscription
        this.dateRangeForm.get('dateRange')?.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe(range => {
                if (range) {
                    this.onDateRangeChanged(range);
                }
            });

        // Load initial data
        this.loadPerformanceData();
    }

    ngAfterViewInit() {
        // Set up date picker restrictions
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

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    onDateRangeChanged(range: { start: Date, end: Date }) {
        if (range && range.start && range.end) {
            // Update the input properties
            this.startDate = range.start.toISOString().split('T')[0];
            this.endDate = range.end.toISOString().split('T')[0];

            // Fetch new data based on the range
            this.loadPerformanceData();
        }
    }

    loadPerformanceData() {
        this.isLoading = true;
        this.error = null;

        // Build URL with query parameters if dates are available
        let url = this.apiUrl;
        if (this.startDate && this.endDate) {
            url += `?startDate=${this.startDate}&endDate=${this.endDate}`;
        }

        this.http.get<DashboardResponse>(url)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (data) => {
                    this.updateMetrics(data);
                    this.isLoading = false;
                },
                error: (error) => {
                    console.error('Error loading performance data:', error);
                    this.error = 'Failed to load performance data. Please try again.';
                    this.isLoading = false;
                    // Keep the existing metrics or show empty state
                    this.setDefaultMetrics();
                }
            });
    }

    private updateMetrics(data: DashboardResponse) {
        // Update the date range from the API response
        if (data.period) {
            const start = new Date(data.period.start);
            const end = new Date(data.period.end);
            this.dateRangeForm.get('dateRange')?.setValue({ start, end }, { emitEvent: false });
        }

        this.metrics = [
            {
                label: 'Shop orders',
                value: data.shopOrders.value,
                percentage: data.shopOrders.percentageChange,
                isIncreasing: data.shopOrders.trend === 'up',
                infoTooltip: 'Total number of orders placed in your shop'
            },
            {
                label: 'Manual inquiries',
                value: data.manualInquiries.value,
                percentage: data.manualInquiries.percentageChange,
                isIncreasing: data.manualInquiries.trend === 'up',
                infoTooltip: 'Inquiries created manually by shop administrators'
            },
            {
                label: 'Active inquiries',
                value: data.activeInquiries.value,
                percentage: data.activeInquiries.percentageChange,
                isIncreasing: data.activeInquiries.trend === 'up',
                infoTooltip: 'Inquiries that are currently in process'
            },
            {
                label: 'Cancelled inquiries',
                value: data.cancelledInquiries.value,
                percentage: data.cancelledInquiries.percentageChange,
                isIncreasing: data.cancelledInquiries.trend === 'up',
                infoTooltip: 'Inquiries that were cancelled'
            },
            {
                label: 'Active carts',
                value: data.activeCarts.value,
                percentage: data.activeCarts.percentageChange,
                isIncreasing: data.activeCarts.trend === 'up',
                infoTooltip: 'Shopping carts that are currently active'
            },
            {
                label: 'Completed carts',
                value: data.completedCarts.value,
                percentage: data.completedCarts.percentageChange,
                isIncreasing: data.completedCarts.trend === 'up',
                infoTooltip: 'Shopping carts that were completed'
            },
            {
                label: 'Total shop revenue',
                value: data.totalShopRevenue.formatted,
                percentage: data.totalShopRevenue.percentageChange,
                isIncreasing: data.totalShopRevenue.trend === 'up',
                infoTooltip: 'Total revenue generated from completed orders'
            },
            {
                label: 'Cancelled orders revenue',
                value: data.cancelledOrdersRevenue.formatted,
                percentage: data.cancelledOrdersRevenue.percentageChange,
                isIncreasing: data.cancelledOrdersRevenue.trend === 'up',
                infoTooltip: 'Revenue lost from cancelled orders'
            }
        ];
    }

    private setDefaultMetrics() {
        // Set empty/default metrics when API fails
        this.metrics = [
            {
                label: 'Shop orders',
                value: 0,
                percentage: 0,
                isIncreasing: false,
                infoTooltip: 'Total number of orders placed in your shop'
            },
            {
                label: 'Manual inquiries',
                value: 0,
                percentage: 0,
                isIncreasing: false,
                infoTooltip: 'Inquiries created manually by shop administrators'
            },
            {
                label: 'Active inquiries',
                value: 0,
                percentage: 0,
                isIncreasing: false,
                infoTooltip: 'Inquiries that are currently in process'
            },
            {
                label: 'Cancelled inquiries',
                value: 0,
                percentage: 0,
                isIncreasing: false,
                infoTooltip: 'Inquiries that were cancelled'
            },
            {
                label: 'Active carts',
                value: 0,
                percentage: 0,
                isIncreasing: false,
                infoTooltip: 'Shopping carts that are currently active'
            },
            {
                label: 'Completed carts',
                value: 0,
                percentage: 0,
                isIncreasing: false,
                infoTooltip: 'Shopping carts that were completed'
            },
            {
                label: 'Total shop revenue',
                value: '0,00 €',
                percentage: 0,
                isIncreasing: false,
                infoTooltip: 'Total revenue generated from completed orders'
            },
            {
                label: 'Cancelled orders revenue',
                value: '0,00 €',
                percentage: 0,
                isIncreasing: false,
                infoTooltip: 'Revenue lost from cancelled orders'
            }
        ];
    }
}
