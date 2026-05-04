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
