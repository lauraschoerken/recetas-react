import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface Props { open: boolean; importing: boolean; onClose: () => void; onImport: (json: string) => void }

export function WorkoutImportModal({ open, importing, onClose, onImport }: Props) {
	const { t } = useTranslation(); const [json,setJson]=useState(''); const [error,setError]=useState('')
	useEffect(()=>{if(open){setJson('');setError('')}},[open])
	if(!open)return null
	const submit=()=>{try{JSON.parse(json);setError('');onImport(json)}catch{setError(t('workouts.importInvalid'))}}
	return <div className='modal-overlay' onClick={onClose}><div className='modal-card modal-card-lg' onClick={(e)=>e.stopPropagation()}><h3>{t('workouts.importTitle')}</h3><p className='text-secondary'>{t('workouts.importHint')}</p><label className='btn btn-outline workout-file-button'>{t('workouts.chooseJson')}<input type='file' accept='.json,application/json' onChange={async(e)=>{const file=e.target.files?.[0];if(file)setJson(await file.text())}}/></label><textarea className='form-input workout-json-input' rows={16} value={json} onChange={(e)=>setJson(e.target.value)} placeholder={t('workouts.importPlaceholder')}/>{error&&<div className='field-error'>{error}</div>}<div className='modal-actions'><button className='btn btn-outline' onClick={onClose}>{t('cancel')}</button><button className='btn btn-primary' disabled={importing||!json.trim()} onClick={submit}>{importing?t('workouts.importing'):t('workouts.importAction')}</button></div></div></div>
}
