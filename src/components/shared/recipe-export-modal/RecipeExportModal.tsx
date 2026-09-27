import { useTranslation } from 'react-i18next'

interface RecipeExportModalProps {
	isOpen: boolean
	onClose: () => void
	onExportPdf: () => void
	onExportJson: () => void
	onExportCsv?: () => void
	title?: string
}

export function RecipeExportModal({
	isOpen,
	onClose,
	onExportPdf,
	onExportJson,
	onExportCsv,
	title,
}: RecipeExportModalProps) {
	const { t } = useTranslation()

	if (!isOpen) return null

	return (
		<div className='modal-overlay' onClick={onClose}>
			<div className='modal-card' onClick={(e) => e.stopPropagation()}>
				<h3>{title ?? t('recipes.exportPdfSelected')}</h3>
				<div className='export-modal-actions'>
					<button
						className='btn btn-outline'
						onClick={() => {
							onClose()
							onExportPdf()
						}}>
						{t('recipes.exportPdfSelected')}
					</button>
					<button
						className='btn btn-outline'
						onClick={() => {
							onClose()
							onExportJson()
						}}>
						{t('recipes.exportJson')}
					</button>
					{onExportCsv && (
						<button
							className='btn btn-outline'
							onClick={() => {
								onClose()
								onExportCsv()
							}}>
							{t('recipes.exportCsv')}
						</button>
					)}
					<button className='btn btn-secondary' onClick={onClose}>
						{t('cancel')}
					</button>
				</div>
			</div>
		</div>
	)
}
