import { api } from '@/services/api'

export interface AdminUser {
	id: number
	name: string
	email: string
	role: string
	imageUrl?: string
	createdAt: string
}

export interface PendingIngredient {
	id: number
	name: string
	status: string
	createdByUserId?: number
	createdBy?: { id: number; name: string; email: string }
	variants: Array<{ id: number; name: string }>
}

export interface Proposal {
	id: number
	type: string
	status: string
	proposedByUserId: number
	proposedBy: { id: number; name: string; email: string }
	reviewedBy?: { id: number; name: string }
	ingredientId: number
	ingredient: { id: number; name: string }
	variantId?: number
	variant?: { id: number; name: string }
	fieldName?: string
	currentValue?: unknown
	proposedValue?: unknown
	adminNote?: string
	createdAt: string
}

class AdminService {
	async getUsers(params?: {
		page?: number
		pageSize?: number
		search?: string
	}): Promise<{ data: AdminUser[]; total: number }> {
		const q = new URLSearchParams()
		if (params?.page) q.set('page', String(params.page))
		if (params?.pageSize) q.set('pageSize', String(params.pageSize))
		if (params?.search) q.set('search', params.search)
		return api.get<{ data: AdminUser[]; total: number }>(`/admin/users?${q}`)
	}

	async setRole(userId: number, role: 'USER' | 'ADMIN'): Promise<AdminUser> {
		return api.put<AdminUser>(`/admin/users/${userId}/role`, { role })
	}

	async deleteUser(userId: number): Promise<void> {
		return api.delete(`/admin/users/${userId}`)
	}

	async getPendingIngredients(): Promise<PendingIngredient[]> {
		return api.get<PendingIngredient[]>('/admin/ingredients/pending')
	}

	async getPendingProposals(): Promise<Proposal[]> {
		return api.get<Proposal[]>('/admin/proposals/pending')
	}

	async approveIngredient(id: number): Promise<void> {
		return api.patch(`/ingredients/${id}/approve`, {})
	}

	async rejectIngredient(id: number): Promise<void> {
		return api.patch(`/ingredients/${id}/reject`, {})
	}

	async reviewProposal(
		proposalId: number,
		status: 'ACCEPTED' | 'REJECTED',
		adminNote?: string
	): Promise<Proposal> {
		return api.put<Proposal>(`/ingredient-proposals/${proposalId}/review`, { status, adminNote })
	}
}

export const adminService = new AdminService()
