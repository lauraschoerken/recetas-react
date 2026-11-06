import './WorkoutFormModal.scss'

import { FormEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { Workout, WorkoutInput } from '@/services/workout'

interface Props {
	open: boolean
	initialDate?: string
	workout?: Workout | null
	initialValues?: Partial<WorkoutInput> | null
	saving?: boolean
	onClose: () => void
	onSave: (data: WorkoutInput) => void
}

const today = () => new Date().toISOString().slice(0, 10)

export function WorkoutFormModal({ open, initialDate, workout, initialValues, saving, onClose, onSave }: Props) {
	const { t } = useTranslation()
	const [form, setForm] = useState({
		title: '', date: initialDate || today(), duration: '', calories: '', heartRate: '', exercises: '', notes: '', addCaloriesToGoal: false,
		activityType: '', locationName: '', distanceKm: '', movingMinutes: '', elapsedMinutes: '', averageSpeedKmh: '', averageMovingSpeedKmh: '', maxSpeedKmh: '',
		elevationGain: '', elevationLoss: '', minElevation: '', averageElevation: '', maxElevation: '', minHeartRate: '', maxHeartRate: '', averageCadence: '', maxCadence: '',
		steps: '', restingCalories: '', activeCalories: '', sweatLoss: '', moderateMinutes: '', vigorousMinutes: '', intensityMinutes: '', maxVerticalSpeedKmh: '', lapCount: '',
		averagePower: '', maxPower: '', normalizedPower: '', totalReps: '', totalSets: '', aerobicEffect: '', anaerobicEffect: '',
	})

	useEffect(() => {
		if (!open) return
		setForm({
			title: workout?.title || initialValues?.title || '',
			date: workout?.performedAt.slice(0, 10) || initialValues?.performedAt?.slice(0,10) || initialDate || today(),
			duration: (workout?.durationMinutes ?? initialValues?.durationMinutes)?.toString() || '',
			calories: (workout?.caloriesBurned ?? initialValues?.caloriesBurned)?.toString() || '',
			heartRate: (workout?.averageHeartRate ?? initialValues?.averageHeartRate)?.toString() || '',
			exercises: workout?.exercises || initialValues?.exercises || '',
			notes: workout?.notes || initialValues?.notes || '',
			addCaloriesToGoal: workout?.addCaloriesToGoal ?? initialValues?.addCaloriesToGoal ?? false,
			activityType: workout?.activityType || initialValues?.activityType || '',
			locationName: workout?.locationName || initialValues?.locationName || '',
			distanceKm: ((workout?.distanceMeters ?? initialValues?.distanceMeters) != null ? (workout?.distanceMeters ?? initialValues?.distanceMeters)! / 1000 : '').toString(),
			movingMinutes: ((workout?.movingDurationSeconds ?? initialValues?.movingDurationSeconds) != null ? (workout?.movingDurationSeconds ?? initialValues?.movingDurationSeconds)! / 60 : '').toString(),
			elapsedMinutes: ((workout?.elapsedDurationSeconds ?? initialValues?.elapsedDurationSeconds) != null ? (workout?.elapsedDurationSeconds ?? initialValues?.elapsedDurationSeconds)! / 60 : '').toString(),
			averageSpeedKmh: ((workout?.averageSpeedMps ?? initialValues?.averageSpeedMps) != null ? (workout?.averageSpeedMps ?? initialValues?.averageSpeedMps)! * 3.6 : '').toString(),
			averageMovingSpeedKmh: ((workout?.averageMovingSpeedMps ?? initialValues?.averageMovingSpeedMps) != null ? (workout?.averageMovingSpeedMps ?? initialValues?.averageMovingSpeedMps)! * 3.6 : '').toString(),
			maxSpeedKmh: ((workout?.maxSpeedMps ?? initialValues?.maxSpeedMps) != null ? (workout?.maxSpeedMps ?? initialValues?.maxSpeedMps)! * 3.6 : '').toString(),
			elevationGain: (workout?.elevationGainMeters ?? initialValues?.elevationGainMeters)?.toString() || '', elevationLoss: (workout?.elevationLossMeters ?? initialValues?.elevationLossMeters)?.toString() || '',
			minElevation: (workout?.minElevationMeters ?? initialValues?.minElevationMeters)?.toString() || '', averageElevation: (workout?.averageElevationMeters ?? initialValues?.averageElevationMeters)?.toString() || '', maxElevation: (workout?.maxElevationMeters ?? initialValues?.maxElevationMeters)?.toString() || '',
			minHeartRate: (workout?.minHeartRate ?? initialValues?.minHeartRate)?.toString() || '', maxHeartRate: (workout?.maxHeartRate ?? initialValues?.maxHeartRate)?.toString() || '',
			averageCadence: (workout?.averageCadence ?? initialValues?.averageCadence)?.toString() || '', maxCadence: (workout?.maxCadence ?? initialValues?.maxCadence)?.toString() || '', steps: (workout?.steps ?? initialValues?.steps)?.toString() || '',
			restingCalories: (workout?.restingCalories ?? initialValues?.restingCalories)?.toString() || '', activeCalories: (workout?.activeCalories ?? initialValues?.activeCalories)?.toString() || '', sweatLoss: (workout?.estimatedSweatLossMl ?? initialValues?.estimatedSweatLossMl)?.toString() || '',
			moderateMinutes: (workout?.moderateIntensityMinutes ?? initialValues?.moderateIntensityMinutes)?.toString() || '', vigorousMinutes: (workout?.vigorousIntensityMinutes ?? initialValues?.vigorousIntensityMinutes)?.toString() || '', intensityMinutes: (workout?.intensityMinutes ?? initialValues?.intensityMinutes)?.toString() || '',
			maxVerticalSpeedKmh: ((workout?.maxVerticalSpeedMps ?? initialValues?.maxVerticalSpeedMps) != null ? (workout?.maxVerticalSpeedMps ?? initialValues?.maxVerticalSpeedMps)! * 3.6 : '').toString(), lapCount: (workout?.lapCount ?? initialValues?.lapCount)?.toString() || '',
			averagePower: (workout?.averagePowerWatts ?? initialValues?.averagePowerWatts)?.toString() || '', maxPower: (workout?.maxPowerWatts ?? initialValues?.maxPowerWatts)?.toString() || '', normalizedPower: (workout?.normalizedPowerWatts ?? initialValues?.normalizedPowerWatts)?.toString() || '',
			totalReps: (workout?.totalReps ?? initialValues?.totalReps)?.toString() || '', totalSets: (workout?.totalSets ?? initialValues?.totalSets)?.toString() || '', aerobicEffect: (workout?.aerobicTrainingEffect ?? initialValues?.aerobicTrainingEffect)?.toString() || '', anaerobicEffect: (workout?.anaerobicTrainingEffect ?? initialValues?.anaerobicTrainingEffect)?.toString() || '',
		})
	}, [open, workout, initialValues, initialDate])

	if (!open) return null

	const submit = (event: FormEvent) => {
		event.preventDefault()
		const number = (value: string) => value === '' ? null : Number(value)
		const durationChanged = form.duration !== ((workout?.durationMinutes ?? initialValues?.durationMinutes)?.toString() || '')
		onSave({
			title: form.title,
			performedAt: `${form.date}T12:00:00`,
			durationMinutes: form.duration ? Number(form.duration) : null,
			caloriesBurned: form.calories ? Number(form.calories) : null,
			averageHeartRate: form.heartRate ? Number(form.heartRate) : null,
			exercises: form.exercises || null,
			notes: form.notes || null,
			addCaloriesToGoal: form.addCaloriesToGoal,
			templateId: workout?.templateId ?? initialValues?.templateId ?? null,
			activityType: form.activityType || null, locationName: form.locationName || null,
			distanceMeters: form.distanceKm === '' ? null : Number(form.distanceKm) * 1000,
			durationSeconds: durationChanged ? (form.duration === '' ? null : Number(form.duration) * 60) : (workout?.durationSeconds ?? initialValues?.durationSeconds ?? (form.duration === '' ? null : Number(form.duration) * 60)),
			movingDurationSeconds: form.movingMinutes === '' ? null : Number(form.movingMinutes) * 60,
			elapsedDurationSeconds: form.elapsedMinutes === '' ? null : Number(form.elapsedMinutes) * 60,
			averageSpeedMps: form.averageSpeedKmh === '' ? null : Number(form.averageSpeedKmh) / 3.6,
			averageMovingSpeedMps: form.averageMovingSpeedKmh === '' ? null : Number(form.averageMovingSpeedKmh) / 3.6,
			maxSpeedMps: form.maxSpeedKmh === '' ? null : Number(form.maxSpeedKmh) / 3.6,
			elevationGainMeters: number(form.elevationGain), elevationLossMeters: number(form.elevationLoss), minElevationMeters: number(form.minElevation), averageElevationMeters: number(form.averageElevation), maxElevationMeters: number(form.maxElevation),
			minHeartRate: number(form.minHeartRate), maxHeartRate: number(form.maxHeartRate), averageCadence: number(form.averageCadence), maxCadence: number(form.maxCadence), steps: number(form.steps),
			restingCalories: number(form.restingCalories), activeCalories: number(form.activeCalories), estimatedSweatLossMl: number(form.sweatLoss), moderateIntensityMinutes: number(form.moderateMinutes), vigorousIntensityMinutes: number(form.vigorousMinutes), intensityMinutes: number(form.intensityMinutes),
			maxVerticalSpeedMps: form.maxVerticalSpeedKmh === '' ? null : Number(form.maxVerticalSpeedKmh) / 3.6, lapCount: number(form.lapCount),
			averagePowerWatts: number(form.averagePower), maxPowerWatts: number(form.maxPower), normalizedPowerWatts: number(form.normalizedPower), totalReps: number(form.totalReps), totalSets: number(form.totalSets),
			aerobicTrainingEffect: number(form.aerobicEffect), anaerobicTrainingEffect: number(form.anaerobicEffect),
		})
	}

	return (
		<div className='modal-overlay workout-modal-overlay' onClick={onClose}>
			<form className='modal-card workout-form-modal' onSubmit={submit} onClick={(e) => e.stopPropagation()}>
				<div className='workout-form-heading'>
					<div><span className='workout-kicker'>{t('workouts.kicker')}</span><h2>{workout ? t('workouts.editTitle') : t('workouts.addTitle')}</h2></div>
					<button type='button' className='workout-close' onClick={onClose} aria-label={t('cancel')}>×</button>
				</div>
				<div className='workout-form-grid'>
					<label className='form-group workout-field-wide'><span>{t('workouts.titleLabel')}</span><input required autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t('workouts.titlePlaceholder')} /></label>
					<label className='form-group'><span>{t('workouts.date')}</span><input required type='date' value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
					<label className='form-group'><span>{t('workouts.duration')}</span><input type='number' min='1' max='1440' value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder='45' /></label>
					<label className='form-group'><span>{t('workouts.calories')}</span><input type='number' min='0' max='10000' value={form.calories} onChange={(e) => setForm({ ...form, calories: e.target.value })} placeholder='350' /></label>
					<label className='form-group'><span>{t('workouts.heartRate')}</span><input type='number' min='20' max='250' value={form.heartRate} onChange={(e) => setForm({ ...form, heartRate: e.target.value })} placeholder='135' /></label>
					<label className='form-group workout-field-wide'><span>{t('workouts.exercises')}</span><textarea rows={3} value={form.exercises} onChange={(e) => setForm({ ...form, exercises: e.target.value })} placeholder={t('workouts.exercisesPlaceholder')} /></label>
					<label className='form-group workout-field-wide'><span>{t('workouts.notes')}</span><textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
				</div>
				<details className='workout-extra-details'>
					<summary>{t('workouts.optionalDetails')}</summary>
					<p>{t('workouts.optionalDetailsHint')}</p>
					<h3>{t('workouts.activityAndDistance')}</h3><div className='workout-form-grid'>
						<label className='form-group'><span>{t('workouts.activityType')}</span><input list='activity-type-options' value={form.activityType} onChange={(e) => setForm({...form,activityType:e.target.value})} /><datalist id='activity-type-options'><option value='running' /><option value='trail_running' /><option value='walking' /><option value='hiking' /><option value='cycling' /><option value='indoor_cycling' /><option value='strength_training' /><option value='hiit' /><option value='cardio' /><option value='swimming' /><option value='yoga' /><option value='pilates' /></datalist></label>
						<label className='form-group'><span>{t('workouts.location')}</span><input value={form.locationName} onChange={(e) => setForm({...form,locationName:e.target.value})} /></label>
						<label className='form-group'><span>{t('workouts.distanceKm')}</span><input type='number' min='0' step='0.001' value={form.distanceKm} onChange={(e) => setForm({...form,distanceKm:e.target.value})} /></label>
						<label className='form-group'><span>{t('workouts.steps')}</span><input type='number' min='0' value={form.steps} onChange={(e) => setForm({...form,steps:e.target.value})} /></label>
						<label className='form-group'><span>{t('workouts.laps')}</span><input type='number' min='0' value={form.lapCount} onChange={(e) => setForm({...form,lapCount:e.target.value})} /></label>
					</div>
					<h3>{t('workouts.timeAndSpeed')}</h3><div className='workout-form-grid'>
						<label className='form-group'><span>{t('workouts.movingMinutes')}</span><input type='number' min='0' step='0.01' value={form.movingMinutes} onChange={(e) => setForm({...form,movingMinutes:e.target.value})} /></label>
						<label className='form-group'><span>{t('workouts.elapsedMinutes')}</span><input type='number' min='0' step='0.01' value={form.elapsedMinutes} onChange={(e) => setForm({...form,elapsedMinutes:e.target.value})} /></label>
						<label className='form-group'><span>{t('workouts.averageSpeedKmh')}</span><input type='number' min='0' step='0.01' value={form.averageSpeedKmh} onChange={(e) => setForm({...form,averageSpeedKmh:e.target.value})} /></label>
						<label className='form-group'><span>{t('workouts.averageMovingSpeedKmh')}</span><input type='number' min='0' step='0.01' value={form.averageMovingSpeedKmh} onChange={(e) => setForm({...form,averageMovingSpeedKmh:e.target.value})} /></label>
						<label className='form-group'><span>{t('workouts.maxSpeedKmh')}</span><input type='number' min='0' step='0.01' value={form.maxSpeedKmh} onChange={(e) => setForm({...form,maxSpeedKmh:e.target.value})} /></label>
						<label className='form-group'><span>{t('workouts.maxVerticalSpeedKmh')}</span><input type='number' min='0' step='0.01' value={form.maxVerticalSpeedKmh} onChange={(e) => setForm({...form,maxVerticalSpeedKmh:e.target.value})} /></label>
					</div>
					<h3>{t('workouts.heartRateAndCadence')}</h3><div className='workout-form-grid'>
						<label className='form-group'><span>{t('workouts.minHeartRate')}</span><input type='number' min='20' max='250' value={form.minHeartRate} onChange={(e) => setForm({...form,minHeartRate:e.target.value})} /></label>
						<label className='form-group'><span>{t('workouts.maxHeartRate')}</span><input type='number' min='20' max='250' value={form.maxHeartRate} onChange={(e) => setForm({...form,maxHeartRate:e.target.value})} /></label>
						<label className='form-group'><span>{t('workouts.averageCadence')}</span><input type='number' min='0' step='0.01' value={form.averageCadence} onChange={(e) => setForm({...form,averageCadence:e.target.value})} /></label>
						<label className='form-group'><span>{t('workouts.maxCadence')}</span><input type='number' min='0' step='0.01' value={form.maxCadence} onChange={(e) => setForm({...form,maxCadence:e.target.value})} /></label>
					</div>
					<h3>{t('workouts.powerAndStrength')}</h3><div className='workout-form-grid'>
						<label className='form-group'><span>{t('workouts.averagePower')}</span><input type='number' min='0' value={form.averagePower} onChange={(e) => setForm({...form,averagePower:e.target.value})} /></label>
						<label className='form-group'><span>{t('workouts.maxPower')}</span><input type='number' min='0' value={form.maxPower} onChange={(e) => setForm({...form,maxPower:e.target.value})} /></label>
						<label className='form-group'><span>{t('workouts.normalizedPower')}</span><input type='number' min='0' value={form.normalizedPower} onChange={(e) => setForm({...form,normalizedPower:e.target.value})} /></label>
						<label className='form-group'><span>{t('workouts.totalSets')}</span><input type='number' min='0' value={form.totalSets} onChange={(e) => setForm({...form,totalSets:e.target.value})} /></label>
						<label className='form-group'><span>{t('workouts.totalReps')}</span><input type='number' min='0' value={form.totalReps} onChange={(e) => setForm({...form,totalReps:e.target.value})} /></label>
						<label className='form-group'><span>{t('workouts.aerobicEffect')}</span><input type='number' min='0' max='5' step='0.1' value={form.aerobicEffect} onChange={(e) => setForm({...form,aerobicEffect:e.target.value})} /></label>
						<label className='form-group'><span>{t('workouts.anaerobicEffect')}</span><input type='number' min='0' max='5' step='0.1' value={form.anaerobicEffect} onChange={(e) => setForm({...form,anaerobicEffect:e.target.value})} /></label>
					</div>
					<h3>{t('workouts.elevation')}</h3><div className='workout-form-grid'>
						{([['elevationGain','ascent'],['elevationLoss','descent'],['minElevation','minElevation'],['averageElevation','averageElevation'],['maxElevation','maxElevation']] as const).map(([field,label]) => <label className='form-group' key={field}><span>{t(`workouts.${label}`)} (m)</span><input type='number' step='0.01' value={form[field]} onChange={(e) => setForm({...form,[field]:e.target.value})} /></label>)}
					</div>
					<h3>{t('workouts.energyAndIntensity')}</h3><div className='workout-form-grid'>
						<label className='form-group'><span>{t('workouts.restingCalories')}</span><input type='number' min='0' value={form.restingCalories} onChange={(e) => setForm({...form,restingCalories:e.target.value})} /></label>
						<label className='form-group'><span>{t('workouts.activeCalories')}</span><input type='number' min='0' value={form.activeCalories} onChange={(e) => setForm({...form,activeCalories:e.target.value})} /></label>
						<label className='form-group'><span>{t('workouts.sweatLoss')}</span><input type='number' min='0' value={form.sweatLoss} onChange={(e) => setForm({...form,sweatLoss:e.target.value})} /></label>
						<label className='form-group'><span>{t('workouts.moderateMinutes')}</span><input type='number' min='0' value={form.moderateMinutes} onChange={(e) => setForm({...form,moderateMinutes:e.target.value})} /></label>
						<label className='form-group'><span>{t('workouts.vigorousMinutes')}</span><input type='number' min='0' value={form.vigorousMinutes} onChange={(e) => setForm({...form,vigorousMinutes:e.target.value})} /></label>
						<label className='form-group'><span>{t('workouts.intensityMinutes')}</span><input type='number' min='0' value={form.intensityMinutes} onChange={(e) => setForm({...form,intensityMinutes:e.target.value})} /></label>
					</div>
				</details>
				<label className='workout-calorie-toggle'>
					<input type='checkbox' checked={form.addCaloriesToGoal} onChange={(e) => setForm({ ...form, addCaloriesToGoal: e.target.checked })} />
					<span><strong>{t('workouts.addToGoal')}</strong><small>{t('workouts.addToGoalHint')}</small></span>
				</label>
				<div className='modal-actions'><button type='button' className='btn btn-outline' onClick={onClose}>{t('cancel')}</button><button className='btn btn-primary' disabled={saving}>{saving ? t('workouts.saving') : t('workouts.save')}</button></div>
			</form>
		</div>
	)
}
