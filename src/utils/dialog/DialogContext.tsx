import { createContext, ReactNode,useCallback, useContext, useState } from 'react'

import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ToastContainer, ToastData } from '@/components/shared/Toast'

interface ConfirmOptions {
	title: string
	message: string
	confirmText?: string
	cancelText?: string
	type?: 'danger' | 'warning' | 'info'
}

interface DialogContextType {
	confirm: (options: ConfirmOptions) => Promise<boolean>
	toast: {
		success: (message: string) => void
		error: (message: string) => void
		info: (message: string) => void
		warning: (message: string) => void
	}
}

const DialogContext = createContext<DialogContextType | null>(null)

export function useDialog() {
	const context = useContext(DialogContext)
	if (!context) {
		throw new Error('useDialog must be used within DialogProvider')
	}
	return context
}

interface DialogProviderProps {
	children: ReactNode
}

export function DialogProvider({ children }: DialogProviderProps) {
	const [confirmState, setConfirmState] = useState<{
		isOpen: boolean
		options: ConfirmOptions
		resolve: ((value: boolean) => void) | null
	}>({
		isOpen: false,
		options: { title: '', message: '' },
		resolve: null,
	})

	const [toasts, setToasts] = useState<ToastData[]>([])

	const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
		return new Promise((resolve) => {
			setConfirmState({
				isOpen: true,
				options,
				resolve,
			})
		})
	}, [])

	const handleConfirm = useCallback(() => {
		confirmState.resolve?.(true)
		setConfirmState((prev) => ({ ...prev, isOpen: false, resolve: null }))
	}, [confirmState.resolve])

	const handleCancel = useCallback(() => {
		confirmState.resolve?.(false)
		setConfirmState((prev) => ({ ...prev, isOpen: false, resolve: null }))
	}, [confirmState.resolve])

	const addToast = useCallback((message: string, type: ToastData['type']) => {
		const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
		setToasts((prev) => [...prev, { id, message, type }])
	}, [])

	const removeToast = useCallback((id: string) => {
		setToasts((prev) => prev.filter((t) => t.id !== id))
	}, [])

	const toast = {
		success: (message: string) => addToast(message, 'success'),
		error: (message: string) => addToast(message, 'error'),
		info: (message: string) => addToast(message, 'info'),
		warning: (message: string) => addToast(message, 'warning'),
	}

	return (
		<DialogContext.Provider value={{ confirm, toast }}>
			{children}
			<ConfirmDialog
				isOpen={confirmState.isOpen}
				title={confirmState.options.title}
				message={confirmState.options.message}
				confirmText={confirmState.options.confirmText}
				cancelText={confirmState.options.cancelText}
				type={confirmState.options.type}
				onConfirm={handleConfirm}
				onCancel={handleCancel}
			/>
			<ToastContainer toasts={toasts} onRemove={removeToast} />
		</DialogContext.Provider>
	)
}
