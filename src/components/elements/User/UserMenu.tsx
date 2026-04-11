import './UserMenu.scss'

import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { authService } from '@/services/auth'

export function UserMenu() {
	const { t } = useTranslation()
	const [open, setOpen] = useState(false)
	const navigate = useNavigate()
	const user = authService.getUser()
	const ref = useRef<HTMLDivElement | null>(null)

	const avatarUrl = (user && user.imageUrl) || null
	const firstWord = (user?.name || t('nav.user')).split(' ')[0]

	useEffect(() => {
		function onDoc(e: MouseEvent) {
			if (!ref.current) return
			if (e.target instanceof Node && !ref.current.contains(e.target)) setOpen(false)
		}
		document.addEventListener('click', onDoc)
		return () => document.removeEventListener('click', onDoc)
	}, [])

	const handleLogout = () => {
		authService.logout()
		navigate('/login')
	}

	return (
		<div className='user-menu' ref={ref}>
			<button
				className={`user-toggle ${open ? 'open' : ''}`}
				onClick={() => setOpen((s) => !s)}
				aria-expanded={open}
				aria-label='User menu'>
				{avatarUrl ? (
					<img src={avatarUrl} alt={firstWord} className='user-avatar' />
				) : (
					<span className='user-avatar-fallback' aria-hidden='true'>
						{firstWord.charAt(0)}
					</span>
				)}
			</button>

			{open && (
				<div className='user-dropdown'>
					<Link to='/macros' className='user-dropdown-item'>
						{t('nav.profile')}
					</Link>
					<Link to='/settings' className='user-dropdown-item'>
						{t('nav.settings')}
					</Link>
					<button className='user-dropdown-item danger' onClick={handleLogout}>
						{t('nav.logout')}
					</button>
				</div>
			)}
		</div>
	)
}
