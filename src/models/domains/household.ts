export type HouseholdRole = 'ADMIN' | 'MEMBER'

export interface HouseholdMember {
	id: number
	role: HouseholdRole
	joinedAt: string
	userId: number
	householdId: number
	user?: { id: number; name: string; email: string; imageUrl?: string | null }
}

export interface HouseholdInvite {
	id: number
	email: string
	token: string
	expiresAt: string
	accepted: boolean
}

export interface Household {
	id: number
	name: string
	joinCode?: string
	shareHome: boolean
	shareShopping: boolean
	shareAlerts: boolean
	members: HouseholdMember[]
	invites?: HouseholdInvite[]
	myRole?: HouseholdRole
}

export interface CreateHouseholdData {
	name: string
}

export interface UpdateHouseholdData {
	name?: string
	shareHome?: boolean
	shareShopping?: boolean
	shareAlerts?: boolean
}
