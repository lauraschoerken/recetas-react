export interface UnitConversionValue {
	unitName: string
	gramsPerUnit: number
}

const normalizeUnit = (unit: string) => unit.trim().toLocaleLowerCase()

function standardFactor(unit: string, baseUnit: string): number | null {
	const normalized = normalizeUnit(unit)
	const base = normalizeUnit(baseUnit)

	if (normalized === base) return 1
	if (base === 'g' && ['kg', 'kilo', 'kilogramo', 'kilogram'].includes(normalized)) return 1000
	if (base === 'ml' && ['l', 'litro', 'liter'].includes(normalized)) return 1000
	return null
}

export function getUnitFactor(
	unit: string,
	baseUnit: string,
	conversions: UnitConversionValue[] = []
): number | null {
	const normalized = normalizeUnit(unit)
	const conversion = conversions.find((item) => normalizeUnit(item.unitName) === normalized)
	if (conversion?.gramsPerUnit && conversion.gramsPerUnit > 0) return conversion.gramsPerUnit
	return standardFactor(unit, baseUnit)
}

export function convertUnitQuantity(
	quantity: number,
	fromUnit: string,
	toUnit: string,
	baseUnit: string,
	conversions: UnitConversionValue[] = []
): number | null {
	const fromFactor = getUnitFactor(fromUnit, baseUnit, conversions)
	const toFactor = getUnitFactor(toUnit, baseUnit, conversions)
	if (fromFactor == null || toFactor == null || toFactor <= 0) return null
	return quantity * (fromFactor / toFactor)
}

export function roundUnitQuantity(quantity: number): number {
	return Math.round((quantity + Number.EPSILON) * 1000) / 1000
}

export function getAvailableUnits(
	baseUnit: string,
	conversions: UnitConversionValue[] = []
): string[] {
	const units = [baseUnit, ...conversions.map((conversion) => conversion.unitName)]
	const base = normalizeUnit(baseUnit)
	if (base === 'g') units.push('kg')
	if (base === 'ml') units.push('l')

	const seen = new Set<string>()
	return units.filter((unit) => {
		const normalized = normalizeUnit(unit)
		if (!normalized || seen.has(normalized)) return false
		seen.add(normalized)
		return true
	})
}

export function formatUnitQuantity(quantity: number): string {
	return new Intl.NumberFormat(undefined, {
		maximumFractionDigits: 3,
		useGrouping: false,
	}).format(roundUnitQuantity(quantity))
}
