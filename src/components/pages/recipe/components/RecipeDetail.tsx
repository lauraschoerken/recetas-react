import './RecipeDetail.css'

import { Link } from 'react-router-dom'

import { Recipe } from '@/services/recipe'

interface RecipeDetailProps {
	recipe: Recipe
	onDelete: () => void
	onAddToWeek: () => void
}

export function RecipeDetail({ recipe, onDelete, onAddToWeek }: RecipeDetailProps) {
	const hasComponents = recipe.components && recipe.components.length > 0
	const hasIngredients = recipe.ingredients && recipe.ingredients.length > 0
	const hasNutrition =
		recipe.nutritionPerServing &&
		(recipe.nutritionPerServing.calories > 0 ||
			recipe.nutritionPerServing.protein > 0 ||
			recipe.nutritionPerServing.carbs > 0 ||
			recipe.nutritionPerServing.fat > 0)

	return (
		<div className='recipe-detail'>
			<div className='recipe-detail-header'>
				<div>
					<h1 className='recipe-detail-title'>{recipe.title}</h1>
					<p className='recipe-detail-servings'>{recipe.servings} porciones</p>
				</div>
				<div className='recipe-detail-actions'>
					<button className='btn btn-primary' onClick={onAddToWeek}>
						+ Añadir a la semana
					</button>
					<Link to={`/recipes/${recipe.id}/edit`} className='btn btn-outline'>
						Editar
					</Link>
					<button className='btn btn-danger' onClick={onDelete}>
						Eliminar
					</button>
				</div>
			</div>

			{recipe.imageUrl && (
				<div className='recipe-detail-image'>
					<img src={recipe.imageUrl} alt={recipe.title} />
				</div>
			)}

			{recipe.description && <p className='recipe-detail-description'>{recipe.description}</p>}

			{hasNutrition && recipe.nutritionPerServing && (
				<div className='recipe-nutrition-card'>
					<h3>
						Información nutricional <span className='nutrition-subtitle'>(por porción)</span>
					</h3>
					<div className='nutrition-grid'>
						<div className='nutrition-item'>
							<span className='nutrition-value'>{recipe.nutritionPerServing.calories}</span>
							<span className='nutrition-label'>kcal</span>
						</div>
						<div className='nutrition-item protein'>
							<span className='nutrition-value'>{recipe.nutritionPerServing.protein}g</span>
							<span className='nutrition-label'>Proteína</span>
						</div>
						<div className='nutrition-item carbs'>
							<span className='nutrition-value'>{recipe.nutritionPerServing.carbs}g</span>
							<span className='nutrition-label'>Carbos</span>
						</div>
						<div className='nutrition-item fat'>
							<span className='nutrition-value'>{recipe.nutritionPerServing.fat}g</span>
							<span className='nutrition-label'>Grasa</span>
						</div>
						<div className='nutrition-item fiber'>
							<span className='nutrition-value'>{recipe.nutritionPerServing.fiber}g</span>
							<span className='nutrition-label'>Fibra</span>
						</div>
					</div>
					{recipe.nutrition && (
						<p className='nutrition-total'>
							Total receta: {recipe.nutrition.calories} kcal | {recipe.nutrition.protein}g prot |{' '}
							{recipe.nutrition.carbs}g carbs | {recipe.nutrition.fat}g grasa |{' '}
							{recipe.nutrition.fiber}g fibra
						</p>
					)}
				</div>
			)}

			{hasIngredients && (
				<div className='recipe-detail-section'>
					<h2>Ingredientes</h2>
					<ul className='recipe-ingredients-list'>
						{recipe.ingredients.map((ing) => (
							<li key={ing.id} className='recipe-ingredient-item'>
								<span className='ingredient-quantity'>
									{ing.quantity} {ing.unit}
								</span>
								<span className='ingredient-name'>{ing.name}</span>
							</li>
						))}
					</ul>
				</div>
			)}

			{hasComponents && (
				<div className='recipe-detail-section'>
					<h2>Componentes</h2>
					<div className='recipe-components-list'>
						{recipe.components!.map((comp) => (
							<div key={comp.id} className='recipe-component'>
								<h3 className='component-name'>
									{comp.name}
									{comp.isOptional && <span className='optional-badge'>Opcional</span>}
								</h3>
								<ul className='component-options'>
									{comp.options.map((opt) => (
										<li
											key={opt.id}
											className={`component-option ${opt.isDefault ? 'default' : ''}`}>
											<span className='option-name'>{opt.name}</span>
											{opt.recipe && (
												<Link to={`/recipes/${opt.recipe.id}`} className='option-link'>
													Ver receta
												</Link>
											)}
											{opt.ingredient && opt.quantity && (
												<span className='option-quantity'>
													({opt.quantity} {opt.unit})
												</span>
											)}
											{opt.isDefault && <span className='default-badge'>Por defecto</span>}
										</li>
									))}
								</ul>
							</div>
						))}
					</div>
				</div>
			)}

			{recipe.instructions && (
				<div className='recipe-detail-section'>
					<h2>Instrucciones</h2>
					<div className='recipe-instructions'>
						{recipe.instructions.split('\n').map((line, index) => (
							<p key={index}>{line}</p>
						))}
					</div>
				</div>
			)}

			<div className='recipe-detail-footer'>
				<Link to='/recipes' className='btn btn-outline'>
					&larr; Volver a recetas
				</Link>
			</div>
		</div>
	)
}
