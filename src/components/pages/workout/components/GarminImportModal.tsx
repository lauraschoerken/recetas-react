import './WorkoutFormModal.scss'

import { FormEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { GarminWorkoutPreview } from '@/services/workout'
import { activityFamily, activityIcon, activityLabel } from '@/components/pages/workout/activityPresentation'

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
const pace = (value: number | null) => {
	if (value == null || value <= 0) return '—'
	const seconds = Math.round(1000 / value)
	return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} min/km`
}
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
	const family = activityFamily(preview?.activityType)
	const metrics = preview ? [
		preview.durationSeconds != null && [t('workouts.totalTime'), duration(preview.durationSeconds), '⏱'],
		preview.movingDurationSeconds != null && [t('workouts.movingTime'), duration(preview.movingDurationSeconds), '▶'],
		preview.distanceMeters != null && [t('workouts.distance'), km(preview.distanceMeters), '↔'],
		(family === 'running' || family === 'walking' || family === 'hiking') && preview.averageSpeedMps != null && [t('workouts.averagePace'), pace(preview.averageSpeedMps), '🏃'],
		family === 'cycling' && preview.averageSpeedMps != null && [t('workouts.averageSpeed'), speed(preview.averageSpeedMps), '⚡'],
		family === 'cycling' && preview.maxSpeedMps != null && [t('workouts.maxSpeed'), speed(preview.maxSpeedMps), '🚀'],
		preview.steps != null && [t('workouts.steps'), preview.steps.toLocaleString(), '👟'],
		preview.totalSets != null && [t('workouts.totalSets'), preview.totalSets.toLocaleString(), '▦'],
		preview.totalReps != null && [t('workouts.totalReps'), preview.totalReps.toLocaleString(), '↻'],
		preview.caloriesBurned != null && [t('workouts.calories'), `${preview.caloriesBurned} kcal`, '🔥'],
		preview.averageHeartRate != null && [t('workouts.heartRate'), `${preview.averageHeartRate} ppm`, '♥'],
		preview.averageCadence != null && [t('workouts.averageCadence'), `${Math.round(preview.averageCadence)} rpm`, '⟳'],
		preview.averagePowerWatts != null && [t('workouts.averagePower'), `${preview.averagePowerWatts} W`, '⚡'],
		preview.normalizedPowerWatts != null && [t('workouts.normalizedPower'), `${preview.normalizedPowerWatts} W`, '≈'],
		preview.elevationGainMeters != null && [t('workouts.ascent'), meters(preview.elevationGainMeters), '↗'],
		preview.elevationLossMeters != null && [t('workouts.descent'), meters(preview.elevationLossMeters), '↘'],
		preview.aerobicTrainingEffect != null && [t('workouts.aerobicEffect'), preview.aerobicTrainingEffect.toLocaleString(undefined,{maximumFractionDigits:1}), 'A'],
		preview.anaerobicTrainingEffect != null && [t('workouts.anaerobicEffect'), preview.anaerobicTrainingEffect.toLocaleString(undefined,{maximumFractionDigits:1}), 'N'],
	].filter(Boolean) as string[][] : []
	return <div className='modal-overlay workout-modal-overlay' onClick={onClose}>
		<div className='modal-card workout-form-modal garmin-import-modal' onClick={(event) => event.stopPropagation()}>
			<div className='workout-form-heading'><div><span className='workout-kicker'>Garmin Connect</span><h2>{t('workouts.garminTitle')}</h2></div><button type='button' className='workout-close' onClick={onClose}>×</button></div>
			<p className='text-secondary'>{t('workouts.garminHint')}</p>
			<form className='garmin-url-row' onSubmit={submit}><input required type='url' value={url} onChange={(event) => setUrl(event.target.value)} placeholder='https://connect.garmin.com/app/activity/…?share_unique_id=…' /><button className='btn btn-outline' disabled={loading}>{loading ? t('workouts.garminReading') : t('workouts.garminRead')}</button></form>
			{error && <div className='field-error garmin-error'>{error}</div>}
			{preview && <>
				<div className='garmin-preview-heading'><div><strong>{preview.title}</strong><small>{new Date(preview.performedAt).toLocaleString()}</small></div><div className='garmin-preview-context'><span className={`workout-activity-badge activity-${family}`}>{activityIcon(preview.activityType)} {activityLabel(preview.activityType, t)}</span>{preview.locationName && <span>📍 {preview.locationName}</span>}</div></div>
				<div className='garmin-preview-grid'>
					{metrics.map(([label,value,icon]) => <div key={label}><span>{icon} {label}</span><strong>{value}</strong></div>)}
				</div>
				<label className='workout-calorie-toggle'><input type='checkbox' checked={addCalories} onChange={(event) => setAddCalories(event.target.checked)} /><span><strong>{t('workouts.addToGoal')}</strong><small>{t('workouts.addToGoalHint')}</small></span></label>
				<div className='modal-actions'><button type='button' className='btn btn-outline' onClick={onClose}>{t('cancel')}</button><button type='button' className='btn btn-primary' disabled={importing} onClick={() => onImport(url, addCalories)}>{importing ? t('workouts.importing') : t('workouts.garminImport')}</button></div>
			</>}
		</div>
	</div>
}
