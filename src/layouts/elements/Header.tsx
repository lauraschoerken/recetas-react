import '../layout.scss'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink } from 'react-router-dom'

import { AlertBell } from '@/components/elements/AlertBell/AlertBell'
import LanguageSelect from '@/components/elements/Languague/LanguagueSelect'
import { ThemeToggle } from '@/components/elements/Theme/ThemeToggle'
import { UserMenu } from '@/components/elements/User/UserMenu'
import { authService } from '@/services/auth'
import { APP_NAME } from '@/utils/constants'

export const Header = () => {
	const { t } = useTranslation()
	const activeClass = 'link-active'
	const isAdmin = authService.isAdmin()
	const [menuOpen, setMenuOpen] = useState(false)

	useEffect(() => {
		if (!menuOpen) return
		const closeOnEscape = (event: KeyboardEvent) => {
			if (event.key === 'Escape') setMenuOpen(false)
		}
		document.addEventListener('keydown', closeOnEscape)
		return () => document.removeEventListener('keydown', closeOnEscape)
	}, [menuOpen])

	return (
		<header className='header'>
			<div className='container header__inner'>
				<Link to='/' className='link brand'>
					{APP_NAME}
				</Link>

				{/* Hamburguesa — solo móvil */}
				<button
					className={`nav__hamburger${menuOpen ? ' is-open' : ''}`}
					aria-label='Menú'
					aria-expanded={menuOpen}
					aria-controls='primary-navigation'
					onClick={() => setMenuOpen((v) => !v)}>
					<span />
					<span />
					<span />
				</button>

				<nav id='primary-navigation' className={`nav${menuOpen ? ' nav--open' : ''}`}>
					<div className='nav__links' onClick={() => setMenuOpen(false)}>
						<NavLink to='/recipes' className={({ isActive }) => (isActive ? activeClass : 'link')}>
							{t('nav.recipes')}
						</NavLink>
						<NavLink to='/home' className={({ isActive }) => (isActive ? activeClass : 'link')}>
							{t('nav.home')}
						</NavLink>
						<NavLink
							to='/ingredients'
							className={({ isActive }) => (isActive ? activeClass : 'link')}>
							{t('nav.ingredients')}
						</NavLink>
						<NavLink to='/products' className={({ isActive }) => (isActive ? activeClass : 'link')}>
							{t('products.title')}
						</NavLink>
						<NavLink
							to='/week-plan'
							className={({ isActive }) => (isActive ? activeClass : 'link')}>
							{t('nav.weekPlan')}
						</NavLink>
						<NavLink
							to='/shopping-list'
							className={({ isActive }) => (isActive ? activeClass : 'link')}>
							{t('nav.shopping')}
						</NavLink>
						<NavLink to='/workouts' className={({ isActive }) => (isActive ? activeClass : 'link')}>
							{t('nav.workouts')}
						</NavLink>
						{isAdmin && (
							<NavLink to='/admin' className={({ isActive }) => (isActive ? activeClass : 'link')}>
								{t('nav.admin')}
							</NavLink>
						)}
					</div>
					<div className='nav__actions'>
						<AlertBell /> <ThemeToggle />
						<LanguageSelect />
						<UserMenu onClose={() => setMenuOpen(false)} />
					</div>
				</nav>
			</div>
		</header>
	)
}
