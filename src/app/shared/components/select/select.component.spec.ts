import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Component, DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { SelectComponent } from './select.component';

@Component({
    template: `
    <div class="test-container">
      <form [formGroup]="form">
        <app-select
          formControlName="selection"
          [options]="options"
          [displayField]="displayField"
          [valueField]="valueField"
          [placeholder]="placeholder"
          [multiple]="multiple"
          [searchable]="searchable"
          [closeOnOutsideClick]="closeOnOutsideClick"
          (selectionChange)="onSelectionChange($event)"
          (opened)="onDropdownOpened()"
          (closed)="onDropdownClosed()">
        </app-select>
      </form>
      <button class="outside-element">Outside Element</button>
    </div>
  `,
    standalone: false
})
class TestHostComponent {
    form: FormGroup;
    options: any[] = [
        'Option 1',
        'Option 2',
        'Option 3'
    ];
    objectOptions = [
        { id: 1, name: 'Option 1' },
        { id: 2, name: 'Option 2' },
        { id: 3, name: 'Option 3' }
    ];
    displayField = '';
    valueField = '';
    placeholder = 'Select an option';
    multiple = false;
    searchable = false;
    closeOnOutsideClick = true;
    selectionChangeCount = 0;
    openedCount = 0;
    closedCount = 0;
    lastSelection: any = null;

    constructor(private fb: FormBuilder) {
        this.form = this.fb.group({
            selection: [null]
        });
    }

    onSelectionChange(value: any): void {
        this.selectionChangeCount++;
        this.lastSelection = value;
    }

    onDropdownOpened(): void {
        this.openedCount++;
    }

    onDropdownClosed(): void {
        this.closedCount++;
    }

    setOptions(options: any[]): void {
        this.options = options;
    }

    setObjectOptions(): void {
        this.options = this.objectOptions;
        this.displayField = 'name';
        this.valueField = 'id';
    }
}

describe('SelectComponent', () => {
    let hostComponent: TestHostComponent;
    let fixture: ComponentFixture<TestHostComponent>;
    let selectDebugElement: DebugElement;
    let selectComponent: SelectComponent;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [
                FormsModule,
                ReactiveFormsModule,
                SelectComponent
            ],
            declarations: [TestHostComponent]
        }).compileComponents();

        fixture = TestBed.createComponent(TestHostComponent);
        hostComponent = fixture.componentInstance;
        fixture.detectChanges();

        selectDebugElement = fixture.debugElement.query(By.directive(SelectComponent));
        selectComponent = selectDebugElement.componentInstance;
    });

    it('should create the component', () => {
        expect(selectComponent).toBeTruthy();
    });

    it('should display the placeholder when no option is selected', () => {
        const placeholderElement = selectDebugElement.query(By.css('.select__placeholder'));
        expect(placeholderElement.nativeElement.textContent.trim()).toBe('Select an option');
    });

    it('should toggle dropdown when clicking on the select field', () => {
        // Initially closed
        let dropdownMenu = selectDebugElement.query(By.css('.select__dropdown'));
        expect(dropdownMenu).toBeFalsy();

        // Open dropdown
        const selectField = selectDebugElement.query(By.css('.select__field'));
        selectField.nativeElement.click();
        fixture.detectChanges();

        // Dropdown should be open now
        dropdownMenu = selectDebugElement.query(By.css('.select__dropdown'));
        expect(dropdownMenu).toBeTruthy();

        // Close dropdown
        selectField.nativeElement.click();
        fixture.detectChanges();

        // Dropdown should be closed again
        dropdownMenu = selectDebugElement.query(By.css('.select__dropdown'));
        expect(dropdownMenu).toBeFalsy();
    });

    it('should select an option when clicked', () => {
        // Open dropdown
        const selectField = selectDebugElement.query(By.css('.select__field'));
        selectField.nativeElement.click();
        fixture.detectChanges();

        // Click on an option
        const optionElements = selectDebugElement.queryAll(By.css('.select__option'));
        optionElements[1].nativeElement.click(); // Select "Option 2"
        fixture.detectChanges();

        // Check if the value is selected
        const selectedValue = selectDebugElement.query(By.css('.select__value'));
        expect(selectedValue.nativeElement.textContent.trim()).toBe('Option 2');

        // Check form control value
        expect(hostComponent.form.get('selection')?.value).toBe('Option 2');

        // Check if selection change event was emitted
        expect(hostComponent.selectionChangeCount).toBe(1);
        expect(hostComponent.lastSelection).toBe('Option 2');
    });

    it('should close the dropdown after selecting in single select mode', () => {
        // Open dropdown
        const selectField = selectDebugElement.query(By.css('.select__field'));
        selectField.nativeElement.click();
        fixture.detectChanges();

        // Click on an option
        const optionElements = selectDebugElement.queryAll(By.css('.select__option'));
        optionElements[0].nativeElement.click();
        fixture.detectChanges();

        // Dropdown should be closed
        const dropdownMenu = selectDebugElement.query(By.css('.select__dropdown'));
        expect(dropdownMenu).toBeFalsy();

        // Check event counts
        expect(hostComponent.openedCount).toBe(1);
        expect(hostComponent.closedCount).toBe(1);
    });

    it('should handle multiple selection mode correctly', () => {
        // Enable multiple selection
        hostComponent.multiple = true;
        fixture.detectChanges();

        // Open dropdown
        const selectField = selectDebugElement.query(By.css('.select__field'));
        selectField.nativeElement.click();
        fixture.detectChanges();

        // Select multiple options
        const optionElements = selectDebugElement.queryAll(By.css('.select__option'));
        optionElements[0].nativeElement.click();
        fixture.detectChanges();

        optionElements[2].nativeElement.click();
        fixture.detectChanges();

        // Dropdown should still be open
        const dropdownMenu = selectDebugElement.query(By.css('.select__dropdown'));
        expect(dropdownMenu).toBeTruthy();

        // Check if chips are displayed
        const chips = selectDebugElement.queryAll(By.css('.select__chip'));
        expect(chips.length).toBe(2);
        expect(chips[0].nativeElement.textContent).toContain('Option 1');
        expect(chips[1].nativeElement.textContent).toContain('Option 3');

        // Check form control value
        expect(hostComponent.form.get('selection')?.value).toEqual(['Option 1', 'Option 3']);

        // Test removing a chip
        const removeButton = chips[0].query(By.css('.select__chip-remove'));
        removeButton.nativeElement.click();
        fixture.detectChanges();

        // Should have only one chip now
        const updatedChips = selectDebugElement.queryAll(By.css('.select__chip'));
        expect(updatedChips.length).toBe(1);
        expect(updatedChips[0].nativeElement.textContent).toContain('Option 3');

        // Check form control value after removal
        expect(hostComponent.form.get('selection')?.value).toEqual(['Option 3']);
    });

    it('should handle object options with display and value fields', () => {
        // Set object options
        hostComponent.setObjectOptions();
        fixture.detectChanges();

        // Open dropdown
        const selectField = selectDebugElement.query(By.css('.select__field'));
        selectField.nativeElement.click();
        fixture.detectChanges();

        // Select an option
        const optionElements = selectDebugElement.queryAll(By.css('.select__option'));
        optionElements[1].nativeElement.click(); // Select "Option 2" with id: 2
        fixture.detectChanges();

        // Check displayed value uses the displayField
        const selectedValue = selectDebugElement.query(By.css('.select__value'));
        expect(selectedValue.nativeElement.textContent.trim()).toBe('Option 2');

        // Check form control value uses the valueField
        expect(hostComponent.form.get('selection')?.value).toBe(2);
    });

    it('should clear the selection when clear button is clicked', () => {
        // Select an option first
        selectComponent.selectOption('Option 1');
        fixture.detectChanges();

        // Verify selection
        expect(hostComponent.form.get('selection')?.value).toBe('Option 1');

        // Click the clear button
        const clearButton = selectDebugElement.query(By.css('.select__clear'));
        clearButton.nativeElement.click();
        fixture.detectChanges();

        // Verification
        expect(hostComponent.form.get('selection')?.value).toBeNull();

        // Placeholder should be visible again
        const placeholderElement = selectDebugElement.query(By.css('.select__placeholder'));
        expect(placeholderElement).toBeTruthy();
    });

    it('should close dropdown when clicking outside if closeOnOutsideClick is true', fakeAsync(() => {
        // Open dropdown
        const selectField = selectDebugElement.query(By.css('.select__field'));
        selectField.nativeElement.click();
        fixture.detectChanges();

        // Dropdown should be open
        let dropdownMenu = selectDebugElement.query(By.css('.select__dropdown'));
        expect(dropdownMenu).toBeTruthy();

        // Click outside
        const outsideElement = fixture.debugElement.query(By.css('.outside-element'));
        outsideElement.nativeElement.click();

        // Need to trigger change detection manually for document click events
        tick();
        fixture.detectChanges();

        // Dropdown should be closed
        dropdownMenu = selectDebugElement.query(By.css('.select__dropdown'));
        expect(dropdownMenu).toBeFalsy();

        // Check event counts
        expect(hostComponent.closedCount).toBe(1);
    }));

    it('should not close dropdown when clicking outside if closeOnOutsideClick is false', fakeAsync(() => {
        // Set closeOnOutsideClick to false
        hostComponent.closeOnOutsideClick = false;
        fixture.detectChanges();

        // Open dropdown
        const selectField = selectDebugElement.query(By.css('.select__field'));
        selectField.nativeElement.click();
        fixture.detectChanges();

        // Dropdown should be open
        let dropdownMenu = selectDebugElement.query(By.css('.select__dropdown'));
        expect(dropdownMenu).toBeTruthy();

        // Click outside
        const outsideElement = fixture.debugElement.query(By.css('.outside-element'));
        outsideElement.nativeElement.click();

        // Need to trigger change detection manually for document click events
        tick();
        fixture.detectChanges();

        // Dropdown should still be open
        dropdownMenu = selectDebugElement.query(By.css('.select__dropdown'));
        expect(dropdownMenu).toBeTruthy();
    }));

    it('should filter options when searchable is enabled', () => {
        // Enable search
        hostComponent.searchable = true;
        fixture.detectChanges();

        // Open dropdown
        const selectField = selectDebugElement.query(By.css('.select__field'));
        selectField.nativeElement.click();
        fixture.detectChanges();

        // Search input should exist
        const searchInput = selectDebugElement.query(By.css('.select__search-input'));
        expect(searchInput).toBeTruthy();

        // Enter search text
        searchInput.nativeElement.value = '3';
        searchInput.nativeElement.dispatchEvent(new Event('input'));
        fixture.detectChanges();

        // Should only show matching options
        const filteredOptions = selectDebugElement.queryAll(By.css('.select__option'));
        expect(filteredOptions.length).toBe(1);
        expect(filteredOptions[0].nativeElement.textContent.trim()).toBe('Option 3');

        // Clear search
        searchInput.nativeElement.value = '';
        searchInput.nativeElement.dispatchEvent(new Event('input'));
        fixture.detectChanges();

        // All options should be back
        const allOptions = selectDebugElement.queryAll(By.css('.select__option'));
        expect(allOptions.length).toBe(3);
    });

    it('should show "No results found" when search has no matches', () => {
        // Enable search
        hostComponent.searchable = true;
        fixture.detectChanges();

        // Open dropdown
        const selectField = selectDebugElement.query(By.css('.select__field'));
        selectField.nativeElement.click();
        fixture.detectChanges();

        // Enter search text that won't match anything
        const searchInput = selectDebugElement.query(By.css('.select__search-input'));
        searchInput.nativeElement.value = 'xyz';
        searchInput.nativeElement.dispatchEvent(new Event('input'));
        fixture.detectChanges();

        // Should show no results message
        const noResults = selectDebugElement.query(By.css('.select__no-results'));
        expect(noResults).toBeTruthy();
        expect(noResults.nativeElement.textContent.trim()).toBe('No results found');

        // Should have no options
        const filteredOptions = selectDebugElement.queryAll(By.css('.select__option'));
        expect(filteredOptions.length).toBe(0);
    });

    it('should programmatically close the dropdown with closeDropdown method', () => {
        // Open dropdown
        const selectField = selectDebugElement.query(By.css('.select__field'));
        selectField.nativeElement.click();
        fixture.detectChanges();

        // Dropdown should be open
        let dropdownMenu = selectDebugElement.query(By.css('.select__dropdown'));
        expect(dropdownMenu).toBeTruthy();

        // Close programmatically
        selectComponent.closeDropdown();
        fixture.detectChanges();

        // Dropdown should be closed
        dropdownMenu = selectDebugElement.query(By.css('.select__dropdown'));
        expect(dropdownMenu).toBeFalsy();

        // Check event was emitted
        expect(hostComponent.closedCount).toBe(1);
    });

    it('should handle keyboard navigation', () => {
        const selectField = selectDebugElement.query(By.css('.select__field'));

        // Press Enter to open dropdown
        selectField.triggerEventHandler('keydown', { key: 'Enter', preventDefault: () => {} });
        fixture.detectChanges();

        // Dropdown should be open
        let dropdownMenu = selectDebugElement.query(By.css('.select__dropdown'));
        expect(dropdownMenu).toBeTruthy();

        // Press Escape to close dropdown
        selectField.triggerEventHandler('keydown', { key: 'Escape', preventDefault: () => {} });
        fixture.detectChanges();

        // Dropdown should be closed
        dropdownMenu = selectDebugElement.query(By.css('.select__dropdown'));
        expect(dropdownMenu).toBeFalsy();

        // Press Space to open dropdown
        selectField.triggerEventHandler('keydown', { key: ' ', preventDefault: () => {} });
        fixture.detectChanges();

        // Dropdown should be open again
        dropdownMenu = selectDebugElement.query(By.css('.select__dropdown'));
        expect(dropdownMenu).toBeTruthy();

        // Check events were emitted
        expect(hostComponent.openedCount).toBe(2);
        expect(hostComponent.closedCount).toBe(1);
    });

    it('should handle disabled state correctly', () => {
        // Disable the control
        hostComponent.form.get('selection')?.disable();
        fixture.detectChanges();

        // Select field should have disabled class
        const selectField = selectDebugElement.query(By.css('.select__field'));
        expect(selectField.classes['select__field--disabled']).toBe(true);

        // Clicking should not open dropdown
        selectField.nativeElement.click();
        fixture.detectChanges();

        // Dropdown should remain closed
        const dropdownMenu = selectDebugElement.query(By.css('.select__dropdown'));
        expect(dropdownMenu).toBeFalsy();

        // No events should be triggered
        expect(hostComponent.openedCount).toBe(0);
    });
});
