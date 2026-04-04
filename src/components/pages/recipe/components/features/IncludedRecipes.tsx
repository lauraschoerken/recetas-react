import './IncludedRecipes.css'

import { useEffect, useState } from 'react'

import { Recipe, recipeService } from '@/services/recipe'

export interface IncludedRecipe {
	id: string
	recipeId: number | null
	recipeName: string
	servings: number
}

interface IncludedRecipesProps {
	recipes: IncludedRecipe[]
	onChange: (recipes: IncludedRecipe[]) => void
}

export function IncludedRecipes({ recipes, onChange }: IncludedRecipesProps) {
	const [availableRecipes, setAvailableRecipes] = useState<Recipe[]>([])

	useEffect(() => {
		recipeService.getAll().then(setAvailableRecipes).catch(console.error)
	}, [])

	const addRecipe = () => {
		onChange([
			...recipes,
			{
				id: `inc-${Date.now()}`,
				recipeId: null,
				recipeName: '',
				servings: 1,
			},
		])
	}

	const removeRecipe = (index: number) => {
		const updated = [...recipes]
		updated.splice(index, 1)
		onChange(updated)
	}

	const updateRecipe = (index: number, recipeId: number | null) => {
		const updated = [...recipes]
		const recipe = availableRecipes.find((r) => r.id === recipeId)
		updated[index] = {
			...updated[index],
			recipeId,
			recipeName: recipe?.title || '',
		}
		onChange(updated)
	}

	const updateServings = (index: number, servings: number) => {
		const updated = [...recipes]
		updated[index] = { ...updated[index], servings }
		onChange(updated)
	}

	return (
		<div className='included-recipes-component'>
			<div className='included-recipes-table'>
				<div className='included-recipes-header'>
					<span>RECETA</span>
					<span>RACIONES</span>
					<span></span>
				</div>
				<div className='included-recipes-body'>
					{recipes.map((item, index) => (
						<div key={item.id} className='included-recipes-row'>
							<select
								className='form-input'
								value={item.recipeId || ''}
								onChange={(e) =>
									updateRecipe(index, e.target.value ? parseInt(e.target.value) : null)
								}>
								<option value=''>Selecciona receta...</option>
								{availableRecipes.map((r) => (
									<option key={r.id} value={r.id}>
										{r.title}
									</option>
								))}
							</select>

							<input
								type='number'
								className='form-input'
								value={item.servings}
								onChange={(e) => updateServings(index, parseFloat(e.target.value) || 1)}
								min={0.1}
								step={0.1}
							/>

							<button
								type='button'
								className='included-recipes-remove-btn'
								onClick={() => removeRecipe(index)}
								title='Eliminar'>
								×
							</button>
						</div>
					))}
					{recipes.length === 0 && (
						<div className='included-recipes-row'>
							<select
								className='form-input'
								value=''
								onChange={(e) => {
									if (e.target.value) {
										const recipe = availableRecipes.find((r) => r.id === parseInt(e.target.value))
										onChange([
											{
												id: `inc-${Date.now()}`,
												recipeId: parseInt(e.target.value),
												recipeName: recipe?.title || '',
												servings: 1,
											},
										])
									}
								}}>
								<option value=''>Selecciona receta...</option>
								{availableRecipes.map((r) => (
									<option key={r.id} value={r.id}>
										{r.title}
									</option>
								))}
							</select>

							<input type='number' className='form-input' value={1} disabled min={0.1} step={0.1} />

							<button
								type='button'
								className='included-recipes-remove-btn'
								style={{ visibility: 'hidden' }}>
								×
							</button>
						</div>
					)}
				</div>
			</div>

			<button type='button' className='included-recipes-add-btn' onClick={addRecipe}>
				+ Añadir receta
			</button>
		</div>
	)
}
