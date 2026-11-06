import './WorkoutFormModal.scss'

import { FormEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { GarminWorkoutPreview } from '@/services/workout'

interface Props {
	open: boolean
	loading: boolean
	importing: boolean
	preview: GarminWorkoutPreview | null
	error: string
	onClose: () => void
	onPreview: (url: string) => void
	onImport: (url: string, addCaloriesToGoal: boolean) => void
}

const km = (meters: number | null) => meters == null ? '—' : `${(meters / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 })} km`
const meters = (value: number | null) => value == null ? '—' : `${Math.round(value).toLocaleString()} m`
const speed = (value: number | null) => value == null ? '—' : `${(value * 3.6).toLocaleString(undefined, { maximumFractionDigits: 2 })} km/h`
const duration = (seconds: number | null) => {
	if (seconds == null) return '—'
	const total = Math.round(seconds)
	const hours = Math.floor(total / 3600)
	const minutes = Math.floor((total % 3600) / 60)
	const remaining = total % 60
	return [hours, minutes, remaining].map((part, index) => index === 0 ? String(part) : String(part).padStart(2, '0')).join(':')
}

export function GarminImportModal({ open, loading, importing, preview, error, onClose, onPreview, onImport }: Props) {
	const { t } = useTranslation()
	const [url, setUrl] = useState('')
	const [addCalories, setAddCalories] = useState(false)
	useEffect(() => { if (open) { setUrl(''); setAddCalories(false) } }, [open])
	if (!open) return null
	const submit = (event: FormEvent) => { event.preventDefault(); onPreview(url) }
	return <div className='modal-overlay workout-modal-overlay' onClick={onClose}>
		<div className='modal-card workout-form-modal garmin-import-modal' onClick={(event) => event.stopPropagation()}>
			<div className='workout-form-heading'><div><span className='workout-kicker'>Garmin Connect</span><h2>{t('workouts.garminTitle')}</h2></div><button type='button' className='workout-close' onClick={onClose}>×</button></div>
			<p className='text-secondary'>{t('workouts.garminHint')}</p>
			<form className='garmin-url-row' onSubmit={submit}><input required type='url' value={url} onChange={(event) => setUrl(event.target.value)} placeholder='https://connect.garmin.com/app/activity/…?share_unique_id=…' /><button className='btn btn-outline' disabled={loading}>{loading ? t('workouts.garminReading') : t('workouts.garminRead')}</button></form>
			{error && <div className='field-error garmin-error'>{error}</div>}
			{preview && <>
				<div className='garmin-preview-heading'><div><strong>{preview.title}</strong><small>{new Date(preview.performedAt).toLocaleString()}</small></div>{preview.locationName && <span>📍 {preview.locationName}</span>}</div>
				<div className='garmin-preview-grid'>
					<div><span>{t('workouts.distance')}</span><strong>{km(preview.distanceMeters)}</strong></div>
					<div><span>{t('workouts.totalTime')}</span><strong>{duration(preview.durationSeconds)}</strong></div>
					<div><span>{t('workouts.movingTime')}</span><strong>{duration(preview.movingDurationSeconds)}</strong></div>
					<div><span>{t('workouts.steps')}</span><strong>{preview.steps?.toLocaleString() || '—'}</strong></div>
					<div><span>{t('workouts.averageSpeed')}</span><strong>{speed(preview.averageSpeedMps)}</strong></div>
					<div><span>{t('workouts.maxSpeed')}</span><strong>{speed(preview.maxSpeedMps)}</strong></div>
					<div><span>{t('workouts.calories')}</span><strong>{preview.caloriesBurned ?? '—'} kcal</strong></div>
					<div><span>{t('workouts.heartRate')}</span><strong>{preview.averageHeartRate ?? '—'} ppm</strong></div>
					<div><span>{t('workouts.ascent')}</span><strong>{meters(preview.elevationGainMeters)}</strong></div>
					<div><span>{t('workouts.descent')}</span><strong>{meters(preview.elevationLossMeters)}</strong></div>
				</div>
				<label className='workout-calorie-toggle'><input type='checkbox' checked={addCalories} onChange={(event) => setAddCalories(event.target.checked)} /><span><strong>{t('workouts.addToGoal')}</strong><small>{t('workouts.addToGoalHint')}</small></span></label>
				<div className='modal-actions'><button type='button' className='btn btn-outline' onClick={onClose}>{t('cancel')}</button><button type='button' className='btn btn-primary' disabled={importing} onClick={() => onImport(url, addCalories)}>{importing ? t('workouts.importing') : t('workouts.garminImport')}</button></div>
			</>}
		</div>
	</div>
}
