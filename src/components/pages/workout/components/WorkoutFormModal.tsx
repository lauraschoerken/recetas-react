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
		})
	}, [open, workout, initialValues, initialDate])

	if (!open) return null

	const submit = (event: FormEvent) => {
		event.preventDefault()
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
				<label className='workout-calorie-toggle'>
					<input type='checkbox' checked={form.addCaloriesToGoal} onChange={(e) => setForm({ ...form, addCaloriesToGoal: e.target.checked })} />
					<span><strong>{t('workouts.addToGoal')}</strong><small>{t('workouts.addToGoalHint')}</small></span>
				</label>
				<div className='modal-actions'><button type='button' className='btn btn-outline' onClick={onClose}>{t('cancel')}</button><button className='btn btn-primary' disabled={saving}>{saving ? t('workouts.saving') : t('workouts.save')}</button></div>
			</form>
		</div>
	)
}
