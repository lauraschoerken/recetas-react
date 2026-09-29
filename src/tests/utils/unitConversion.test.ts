import { describe, expect, it } from 'vitest'

import { convertUnitQuantity, getAvailableUnits, roundUnitQuantity } from '@/utils/unitConversion'

describe('unit conversion', () => {
	it('preserves the physical quantity between grams and kilograms', () => {
		expect(convertUnitQuantity(1000, 'g', 'kg', 'g')).toBe(1)
		expect(convertUnitQuantity(1, 'kg', 'g', 'g')).toBe(1000)
	})

	it('uses ingredient-specific units in both directions', () => {
		const conversions = [{ unitName: 'botella', gramsPerUnit: 750 }]
		expect(convertUnitQuantity(1500, 'ml', 'botella', 'ml', conversions)).toBe(2)
		expect(convertUnitQuantity(0.5, 'botella', 'ml', 'ml', conversions)).toBe(375)
	})

	it('keeps useful decimals instead of rounding purchase units up', () => {
		expect(roundUnitQuantity(convertUnitQuantity(250, 'g', 'kg', 'g')!)).toBe(0.25)
	})

	it('adds standard large units without duplicating configured units', () => {
		expect(getAvailableUnits('g', [{ unitName: 'KG', gramsPerUnit: 1000 }])).toEqual(['g', 'KG'])
	})
})
