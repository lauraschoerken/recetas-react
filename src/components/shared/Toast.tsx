import './Toast.css'

import { useEffect } from 'react'

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
				return '✓'
			case 'error':
				return '✕'
			case 'warning':
				return '⚠'
			case 'info':
				return 'ℹ'
		}
	}

	return (
		<div className={`toast toast-${toast.type}`}>
			<span className='toast-icon'>{getIcon()}</span>
			<span className='toast-message'>{toast.message}</span>
			<button className='toast-close' onClick={() => onRemove(toast.id)}>
				×
			</button>
		</div>
	)
}
