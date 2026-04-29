import '../layout.scss'

import { Link, NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { AlertBell } from '@/components/elements/AlertBell/AlertBell'
import LanguageSelect from '@/components/elements/Languague/LanguagueSelect'
import { ThemeToggle } from '@/components/elements/Theme/ThemeToggle'
import { UserMenu } from '@/components/elements/User/UserMenu'
import { APP_NAME } from '@/utils/constants'
import { authService } from '@/services/auth'

export const Header = () => {
	const { t } = useTranslation()
	const activeClass = 'link-active'
	const isAdmin = authService.isAdmin()

	return (
		<header className='header'>
			<div className='container header__inner'>
				<Link to='/' className='link brand'>
					{APP_NAME}
				</Link>
				<nav className='nav'>
					<>
						<div className='nav__links'>
							<NavLink
								to='/recipes'
								className={({ isActive }) => (isActive ? activeClass : 'link')}>
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
							{isAdmin && (
								<NavLink
									to='/admin'
									className={({ isActive }) => (isActive ? activeClass : 'link')}>
									{t('nav.admin')}
								</NavLink>
							)}
						</div>
					</>
					<div className='nav__actions'>
						{' '}
						<AlertBell /> <ThemeToggle />
						<LanguageSelect />
						<UserMenu />
					</div>
				</nav>
			</div>
		</header>
	)
}
