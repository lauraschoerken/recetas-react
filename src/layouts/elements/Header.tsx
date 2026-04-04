import '../layout.scss'

import { Link, NavLink, useNavigate } from 'react-router-dom'

import LanguageSelect from '@/components/elements/Languague/LanguagueSelect'
import { ThemeToggle } from '@/components/elements/Theme/ThemeToggle'
import { authService } from '@/services/auth'
import { APP_NAME } from '@/utils/constants'

export const Header = () => {
	const activeClass = 'link-active'
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
							<div className='nav__links'>
								<NavLink
									to='/recipes'
									className={({ isActive }) => (isActive ? activeClass : 'link')}>
									Recetas
								</NavLink>
								<NavLink to='/home' className={({ isActive }) => (isActive ? activeClass : 'link')}>
									Casa
								</NavLink>
								<NavLink
									to='/ingredients'
									className={({ isActive }) => (isActive ? activeClass : 'link')}>
									Ingredientes
								</NavLink>
								<NavLink
									to='/week-plan'
									className={({ isActive }) => (isActive ? activeClass : 'link')}>
									Plan semanal
								</NavLink>
								<NavLink
									to='/shopping-list'
									className={({ isActive }) => (isActive ? activeClass : 'link')}>
									Compra
								</NavLink>
								<NavLink
									to='/settings'
									className={({ isActive }) => (isActive ? activeClass : 'link')}>
									Ajustes
								</NavLink>
							</div>
							<div className='nav__user'>
								{user?.name && <span className='user-name'>{user.name}</span>}
								<button type='button' className='link logout-btn' onClick={handleLogout}>
									Salir
								</button>
							</div>
						</>
					) : (
						<>
							<NavLink to='/login' className={({ isActive }) => (isActive ? activeClass : 'link')}>
								Acceso
							</NavLink>
							<NavLink
								to='/register'
								className={({ isActive }) => (isActive ? activeClass : 'link')}>
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
