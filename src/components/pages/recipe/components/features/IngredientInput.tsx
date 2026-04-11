import './IngredientInput.scss'

import { useTranslation } from 'react-i18next'

import { CloseIcon } from '@/components/shared/icons'

interface IngredientForm {
	name: string
	quantity: number
	unit: string
}

interface IngredientInputProps {
	ingredient: IngredientForm
	onChange: (field: keyof IngredientForm, value: string | number) => void
	onRemove: () => void
	canRemove: boolean
}

const UNITS = [
	'unidad',
	'g',
	'kg',
	'ml',
	'l',
	'cucharada',
	'cucharadita',
	'taza',
	'pizca',
	'diente',
	'rebanada',
	'trozo',
]

export function IngredientInput({
	ingredient,
	onChange,
	onRemove,
	canRemove,
}: IngredientInputProps) {
	const { t } = useTranslation()

	return (
		<div className='ingredient-input'>
			<input
				type='text'
				className='form-input ingredient-name'
				value={ingredient.name}
				onChange={(e) => onChange('name', e.target.value)}
				placeholder={t('ingredients.namePlaceholder')}
			/>
			<input
				type='number'
				className='form-input ingredient-quantity'
				value={ingredient.quantity}
				onChange={(e) => onChange('quantity', parseFloat(e.target.value) || 0)}
				min={0}
				step={0.1}
				placeholder='Cant.'
			/>
			<select
				className='form-input ingredient-unit'
				value={ingredient.unit}
				onChange={(e) => onChange('unit', e.target.value)}>
				{UNITS.map((unit) => (
					<option key={unit} value={unit}>
						{unit}
					</option>
				))}
			</select>
			{canRemove ? (
				<button
					type='button'
					className='ingredient-remove'
					onClick={onRemove}
					title={t('recipes.deleteIngredient')}>
					<CloseIcon size={14} aria-hidden='true' />
				</button>
			) : (
				<div style={{ width: 40 }} />
			)}
		</div>
	)
}
