import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
	isOpen: boolean
	importing: boolean
	onClose: () => void
	onImport: (json: string) => void
}

export function WeekPlanImportModal({ isOpen, importing, onClose, onImport }: Props) {
	const { t } = useTranslation()
	const [json, setJson] = useState('')
	const [error, setError] = useState('')

	useEffect(() => {
		if (isOpen) {
			setJson('')
			setError('')
		}
	}, [isOpen])

	if (!isOpen) return null

	const submit = () => {
		try {
			JSON.parse(json)
			setError('')
			onImport(json)
		} catch {
			setError(t('weekPlan.importInvalidJson'))
		}
	}

	return (
		<div className='modal-overlay' onClick={onClose}>
			<div className='modal-card modal-card-lg' onClick={(e) => e.stopPropagation()}>
				<h3>{t('weekPlan.importTitle')}</h3>
				<p className='text-secondary'>{t('weekPlan.importHint')}</p>
				<label className='btn btn-outline week-plan-file-button'>
					{t('weekPlan.chooseJsonFile')}
					<input
						type='file'
						accept='.json,application/json'
						onChange={async (e) => {
							const file = e.target.files?.[0]
							if (file) setJson(await file.text())
						}}
					/>
				</label>
				<textarea
					className='form-input week-plan-json-input'
					rows={16}
					value={json}
					onChange={(e) => setJson(e.target.value)}
					placeholder={t('weekPlan.importPlaceholder')}
				/>
				{error && <div className='field-error'>{error}</div>}
				<div className='modal-actions'>
					<button className='btn btn-outline' onClick={onClose}>{t('cancel')}</button>
					<button className='btn btn-primary' disabled={importing || !json.trim()} onClick={submit}>{importing ? t('weekPlan.importing') : t('weekPlan.importAction')}</button>
				</div>
			</div>
		</div>
	)
}
