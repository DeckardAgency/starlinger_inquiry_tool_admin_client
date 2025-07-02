import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'dateFilter',
    standalone: true
})
export class DateFilterPipe implements PipeTransform {
    transform(dateValue: string | Date | undefined | null, format: string = 'dd/MM/yyyy'): string {
        if (!dateValue) return 'N/A';

        try {
            let date: Date;

            // Handle both string and Date inputs
            if (dateValue instanceof Date) {
                date = dateValue;
            } else {
                date = new Date(dateValue);
            }

            // Check if date is valid
            if (isNaN(date.getTime())) {
                return 'N/A';
            }

            // Format based on the format parameter
            switch (format) {
                case 'dd/MM/yyyy':
                    return this.formatDDMMYYYY(date);
                case 'dd/MM/yyyy HH:mm':
                    return this.formatDDMMYYYYHHMM(date);
                case 'dd/MM/yyyy HH:mm:ss':
                    return this.formatDDMMYYYYHHMMSS(date);
                case 'MM/dd/yyyy':
                    return this.formatMMDDYYYY(date);
                case 'yyyy-MM-dd':
                    return this.formatYYYYMMDD(date);
                case 'dd.MM.yyyy @ HH:mm':
                    return this.formatDDMMYYYYAtHHMM(date);
                case 'dd.MM.yyyy':
                    return this.formatDDMMYYYYDot(date);
                default:
                    return this.formatDDMMYYYY(date);
            }
        } catch (error) {
            return 'N/A';
        }
    }

    private formatDDMMYYYY(date: Date): string {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }

    private formatDDMMYYYYHHMM(date: Date): string {
        const dateStr = this.formatDDMMYYYY(date);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${dateStr} ${hours}:${minutes}`;
    }

    private formatDDMMYYYYHHMMSS(date: Date): string {
        const dateStr = this.formatDDMMYYYYHHMM(date);
        const seconds = date.getSeconds().toString().padStart(2, '0');
        return `${dateStr}:${seconds}`;
    }

    private formatMMDDYYYY(date: Date): string {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${month}/${day}/${year}`;
    }

    private formatYYYYMMDD(date: Date): string {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${year}-${month}-${day}`;
    }

    private formatDDMMYYYYAtHHMM(date: Date): string {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${day}.${month}.${year} @ ${hours}:${minutes}`;
    }

    private formatDDMMYYYYDot(date: Date): string {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}.${month}.${year}`;
    }
}
