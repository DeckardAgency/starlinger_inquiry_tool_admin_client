import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {ProductService} from "../../../services/product.service";

@Component({
    selector: 'app-order-new',
    templateUrl: './order-new.component.html',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    styleUrls: ['./order-new.component.scss']
})
export class OrderNewComponent implements OnInit {
    productForm: FormGroup;
    imagePreview: string | null = null;
    categories = [
        'Computers',
        'Watches',
        'Headphones',
        'Footwear',
        'Cameras',
        'Shirts',
        'Household',
        'Handbags'
    ];

    constructor(
        private fb: FormBuilder,
        private productService: ProductService,
        private router: Router
    ) {
        this.productForm = this.fb.group({
            name: ['', Validators.required],
            partNo: ['', Validators.required],
            price: [0, [Validators.required, Validators.min(0)]],
            description: [''],
            category: [''],
            status: ['published'],
            featuredImage: [null]
        });
    }

    ngOnInit(): void {}

    onFileSelected(event: any) {
        const file = event.target.files[0];
        if (file) {
            this.productForm.patchValue({ featuredImage: file });

            // Create image preview
            const reader = new FileReader();
            reader.onload = () => {
                this.imagePreview = reader.result as string;
            };
            reader.readAsDataURL(file);
        }
    }

    onSubmit() {
        if (this.productForm.valid) {
            // Create FormData to handle file upload
            const formData = new FormData();
            Object.keys(this.productForm.value).forEach(key => {
                formData.append(key, this.productForm.get(key)?.value);
            });

            this.productService.createProduct(formData).subscribe({
                next: (response) => {
                    // Navigate to products list or show success message
                    this.router.navigate(['/products']);
                },
                error: (error) => {
                    console.error('Error creating product:', error);
                    // Handle error (show error message)
                }
            });
        }
    }
}
