import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { authService } from '@/services/auth'

import { RegisterForm } from '../components/RegisterForm'

interface RegisterContainerProps {
	onLogin?: () => void
}

export function RegisterContainer({ onLogin }: RegisterContainerProps) {
	const { t } = useTranslation()
	const [error, setError] = useState<string | null>(null)
	const [loading, setLoading] = useState(false)
	const navigate = useNavigate()

	const handleSubmit = async (name: string, email: string, password: string) => {
		setError(null)
		setLoading(true)

		try {
			await authService.register({ name, email, password })
			onLogin?.()
			navigate('/recipes')
		} catch (err) {
			setError(err instanceof Error ? err.message : t('auth.registerError'))
		} finally {
			setLoading(false)
		}
	}

	return <RegisterForm onSubmit={handleSubmit} error={error} loading={loading} />
}
