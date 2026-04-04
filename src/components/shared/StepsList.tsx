import './StepsList.css'

import { useEffect,useRef, useState } from 'react'

interface StepsListProps {
	steps: string[]
	onChange: (steps: string[]) => void
}

const capitalizeFirst = (str: string): string => {
	if (!str) return str
	return str.charAt(0).toUpperCase() + str.slice(1)
}

const autoResize = (el: HTMLTextAreaElement | null) => {
	if (!el) return
	el.style.height = 'auto'
	el.style.height = el.scrollHeight + 'px'
}

export function StepsList({ steps, onChange }: StepsListProps) {
	const [newStep, setNewStep] = useState('')
	const [dragIndex, setDragIndex] = useState<number | null>(null)
	const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
	const newInputRef = useRef<HTMLTextAreaElement>(null)
	const textareaRefs = useRef<(HTMLTextAreaElement | null)[]>([])

	useEffect(() => {
		textareaRefs.current.forEach(autoResize)
	}, [steps])

	const addStep = () => {
		if (newStep.trim()) {
			onChange([...steps, capitalizeFirst(newStep.trim())])
			setNewStep('')
			setTimeout(() => newInputRef.current?.focus(), 0)
		}
	}

	const handleNewStepKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			e.preventDefault()
			addStep()
		}
	}

	const handleEditKeyDown = (e: React.KeyboardEvent, index: number) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault()
			;(e.target as HTMLTextAreaElement).blur()
		}
		if (e.key === 'Backspace' && steps[index] === '') {
			e.preventDefault()
			removeStep(index)
		}
	}

	const handleTextareaChange = (index: number, value: string, el: HTMLTextAreaElement) => {
		updateStep(index, value)
		autoResize(el)
	}

	const updateStep = (index: number, value: string) => {
		const newSteps = [...steps]
		newSteps[index] = capitalizeFirst(value)
		onChange(newSteps)
	}

	const removeStep = (index: number) => {
		onChange(steps.filter((_, i) => i !== index))
	}

	const handleDragStart = (index: number) => {
		setDragIndex(index)
	}

	const handleDragOver = (e: React.DragEvent, index: number) => {
		e.preventDefault()
		setDragOverIndex(index)
	}

	const handleDragEnd = () => {
		if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
			const newSteps = [...steps]
			const [removed] = newSteps.splice(dragIndex, 1)
			newSteps.splice(dragOverIndex, 0, removed)
			onChange(newSteps)
		}
		setDragIndex(null)
		setDragOverIndex(null)
	}

	return (
		<div className='steps-list'>
			{steps.length > 0 && (
				<div className='steps-items'>
					{steps.map((step, index) => (
						<div
							key={index}
							className={`step-item ${dragIndex === index ? 'dragging' : ''} ${dragOverIndex === index ? 'drag-over' : ''}`}
							draggable
							onDragStart={() => handleDragStart(index)}
							onDragOver={(e) => handleDragOver(e, index)}
							onDragEnd={handleDragEnd}>
							<span className='step-drag-handle' title='Arrastrar para reordenar'>
								⋮⋮
							</span>
							<span className='step-number'>{index + 1}</span>
							<textarea
								ref={(el) => {
									textareaRefs.current[index] = el
								}}
								className='step-input'
								value={step}
								onChange={(e) => handleTextareaChange(index, e.target.value, e.target)}
								onKeyDown={(e) => handleEditKeyDown(e, index)}
								rows={1}
							/>
							<button
								type='button'
								className='step-btn step-btn-remove'
								onClick={() => removeStep(index)}
								title='Eliminar'>
								×
							</button>
						</div>
					))}
				</div>
			)}

			<div className='step-add'>
				<span className='step-number step-number-new'>{steps.length + 1}</span>
				<textarea
					ref={newInputRef}
					className='step-input'
					value={newStep}
					onChange={(e) => {
						setNewStep(e.target.value)
						autoResize(e.target)
					}}
					onKeyDown={handleNewStepKeyDown}
					placeholder='Escribe un paso y pulsa Enter...'
					rows={1}
				/>
				<button
					type='button'
					className='step-btn step-btn-add'
					onClick={addStep}
					disabled={!newStep.trim()}>
					+
				</button>
			</div>
		</div>
	)
}
