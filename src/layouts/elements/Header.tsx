import '../layout.scss'

import { useTranslation } from 'react-i18next'
import { Link, NavLink, useNavigate } from 'react-router-dom'

import LanguageSelect from '@/components/elements/Languague/LanguagueSelect'
import { ThemeToggle } from '@/components/elements/Theme/ThemeToggle'
import { authService } from '@/services/auth'
import { APP_NAME } from '@/utils/constants'

export const Header = () => {
	const active = 'link-active'
	const { t } = useTranslation()
	const navigate = useNavigate()
	const isAuthenticated = authService.isAuthenticated()
	const user = authService.getUser()

	const handleLogout = () => {
		authService.logout()
		navigate('/login')
	}

	return (
		<header className='header'>
			<div className='container header__inner'>
				<Link to='/' className='link brand'>
					{APP_NAME}
				</Link>
				<nav className='nav'>
					{isAuthenticated ? (
						<>
							<NavLink to='/recipes' className={({ isActive }) => (isActive ? active : 'link')}>
								Recetas
							</NavLink>
							<NavLink to='/home' className={({ isActive }) => (isActive ? active : 'link')}>
								Casa
							</NavLink>
							<NavLink to='/ingredients' className={({ isActive }) => (isActive ? active : 'link')}>
								Ingredientes
							</NavLink>
							<NavLink to='/week-plan' className={({ isActive }) => (isActive ? active : 'link')}>
								Plan semanal
							</NavLink>
							<NavLink
								to='/shopping-list'
								className={({ isActive }) => (isActive ? active : 'link')}>
								Compra
							</NavLink>
							<NavLink to='/settings' className={({ isActive }) => (isActive ? active : 'link')}>
								Ajustes
							</NavLink>
							<NavLink to='/demo' className={({ isActive }) => (isActive ? active : 'link')}>
								{t('demo')}
							</NavLink>
							{user?.name ? <span className='link'>{user.name}</span> : null}
							<button type='button' className='link' onClick={handleLogout}>
								Cerrar sesión
							</button>
						</>
					) : (
						<>
							<NavLink to='/login' className={({ isActive }) => (isActive ? active : 'link')}>
								Login
							</NavLink>
							<NavLink to='/register' className={({ isActive }) => (isActive ? active : 'link')}>
								Registro
							</NavLink>
						</>
					)}
					<ThemeToggle />
					<LanguageSelect />
				</nav>
			</div>
		</header>
	)
}
