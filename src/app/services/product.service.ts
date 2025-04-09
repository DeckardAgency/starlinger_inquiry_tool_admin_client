import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProductResponse, Product } from '../interfaces/product.interface';

@Injectable({
    providedIn: 'root'
})
export class ProductService {
    private apiUrl = 'https://127.0.0.1:8002/api/v1/products';

    constructor(private http: HttpClient) {}

    getProducts(): Observable<ProductResponse> {
        return this.http.get<ProductResponse>(`${this.apiUrl}?itemsPerPage=300`);
    }

    getProduct(id: string | null): Observable<Product> {
        return this.http.get<Product>(`${this.apiUrl}/${id}`);
    }

    createProduct(productData: FormData): Observable<Product> {
        return this.http.post<Product>(this.apiUrl, productData);
    }

    updateProduct(id: string, productData: FormData): Observable<Product> {
        return this.http.put<Product>(`${this.apiUrl}/${id}`, productData);
    }
}
