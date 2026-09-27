import { useTranslation } from 'react-i18next'

interface RecipeJsonTextModalProps {
	isOpen: boolean
	value: string
	error: string
	onChange: (value: string) => void
	onClose: () => void
	onSubmit: () => void
}

export function RecipeJsonTextModal({
	isOpen,
	value,
	error,
	onChange,
	onClose,
	onSubmit,
}: RecipeJsonTextModalProps) {
	const { t } = useTranslation()

	if (!isOpen) return null

	return (
		<div className='modal-overlay' onClick={onClose}>
			<div className='modal-card' onClick={(e) => e.stopPropagation()}>
				<h3>{t('recipes.importJsonTextTitle')}</h3>
				<textarea
					id='recipe-json-paste-box'
					className='form-input'
					value={value}
					onChange={(e) => onChange(e.target.value)}
					placeholder={t('recipes.importJsonTextPlaceholder')}
					rows={18}
					style={{ width: '100%', minHeight: '260px', resize: 'vertical' }}
				/>
				{error && <div className='field-error'>{error}</div>}
				<div
					className='export-modal-actions'
					style={{
						display: 'flex',
						justifyContent: 'flex-end',
						gap: '0.75rem',
						marginTop: '1rem',
					}}>
					<button type='button' className='btn btn-primary' onClick={onSubmit}>
						{t('recipes.importJsonTextAction')}
					</button>
					<button type='button' className='btn btn-outline' onClick={onClose}>
						{t('cancel')}
					</button>
				</div>
			</div>
		</div>
	)
}
