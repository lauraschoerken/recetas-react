import { useTranslation } from 'react-i18next'

interface RecipeImportSourceModalProps {
	isOpen: boolean
	onClose: () => void
	onImportFromFile: () => void
	onImportFromText: () => void
}

export function RecipeImportSourceModal({
	isOpen,
	onClose,
	onImportFromFile,
	onImportFromText,
}: RecipeImportSourceModalProps) {
	const { t } = useTranslation()

	if (!isOpen) return null

	return (
		<div className='modal-overlay' onClick={onClose}>
			<div className='modal-card' onClick={(e) => e.stopPropagation()}>
				<h3>{t('recipes.importSourceTitle')}</h3>
				<div
					className='export-modal-actions'
					style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
					<button
						type='button'
						className='btn btn-primary'
						onClick={() => {
							onClose()
							onImportFromFile()
						}}>
						{t('recipes.importFromFile')}
					</button>
					<button
						type='button'
						className='btn btn-outline'
						onClick={() => {
							onClose()
							onImportFromText()
						}}>
						{t('recipes.importFromText')}
					</button>
				</div>
			</div>
		</div>
	)
}
