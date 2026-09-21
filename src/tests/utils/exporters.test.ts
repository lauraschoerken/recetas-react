import { describe, expect, it } from 'vitest'

import { buildTextPdfDocument } from '@/utils/exporters'

describe('buildTextPdfDocument', () => {
	it('creates a valid PDF with the exported text', async () => {
		const pdf = buildTextPdfDocument(['Receta 1', 'Resumen exportado'])

		expect(pdf).toBeInstanceOf(Blob)
		const text = await pdf.text()
		expect(text.startsWith('%PDF')).toBe(true)
		expect(text).toContain('Receta 1')
		expect(text).toContain('Resumen exportado')
	})
})
