import '../layout.scss'

import { Link, NavLink } from 'react-router-dom'

import LanguageSelect from '@/components/elements/Languague/LanguagueSelect'
import { ThemeToggle } from '@/components/elements/Theme/ThemeToggle'
import { UserMenu } from '@/components/elements/User/UserMenu'
import { APP_NAME } from '@/utils/constants'

export const Header = () => {
	const activeClass = 'link-active'

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
						</div>
					</>
					<div className='nav__actions'>
						<ThemeToggle />
						<LanguageSelect />
						<UserMenu />
					</div>
				</nav>
			</div>
		</header>
	)
}
