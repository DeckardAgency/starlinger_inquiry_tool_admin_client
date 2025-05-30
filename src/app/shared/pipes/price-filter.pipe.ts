import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'priceFilter',
    standalone: true
})
export class PriceFilterPipe implements PipeTransform {
    transform(value: number | string | null | undefined): string {
        // Handle null or undefined values
        if (value == null) {
            return '0,00';
        }

        // Convert to number if string
        const numValue = typeof value === 'string' ? parseFloat(value) : value;

        // Check if valid number
        if (isNaN(numValue)) {
            return '0,00';
        }

        // Format the number with 2 decimal places
        const formatted = numValue.toFixed(2);

        // Replace decimal point with comma
        return formatted.replace('.', ',');
    }
}
