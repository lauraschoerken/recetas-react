import './Toast.scss'

import { useEffect } from 'react'

import { CheckIcon, CloseIcon, InfoIcon, WarningIcon } from '@/components/shared/icons'

export interface ToastData {
	id: string
	message: string
	type: 'success' | 'error' | 'info' | 'warning'
}

interface ToastProps {
	toasts: ToastData[]
	onRemove: (id: string) => void
}

export function ToastContainer({ toasts, onRemove }: ToastProps) {
	return (
		<div className='toast-container'>
			{toasts.map((toast) => (
				<ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
			))}
		</div>
	)
}

function ToastItem({ toast, onRemove }: { toast: ToastData; onRemove: (id: string) => void }) {
	useEffect(() => {
		const timer = setTimeout(() => {
			onRemove(toast.id)
		}, 4000)
		return () => clearTimeout(timer)
	}, [toast.id, onRemove])

	const getIcon = () => {
		switch (toast.type) {
			case 'success':
				return <CheckIcon size={16} aria-hidden='true' />
			case 'error':
				return <CloseIcon size={16} aria-hidden='true' />
			case 'warning':
				return <WarningIcon size={16} aria-hidden='true' />
			case 'info':
				return <InfoIcon size={16} aria-hidden='true' />
		}
	}

	return (
		<div className={`toast toast-${toast.type}`}>
			<span className='toast-icon'>{getIcon()}</span>
			<span className='toast-message'>{toast.message}</span>
			<button className='toast-close' onClick={() => onRemove(toast.id)}>
				<CloseIcon size={14} aria-hidden='true' />
			</button>
		</div>
	)
}
