// select.component.ts
import { Component, ElementRef, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

@Component({
    selector: 'app-select',
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    templateUrl: './select.component.html',
    styleUrl: './select.component.scss',
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => SelectComponent),
            multi: true
        }
    ]
})
export class SelectComponent implements OnInit, OnDestroy, ControlValueAccessor {
    @Input() options: any[] = [];
    @Input() displayField: string = 'label';
    @Input() valueField: string = 'value';
    @Input() placeholder: string = 'Select an option';
    @Input() multiple: boolean = false;
    @Input() searchable: boolean = false;
    @Input() disabled: boolean = false;
    @Input() required: boolean = false;
    @Input() closeOnOutsideClick: boolean = true;

    @Output() selectionChange = new EventEmitter<any>();
    @Output() opened = new EventEmitter<void>();
    @Output() closed = new EventEmitter<void>();

    isOpen: boolean = false;
    selectedOptions: any[] = [];
    searchText: string = '';
    filteredOptions: any[] = [];

    private onChange: any = () => {};
    private onTouched: any = () => {};
    private destroy$ = new Subject<void>();

    constructor(private elementRef: ElementRef) {}

    @HostListener('document:click', ['$event'])
    onClickOutside(event: MouseEvent) {
        if (!this.closeOnOutsideClick) return;

        const clickedInside = this.elementRef.nativeElement.contains(event.target);
        if (!clickedInside && this.isOpen) {
            this.isOpen = false;
            this.closed.emit();
        }
    }

    ngOnInit(): void {
        this.filteredOptions = [...this.options];
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    toggleDropdown(): void {
        if (this.disabled) return;

        this.isOpen = !this.isOpen;
        if (this.isOpen) {
            this.searchText = '';
            this.filterOptions();
            this.opened.emit();
        } else {
            this.closed.emit();
        }
    }

    onSearch(event: Event): void {
        this.searchText = (event.target as HTMLInputElement).value;
        this.filterOptions();
    }

    filterOptions(): void {
        if (!this.searchText.trim()) {
            this.filteredOptions = [...this.options];
            return;
        }

        const searchTerm = this.searchText.toLowerCase();
        this.filteredOptions = this.options.filter(option => {
            const displayValue = typeof option === 'object' ?
                option[this.displayField].toLowerCase() :
                option.toString().toLowerCase();
            return displayValue.includes(searchTerm);
        });
    }

    selectOption(option: any): void {
        if (this.disabled) return;

        if (this.multiple) {
            const index = this.findSelectedIndex(option);
            if (index > -1) {
                this.selectedOptions.splice(index, 1);
            } else {
                this.selectedOptions.push(option);
            }
        } else {
            this.selectedOptions = [option];
            this.isOpen = false;
            this.closed.emit();
        }

        this.updateValue();
        this.selectionChange.emit(this.multiple ? this.selectedOptions : this.selectedOptions[0]);
    }

    isSelected(option: any): boolean {
        return this.findSelectedIndex(option) > -1;
    }

    findSelectedIndex(option: any): number {
        if (typeof option === 'object') {
            return this.selectedOptions.findIndex(item =>
                item[this.valueField] === option[this.valueField]
            );
        } else {
            return this.selectedOptions.indexOf(option);
        }
    }

    clearSelection(event?: Event): void {
        if (event) {
            event.stopPropagation();
        }

        if (this.disabled) return;

        this.selectedOptions = [];
        this.updateValue();
        this.selectionChange.emit(this.multiple ? [] : null);
    }

    removeOption(option: any, event?: Event): void {
        if (event) {
            event.stopPropagation();
        }

        if (this.disabled) return;

        const index = this.findSelectedIndex(option);
        if (index > -1) {
            this.selectedOptions.splice(index, 1);
            this.updateValue();
            this.selectionChange.emit(this.selectedOptions);
        }
    }

    getDisplayValue(option: any): string {
        if (!option) return '';
        return typeof option === 'object' ? option[this.displayField] : option.toString();
    }

    updateValue(): void {
        const value = this.multiple ?
            this.selectedOptions.map(option => this.getValue(option)) :
            this.selectedOptions.length ? this.getValue(this.selectedOptions[0]) : null;

        this.onChange(value);
        this.onTouched();
    }

    getValue(option: any): any {
        return typeof option === 'object' ? option[this.valueField] : option;
    }

    // ControlValueAccessor methods
    writeValue(value: any): void {
        if (value === null || value === undefined) {
            this.selectedOptions = [];
            return;
        }

        if (this.multiple && Array.isArray(value)) {
            this.selectedOptions = this.options.filter(option =>
                value.includes(this.getValue(option))
            );
        } else {
            const selectedOption = this.options.find(option =>
                this.getValue(option) === value
            );
            this.selectedOptions = selectedOption ? [selectedOption] : [];
        }
    }

    registerOnChange(fn: any): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: any): void {
        this.onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.disabled = isDisabled;
    }

    // A11y methods
    onKeyDown(event: KeyboardEvent): void {
        if (this.disabled) return;

        switch (event.key) {
            case 'Enter':
            case ' ':
                this.toggleDropdown();
                event.preventDefault();
                break;
            case 'Escape':
                this.isOpen = false;
                this.closed.emit();
                event.preventDefault();
                break;
            case 'ArrowDown':
                if (!this.isOpen) {
                    this.isOpen = true;
                    this.filterOptions();
                    this.opened.emit();
                }
                event.preventDefault();
                break;
        }
    }

    closeDropdown(): void {
        if (this.isOpen) {
            this.isOpen = false;
            this.closed.emit();
        }
    }
}
