import { Pipe, PipeTransform} from "@angular/core";

@Pipe({
    name: 'priceFilterAdvanced',
    standalone: true
})
export class PriceFilterAdvancedPipe implements PipeTransform {
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

        // Split into integer and decimal parts
        const [integerPart, decimalPart] = formatted.split('.');

        // Add thousand separators (dots)
        const integerWithSeparators = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

        // Combine with comma as decimal separator
        return `${integerWithSeparators},${decimalPart}`;
    }
}
