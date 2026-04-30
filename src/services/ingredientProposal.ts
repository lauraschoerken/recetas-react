import { api } from '@/services/api'

export type ProposalType =
	| 'EDIT_FIELD'
	| 'NEW_CONVERSION'
	| 'NEW_VARIANT'
	| 'EDIT_VARIANT'
	| 'NEW_INGREDIENT'
export type ProposalStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED'

export interface CreateProposalData {
	type: ProposalType
	ingredientId: number
	variantId?: number
	fieldName?: string
	currentValue?: unknown
	proposedValue?: unknown
}

export interface IngredientProposal {
	id: number
	type: ProposalType
	status: ProposalStatus
	ingredientId: number
	variantId?: number | null
	fieldName?: string | null
	currentValue?: unknown
	proposedValue?: unknown
	adminNote?: string | null
	createdAt: string
	proposedBy: { id: number; name: string; email: string }
	ingredient: { id: number; name: string }
}

class IngredientProposalService {
	async create(data: CreateProposalData): Promise<IngredientProposal> {
		return api.post<IngredientProposal>('/ingredient-proposals', data)
	}

	async getMine(status?: ProposalStatus): Promise<IngredientProposal[]> {
		const q = status ? `?status=${status}` : ''
		return api.get<IngredientProposal[]>(`/ingredient-proposals${q}`)
	}
}

export const ingredientProposalService = new IngredientProposalService()
