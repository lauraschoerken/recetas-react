import { FormEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CreateWeekPlanData } from '@/services/shopping'

interface Props {
	isOpen: boolean
	initialDate: string
	saving: boolean
	onClose: () => void
	onSubmit: (data: CreateWeekPlanData) => void
}

export function ManualMealModal({ isOpen, initialDate, saving, onClose, onSubmit }: Props) {
	const { t } = useTranslation()
	const [date, setDate] = useState(initialDate)
	const [title, setTitle] = useState('')
	const [time, setTime] = useState('')
	const [calories, setCalories] = useState('')
	const [protein, setProtein] = useState('')
	const [carbs, setCarbs] = useState('')
	const [fat, setFat] = useState('')
	const [fiber, setFiber] = useState('')
	const [notes, setNotes] = useState('')

	useEffect(() => {
		if (isOpen) {
			setDate(initialDate)
			setTitle('')
			setTime('')
			setCalories('')
			setProtein('')
			setCarbs('')
			setFat('')
			setFiber('')
			setNotes('')
		}
	}, [initialDate, isOpen])

	if (!isOpen) return null

	const optionalNumber = (value: string) => (value === '' ? undefined : Number(value))
	const submit = (event: FormEvent) => {
		event.preventDefault()
		if (!title.trim()) return
		onSubmit({
			plannedDate: date,
			manualTitle: title.trim(),
			mealTime: time || undefined,
			manualCalories: optionalNumber(calories),
			manualProtein: optionalNumber(protein),
			manualCarbs: optionalNumber(carbs),
			manualFat: optionalNumber(fat),
			manualFiber: optionalNumber(fiber),
			manualNotes: notes.trim() || undefined,
			consumed: true,
		})
	}

	return (
		<div className='modal-overlay' onClick={onClose}>
			<form className='modal-card modal-card-lg manual-meal-form' onSubmit={submit} onClick={(e) => e.stopPropagation()}>
				<h3>{t('weekPlan.manualMealTitle')}</h3>
				<p className='text-secondary'>{t('weekPlan.manualMealHint')}</p>
				<div className='form-row'>
					<div className='form-group'>
						<label>{t('weekPlan.dateLabel')}</label>
						<input type='date' value={date} onChange={(e) => setDate(e.target.value)} required />
					</div>
					<div className='form-group'>
						<label>{t('weekPlan.timeLabel')}</label>
						<input type='time' value={time} onChange={(e) => setTime(e.target.value)} />
					</div>
				</div>
				<div className='form-group'>
					<label>{t('weekPlan.manualTitleLabel')}</label>
					<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('weekPlan.manualTitlePlaceholder')} autoFocus required />
				</div>
				<div className='manual-meal-macros'>
					{[
						[t('weekPlan.calories'), calories, setCalories],
						[t('weekPlan.protein'), protein, setProtein],
						[t('weekPlan.carbs'), carbs, setCarbs],
						[t('weekPlan.fat'), fat, setFat],
						[t('weekPlan.fiber'), fiber, setFiber],
					].map(([label, value, setter]) => (
						<label key={label as string} className='form-group'>
							<span>{label as string}</span>
							<input type='number' min='0' step='any' value={value as string} onChange={(e) => (setter as (v: string) => void)(e.target.value)} />
						</label>
					))}
				</div>
				<div className='form-group'>
					<label>{t('weekPlan.notesLabel')}</label>
					<textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
				</div>
				<div className='modal-actions'>
					<button type='button' className='btn btn-outline' onClick={onClose}>{t('cancel')}</button>
					<button type='submit' className='btn btn-primary' disabled={saving || !title.trim()}>{saving ? t('weekPlan.adding') : t('weekPlan.saveConsumedMeal')}</button>
				</div>
			</form>
		</div>
	)
}
