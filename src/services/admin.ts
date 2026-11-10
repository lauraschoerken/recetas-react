import { api } from '@/services/api'

export interface AdminUser {
	id: number
	name: string
	email: string
	role: string
	imageUrl?: string
	createdAt: string
}

export interface PendingIngredientVariant {
	id: number
	name: string
	isDefault: boolean
	calories?: number | null
	protein?: number | null
	carbs?: number | null
	fat?: number | null
	fiber?: number | null
	weightFactor: number
}

export interface PendingIngredientConversion {
	id: number
	unitName: string
	gramsPerUnit: number
}

export interface PendingIngredient {
	id: number
	name: string
	unit: string
	status: string
	imageUrl?: string | null
	defaultLocation?: string | null
	createdByUserId?: number
	createdBy?: { id: number; name: string; email: string }
	variants: PendingIngredientVariant[]
	conversions: PendingIngredientConversion[]
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

export type IngredientAuditIssue =
	| 'MISSING_IMAGE'
	| 'MISSING_MACROS'
	| 'POSSIBLE_DUPLICATE'
	| 'UNREVIEWED'

export interface AuditedIngredient extends PendingIngredient {
	preferredUnit?: string | null
	createdAt: string
	updatedAt: string
	reviewedAt?: string | null
	reviewedByUserId?: number | null
	issues: IngredientAuditIssue[]
	duplicateCandidates: Array<{ id: number; name: string; score: number }>
	usage: {
		recipes: number
		home: number
		shopping: number
		weekPlans: number
		stores: number
		settings: number
		total: number
	}
}

export interface IngredientImportChange {
	path: string
	before: unknown
	after: unknown
	impactedReferences: number
	risk: 'normal' | 'structural'
}

export interface IngredientImportPreview {
	valid: boolean
	overview: {
		received: number
		changed: number
		unchanged: number
		totalChanges: number
		impactedReferences: number
		structuralChanges: number
	}
	ingredients: Array<{
		id: number
		name: string
		changes: IngredientImportChange[]
		usageTotal: number
		impactedReferences: number
		omittedPreserved: { variants: string[]; conversions: string[]; tags: string[] }
	}>
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

	async getIngredientAudit(): Promise<AuditedIngredient[]> {
		return api.get<AuditedIngredient[]>('/admin/ingredients/audit')
	}

	async exportIngredients(ids: number[]): Promise<Record<string, unknown>> {
		return api.post<Record<string, unknown>>('/admin/ingredients/audit/export', { ids })
	}

	async validateIngredientImport(payload: unknown): Promise<IngredientImportPreview> {
		return api.post('/admin/ingredients/audit/import', { payload, dryRun: true })
	}

	async importIngredients(payload: unknown): Promise<IngredientImportPreview & { updated: number }> {
		return api.post('/admin/ingredients/audit/import', { payload, dryRun: false })
	}

	async markIngredientReviewed(id: number): Promise<void> {
		return api.patch(`/admin/ingredients/${id}/reviewed`, {})
	}

	async mergeIngredients(targetId: number, sourceIds: number[]): Promise<void> {
		return api.post('/admin/ingredients/merge', { targetId, sourceIds })
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
