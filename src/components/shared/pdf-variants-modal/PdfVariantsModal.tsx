import './PdfVariantsModal.scss'

import { useTranslation } from 'react-i18next'

export interface PdfVariantsModalQuestion {
	key: string
	recipeId: number
	recipeTitle: string
	componentId: number
	componentName: string
	depth: number
	isOptional: boolean
	options: any[]
	rootTitle?: string
}

interface PdfVariantsModalProps {
	isOpen: boolean
	onClose: () => void
	questions: PdfVariantsModalQuestion[]
	selections: Record<string, number>
	loading: boolean
	merge: boolean
	showMultipleRoots?: boolean
	modalId: string
	onSelectionChange: (question: PdfVariantsModalQuestion, value: number) => void
	onMergeChange: (merge: boolean) => void
	onConfirm: () => void
}

export function PdfVariantsModal({
	isOpen,
	onClose,
	questions,
	selections,
	loading,
	merge,
	showMultipleRoots = false,
	modalId,
	onSelectionChange,
	onMergeChange,
	onConfirm,
}: PdfVariantsModalProps) {
	const { t } = useTranslation()

	if (!isOpen || questions.length === 0) return null

	return (
		<div className='modal-overlay' onClick={onClose}>
			<div className='modal-content recipe-card-pdf-modal' onClick={(e) => e.stopPropagation()}>
				<div className='recipe-card-pdf-header'>
					<h3 className='recipe-card-pdf-title'>{t('recipes.pdfSelectVariants')}</h3>
					<p className='recipe-card-pdf-hint'>{t('recipes.pdfSelectVariantsHint')}</p>
				</div>
				{loading && <p className='recipe-card-pdf-hint'>{t('loading')}</p>}
				{questions.map((q) => (
					<div
						key={q.key}
						className='recipe-card-pdf-group'
						style={{ marginLeft: `${q.depth * 14}px` }}>
						<label className='recipe-card-pdf-label'>
							{showMultipleRoots && q.rootTitle && (
								<span className='pdf-nested-prefix'>{q.rootTitle} › </span>
							)}
							{q.depth > 0 && <span className='pdf-nested-prefix'>{q.recipeTitle} - </span>}
							{q.componentName}
							{q.isOptional && (
								<span className='pdf-optional-badge'> ({t('recipes.optionalBadge')})</span>
							)}
						</label>
						<select
							className='form-input'
							value={selections[q.key] ?? 0}
							onChange={(e) => {
								const raw = parseInt(e.target.value)
								onSelectionChange(q, isNaN(raw) ? 0 : raw)
							}}
							disabled={loading}>
							{q.isOptional && <option value={0}>{t('recipes.pdfNoneOption')}</option>}
							{q.options.map((opt: any) => (
								<option key={opt.id} value={opt.id}>
									{opt.recipeId || opt.recipe ? '📖' : '🥬'}{' '}
									{opt.name || opt.recipe?.title || opt.ingredient?.name}
									{opt.isDefault ? ` (${t('default')})` : ''}
								</option>
							))}
						</select>
					</div>
				))}
				<div className='recipe-card-pdf-actions'>
					{questions.some((q) => q.depth > 0) && (
						<div className='pdf-merge-row'>
							<span className='recipe-card-pdf-label'>{t('recipes.pdfMode')}</span>
							<label className='pdf-radio-label'>
								<input
									type='radio'
									name={`pdfMode-${modalId}`}
									checked={!merge}
									onChange={() => onMergeChange(false)}
								/>
								{t('recipes.pdfModeMultiple')}
							</label>
							<label className='pdf-radio-label'>
								<input
									type='radio'
									name={`pdfMode-${modalId}`}
									checked={merge}
									onChange={() => onMergeChange(true)}
								/>
								{t('recipes.pdfModeSingle')}
							</label>
						</div>
					)}
					<div className='flex gap-1'>
						<button className='btn btn-outline' onClick={onClose}>
							{t('cancel')}
						</button>
						<button className='btn btn-primary' onClick={onConfirm} disabled={loading}>
							{t('recipes.downloadPdf')}
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}
