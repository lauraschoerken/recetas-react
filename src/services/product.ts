import { api } from '@/services/api'
import { Product, ProductThreshold } from '@/models/domains/product'

export type { Product, ProductThreshold }

class ProductService {
	async getAll(): Promise<Product[]> {
		return api.get<Product[]>('/products/')
	}

	async search(q: string): Promise<Product[]> {
		return api.get<Product[]>(`/products/search?q=${encodeURIComponent(q)}`)
	}

	async getById(id: number): Promise<Product> {
		return api.get<Product>(`/products/${id}`)
	}

	async create(data: { name: string; imageUrl?: string; isGlobal?: boolean }): Promise<Product> {
		return api.post<Product>('/products/', data)
	}

	async update(id: number, data: { name?: string; imageUrl?: string }): Promise<Product> {
		return api.put<Product>(`/products/${id}`, data)
	}

	async delete(id: number): Promise<void> {
		return api.delete(`/products/${id}`)
	}

	async setThreshold(
		id: number,
		data: { minQuantity: number; unit: string; householdId?: number | null }
	): Promise<ProductThreshold> {
		return api.post<ProductThreshold>(`/products/${id}/threshold`, data)
	}

	async deleteThreshold(id: number): Promise<void> {
		return api.delete(`/products/${id}/threshold`)
	}

	async getThresholds(): Promise<ProductThreshold[]> {
		return api.get<ProductThreshold[]>('/products/thresholds')
	}
}

export const productService = new ProductService()
