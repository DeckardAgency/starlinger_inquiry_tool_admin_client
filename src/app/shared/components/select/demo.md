 <form [formGroup]="selectForm" (ngSubmit)="onSubmit()">
            <!-- Basic Select -->
            <div class="form-group">
                <label for="color">Basic Select:</label>
                <app-select
                    formControlName="color"
                    [options]="colors"
                    (selectionChange)="onSelectionChange($event)"
                    placeholder="Select a color">
                </app-select>
            </div>

            <!-- Object Array Select -->
            <div class="form-group">
                <label for="country">Country Select with Objects:</label>
                <app-select
                    formControlName="country"
                    [options]="countries"
                    displayField="name"
                    valueField="id"
                    placeholder="Select a country">
                </app-select>
            </div>

            <!-- Searchable Select -->
            <div class="form-group">
                <label for="searchableCountry">Searchable Country Select:</label>
                <app-select
                    formControlName="searchableCountry"
                    [options]="countries"
                    displayField="name"
                    valueField="id"
                    [searchable]="true"
                    placeholder="Search and select a country">
                </app-select>
            </div>

            <!-- Multiple Select -->
            <div class="form-group">
                <label for="languages">Multiple Select:</label>
                <app-select
                    formControlName="languages"
                    [options]="programmingLanguages"
                    [multiple]="true"
                    placeholder="Select programming languages">
                </app-select>
            </div>

            <!-- Multiple Searchable Select -->
            <div class="form-group">
                <label for="skills">Multiple Searchable Select:</label>
                <app-select
                    formControlName="skills"
                    [options]="skills"
                    [multiple]="true"
                    [searchable]="true"
                    placeholder="Search and select skills">
                </app-select>
            </div>

            <!-- Required Select -->
            <div class="form-group">
                <label for="role">Required Select:</label>
                <app-select
                    formControlName="role"
                    [options]="roles"
                    [required]="true"
                    placeholder="Select a role (required)">
                </app-select>
                <div class="error-message" *ngIf="selectForm.get('role')?.invalid && selectForm.get('role')?.touched">
                    This field is required
                </div>
            </div>

            <!-- Disabled Select -->
            <div class="form-group">
                <label for="disabledOption">Disabled Select:</label>
                <app-select
                    formControlName="disabledOption"
                    [options]="disabledOptions"
                    [disabled]="true"
                    placeholder="This select is disabled">
                </app-select>
            </div>

            <button type="submit" [disabled]="selectForm.invalid">Submit</button>
        </form>

        <div class="form-values" *ngIf="submitted">
            <h2>Form Values:</h2>
            <pre>{{ formValues | json }}</pre>
        </div>
