export interface Product {
	id: number
	name: string
	imageUrl: string | null
	status: 'GLOBAL' | 'PRIVATE'
	createdByUserId: number | null
	createdAt: string
}

export interface ProductThreshold {
	id: number
	productId: number
	minQuantity: number
	unit: string
	userId: number | null
	householdId: number | null
}

export interface ProductOverride {
	id: number
	userId: number
	productId: number
	name: string | null
	imageUrl: string | null
}

export interface ProductProposal {
	id: number
	type: string
	status: 'PENDING' | 'ACCEPTED' | 'REJECTED'
	proposedByUserId: number
	reviewedByUserId: number | null
	productId: number
	fieldName: string | null
	currentValue: string | null
	proposedValue: string | null
	adminNote: string | null
	createdAt: string
	updatedAt: string
	product?: { id: number; name: string; imageUrl: string | null }
	proposedBy?: { id: number; name: string; email: string }
	reviewedBy?: { id: number; name: string } | null
}
