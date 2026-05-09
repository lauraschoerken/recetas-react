import {
	Product,
	ProductOverride,
	ProductProposal,
	ProductThreshold,
} from '@/models/domains/product'
import { api } from '@/services/api'

export type { Product, ProductOverride, ProductProposal, ProductThreshold }

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

	async addToShoppingList(id: number, quantity: number, unit: string): Promise<{ added: number }> {
		return api.post<{ added: number }>('/shopping-list/add-product', {
			productId: id,
			quantity,
			unit,
		})
	}

	async addToHome(
		id: number,
		data: { location: string; quantity: number; unit: string; expiresAt?: string }
	): Promise<unknown> {
		return api.post('/home', { productId: id, ...data })
	}

	// ── Override personal ──────────────────────────────────────────────

	async getOverride(id: number): Promise<ProductOverride | null> {
		return api.get<ProductOverride | null>(`/products/${id}/override`)
	}

	async upsertOverride(
		id: number,
		data: { name?: string; imageUrl?: string | null }
	): Promise<ProductOverride> {
		return api.put<ProductOverride>(`/products/${id}/override`, data)
	}

	async deleteOverride(id: number): Promise<void> {
		return api.delete(`/products/${id}/override`)
	}

	// ── Ocultación personal ────────────────────────────────────────────────

	async hide(id: number): Promise<void> {
		return api.post(`/products/${id}/hide`, {})
	}

	async unhide(id: number): Promise<void> {
		return api.delete(`/products/${id}/hide`)
	}

	async getHidden(): Promise<Product[]> {
		return api.get<Product[]>('/products/hidden')
	}

	// ── Propuestas ────────────────────────────────────────────────────

	async propose(
		id: number,
		data: { fieldName: 'name' | 'imageUrl'; currentValue: string; proposedValue: string }
	): Promise<ProductProposal> {
		return api.post<ProductProposal>(`/products/${id}/propose`, data)
	}

	async getProposals(): Promise<ProductProposal[]> {
		return api.get<ProductProposal[]>('/products/proposals')
	}

	async reviewProposal(
		id: number,
		data: { decision: 'ACCEPTED' | 'REJECTED'; adminNote?: string }
	): Promise<ProductProposal> {
		return api.put<ProductProposal>(`/products/proposals/${id}/review`, data)
	}
}

export const productService = new ProductService()
