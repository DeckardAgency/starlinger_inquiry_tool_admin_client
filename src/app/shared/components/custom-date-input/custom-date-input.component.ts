import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
    selector: 'app-custom-date-input',
    standalone: true,
    imports: [CommonModule],
    template: `
    <input 
      type="text" 
      [value]="displayValue"
      [class]="inputClass"
      [disabled]="disabled"
      (input)="onInputChange($event)"
      (blur)="onTouched()"
      placeholder="DD.MM.YYYY"
      maxlength="10"
    >
  `,
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => CustomDateInputComponent),
            multi: true
        }
    ]
})
export class CustomDateInputComponent implements ControlValueAccessor {
    @Input() inputClass: string = '';

    displayValue: string = '';
    disabled: boolean = false;

    private onChange: (value: any) => void = () => {};
    onTouched: () => void = () => {};

    writeValue(value: any): void {
        if (value) {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
                // Format as DD.MM.YYYY
                const day = date.getDate().toString().padStart(2, '0');
                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                const year = date.getFullYear();
                this.displayValue = `${day}.${month}.${year}`;
            } else {
                this.displayValue = '';
            }
        } else {
            this.displayValue = '';
        }
    }

    registerOnChange(fn: any): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: any): void {
        this.onTouched = fn;
    }

    setDisabledState?(isDisabled: boolean): void {
        this.disabled = isDisabled;
    }

    onInputChange(event: Event): void {
        const input = event.target as HTMLInputElement;
        let value = input.value;

        // Auto-format as user types
        value = this.formatInput(value);

        // Update the input value
        input.value = value;
        this.displayValue = value;

        // Try to parse the date if complete
        if (value.length === 10) {
            const parts = value.split('.');
            if (parts.length === 3) {
                const day = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
                const year = parseInt(parts[2], 10);

                const date = new Date(year, month, day);
                if (!isNaN(date.getTime()) &&
                    date.getDate() === day &&
                    date.getMonth() === month &&
                    date.getFullYear() === year) {
                    // Valid date - emit ISO string
                    this.onChange(date.toISOString());
                } else {
                    // Invalid date
                    this.onChange(null);
                }
            }
        } else {
            this.onChange(null);
        }
    }

    private formatInput(value: string): string {
        // Remove non-numeric characters except dots
        value = value.replace(/[^\d.]/g, '');

        // Remove extra dots
        const parts = value.split('.');
        if (parts.length > 3) {
            value = parts.slice(0, 3).join('.');
        }

        // Auto-add dots after day and month
        const numbers = value.replace(/\./g, '');
        if (numbers.length >= 2 && value.indexOf('.') === -1) {
            value = numbers.slice(0, 2) + '.' + numbers.slice(2);
        }
        if (numbers.length >= 4 && value.split('.').length === 2) {
            const firstDot = value.indexOf('.');
            value = value.slice(0, firstDot + 3) + '.' + value.slice(firstDot + 3);
        }

        // Limit length
        if (value.length > 10) {
            value = value.slice(0, 10);
        }

        return value;
    }
}
