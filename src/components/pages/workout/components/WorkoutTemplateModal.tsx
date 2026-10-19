import { FormEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { WorkoutTemplate, WorkoutTemplateInput } from '@/services/workout'

interface Props { open: boolean; template?: WorkoutTemplate | null; saving: boolean; onClose: () => void; onSave: (data: WorkoutTemplateInput) => void }

export function WorkoutTemplateModal({ open, template, saving, onClose, onSave }: Props) {
	const { t } = useTranslation()
	const [form, setForm] = useState({ title: '', duration: '', calories: '', heartRate: '', exercises: '', notes: '', defaultAddCaloriesToGoal: false })
	useEffect(() => { if (open) setForm({ title: template?.title || '', duration: template?.durationMinutes?.toString() || '', calories: template?.caloriesBurned?.toString() || '', heartRate: template?.averageHeartRate?.toString() || '', exercises: template?.exercises || '', notes: template?.notes || '', defaultAddCaloriesToGoal: template?.defaultAddCaloriesToGoal || false }) }, [open, template])
	if (!open) return null
	const submit = (event: FormEvent) => { event.preventDefault(); onSave({ title: form.title, durationMinutes: form.duration ? Number(form.duration) : null, caloriesBurned: form.calories ? Number(form.calories) : null, averageHeartRate: form.heartRate ? Number(form.heartRate) : null, exercises: form.exercises || null, notes: form.notes || null, defaultAddCaloriesToGoal: form.defaultAddCaloriesToGoal }) }
	return <div className='modal-overlay workout-modal-overlay' onClick={onClose}><form className='modal-card workout-form-modal' onSubmit={submit} onClick={(e) => e.stopPropagation()}>
		<div className='workout-form-heading'><div><span className='workout-kicker'>{t('workouts.savedWorkout')}</span><h2>{template ? t('workouts.editTemplate') : t('workouts.newTemplate')}</h2></div><button type='button' className='workout-close' onClick={onClose}>×</button></div>
		<div className='workout-form-grid'>
			<label className='form-group workout-field-wide'><span>{t('workouts.titleLabel')}</span><input required autoFocus value={form.title} onChange={(e) => setForm({...form,title:e.target.value})} placeholder={t('workouts.templateTitlePlaceholder')} /></label>
			<label className='form-group'><span>{t('workouts.duration')}</span><input type='number' min='1' value={form.duration} onChange={(e) => setForm({...form,duration:e.target.value})} /></label>
			<label className='form-group'><span>{t('workouts.calories')}</span><input type='number' min='0' value={form.calories} onChange={(e) => setForm({...form,calories:e.target.value})} /></label>
			<label className='form-group'><span>{t('workouts.heartRate')}</span><input type='number' min='20' max='250' value={form.heartRate} onChange={(e) => setForm({...form,heartRate:e.target.value})} /></label>
			<label className='form-group workout-field-wide'><span>{t('workouts.exercises')}</span><textarea rows={4} value={form.exercises} onChange={(e) => setForm({...form,exercises:e.target.value})} placeholder={t('workouts.exercisesPlaceholder')} /></label>
			<label className='form-group workout-field-wide'><span>{t('workouts.notes')}</span><textarea rows={2} value={form.notes} onChange={(e) => setForm({...form,notes:e.target.value})} /></label>
		</div>
		<label className='workout-calorie-toggle'><input type='checkbox' checked={form.defaultAddCaloriesToGoal} onChange={(e) => setForm({...form,defaultAddCaloriesToGoal:e.target.checked})}/><span><strong>{t('workouts.templateAddToGoal')}</strong><small>{t('workouts.templateAddToGoalHint')}</small></span></label>
		<div className='modal-actions'><button type='button' className='btn btn-outline' onClick={onClose}>{t('cancel')}</button><button className='btn btn-primary' disabled={saving}>{saving ? t('workouts.saving') : t('workouts.saveTemplate')}</button></div>
	</form></div>
}
