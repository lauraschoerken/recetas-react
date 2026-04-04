import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { authService } from '@/services/auth'

import { LoginForm } from '../components/LoginForm'

interface LoginContainerProps {
	onLogin?: () => void
}

export function LoginContainer({ onLogin }: LoginContainerProps) {
	const [error, setError] = useState<string | null>(null)
	const [loading, setLoading] = useState(false)
	const navigate = useNavigate()

	const handleSubmit = async (email: string, password: string) => {
		setError(null)
		setLoading(true)

		try {
			await authService.login({ email, password })
			onLogin?.()
			navigate('/recipes')
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
		} finally {
			setLoading(false)
		}
	}

	return <LoginForm onSubmit={handleSubmit} error={error} loading={loading} />
}
