import type { CreateHouseholdData, Household, UpdateHouseholdData } from '@/models'
import { api } from '@/services/api'

export type {
	CreateHouseholdData,
	Household,
	HouseholdInvite,
	HouseholdMember,
	UpdateHouseholdData,
} from '@/models'

class HouseholdService {
	async get(): Promise<Household | null> {
		try {
			const result = await api.get<any>('/household')
			if (
				!result ||
				(typeof result === 'object' && 'household' in result && result.household === null)
			)
				return null
			return result as Household
		} catch {
			return null
		}
	}

	async create(data: CreateHouseholdData): Promise<Household> {
		return api.post<Household>('/household', data)
	}

	async update(id: number, data: UpdateHouseholdData): Promise<Household> {
		return api.put<Household>(`/household/${id}`, data)
	}

	async invite(householdId: number, email: string): Promise<void> {
		await api.post(`/household/${householdId}/invite`, { email })
	}

	async acceptInvite(token: string): Promise<Household> {
		return api.post<Household>('/household/accept-invite', { token })
	}

	async joinByCode(code: string): Promise<Household> {
		return api.post<Household>('/household/join-by-code', { code })
	}

	async getPendingInvites(): Promise<
		{
			id: number
			email: string
			token: string
			household: { id: number; name: string }
			sender: { name: string }
		}[]
	> {
		return api.get('/household/pending-invites')
	}

	async removeMember(householdId: number, userId: number): Promise<void> {
		await api.delete(`/household/${householdId}/members/${userId}`)
	}

	async leave(householdId: number): Promise<void> {
		await api.post(`/household/${householdId}/leave`, {})
	}

	async updatePlanningScope(scope: 'own' | 'all'): Promise<void> {
		await api.put('/household/planning-scope', { scope })
	}
}

export const householdService = new HouseholdService()
