import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_FILTERS, RecipeFilters } from '@/components/pages/recipe/components/RecipeFilters'
import { ingredientService } from '@/services/ingredient'

describe('RecipeFilters', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('permite buscar y acumular varios ingredientes seleccionados', async () => {
		const user = userEvent.setup()
		const onChange = vi.fn()
		const searchSpy = vi.spyOn(ingredientService, 'search').mockResolvedValue([
			{ id: 21, name: 'Pechuga de pollo', unit: 'g' },
			{ id: 22, name: 'Pollo entero', unit: 'g' },
		] as Awaited<ReturnType<typeof ingredientService.search>>)

		function ControlledFilters() {
			const [filters, setFilters] = useState(DEFAULT_FILTERS)
			return (
				<RecipeFilters
					filters={filters}
					availableTags={[]}
					authors={[]}
					onChange={(nextFilters) => {
						onChange(nextFilters)
						setFilters(nextFilters)
					}}
					onClear={vi.fn()}
					onClose={vi.fn()}
					activeCount={filters.ingredients.length}
				/>
			)
		}

		render(<ControlledFilters />)

		const input = screen.getByRole('combobox', { name: /ingrediente|ingredient/i })
		await user.type(input, 'pol')

		await waitFor(() => expect(searchSpy).toHaveBeenCalledWith('pol'))
		expect(await screen.findByRole('option', { name: /pechuga de pollo/i })).toBeVisible()
		expect(screen.getByRole('option', { name: /pollo entero/i })).toBeVisible()

		fireEvent.mouseDown(screen.getByRole('option', { name: /pechuga de pollo/i }))
		await user.click(screen.getByRole('option', { name: /pechuga de pollo/i }))

		expect(input).toHaveValue('')
		expect(screen.getByText('Pechuga de pollo')).toBeVisible()

		await user.type(input, 'pol')
		expect(await screen.findByRole('option', { name: /pollo entero/i })).toBeVisible()
		fireEvent.mouseDown(screen.getByRole('option', { name: /pollo entero/i }))
		await user.click(screen.getByRole('option', { name: /pollo entero/i }))

		expect(screen.getByText('Pechuga de pollo')).toBeVisible()
		expect(screen.getByText('Pollo entero')).toBeVisible()
		expect(onChange).toHaveBeenLastCalledWith(
			expect.objectContaining({
				ingredients: [
					expect.objectContaining({ id: 21, name: 'Pechuga de pollo' }),
					expect.objectContaining({ id: 22, name: 'Pollo entero' }),
				],
			})
		)
	})
})
