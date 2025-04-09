import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ProductService } from "../../../services/product.service";
import { Product } from '../../../interfaces/product.interface';

@Component({
    selector: 'app-order-edit',
    templateUrl: './order-edit.component.html',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    styleUrls: ['./order-edit.component.scss']
})
export class OrderEditComponent implements OnInit {
    productForm: FormGroup;
    imagePreview: string | null = null;
    productId: string | null = null;
    isLoading = false;
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
        private router: Router,
        private route: ActivatedRoute
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

    ngOnInit(): void {
        // Get product ID from route parameters
        this.route.params.subscribe(params => {
            if (params['id']) {
                this.productId = params['id'];
                this.loadProduct(this.productId);
            }
        });
    }

    loadProduct(id: string | null) {
        this.isLoading = true;
        this.productService.getProduct(id).subscribe({
            next: (product: Product) => {
                // Populate form with existing product data
                this.productForm.patchValue({
                    name: product.name,
                    partNo: product.partNo,
                    price: product.price,
                    description: "",
                    category: "",
                    status: ""
                });

                // Set image preview if exists
                if (product.featuredImage) {
                    this.imagePreview = product.featuredImage.filePath;
                }
                this.isLoading = false;
            },
            error: (error) => {
                console.error('Error loading product:', error);
                this.isLoading = false;
                // Handle error (show error message, redirect)
            }
        });
    }

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
                const value = this.productForm.get(key)?.value;
                if (value !== null && value !== undefined) {
                    formData.append(key, value);
                }
            });

            if (this.productId) {
                // Update existing product
                this.productService.updateProduct(this.productId, formData).subscribe({
                    next: (response) => {
                        this.router.navigate(['/products']);
                    },
                    error: (error) => {
                        console.error('Error updating product:', error);
                        // Handle error (show error message)
                    }
                });
            } else {
                // Create new product
                this.productService.createProduct(formData).subscribe({
                    next: (response) => {
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
}
