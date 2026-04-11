import './AlertBell.scss'

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { HiOutlineBell } from 'react-icons/hi2'
import { Link } from 'react-router-dom'

import { alertService, StockAlert } from '@/services/alert'

export function AlertBell() {
	const { t } = useTranslation()
	const [count, setCount] = useState(0)
	const [open, setOpen] = useState(false)
	const [alerts, setAlerts] = useState<StockAlert[]>([])
	const ref = useRef<HTMLDivElement | null>(null)

	useEffect(() => {
		loadCount()
		const interval = setInterval(loadCount, 30000)
		return () => clearInterval(interval)
	}, [])

	useEffect(() => {
		function onDoc(e: MouseEvent) {
			if (!ref.current) return
			if (e.target instanceof Node && !ref.current.contains(e.target)) setOpen(false)
		}
		document.addEventListener('click', onDoc)
		return () => document.removeEventListener('click', onDoc)
	}, [])

	const loadCount = async () => {
		try {
			const c = await alertService.getUnreadCount()
			setCount(c)
		} catch {
			// ignore
		}
	}

	const handleToggle = async () => {
		if (!open) {
			try {
				const data = await alertService.getAlerts()
				setAlerts(data.slice(0, 5))
			} catch {
				// ignore
			}
		}
		setOpen((s) => !s)
	}

	const handleAction = async (alert: StockAlert, action: 'VIEWED' | 'SNOOZED' | 'RESOLVED') => {
		try {
			await alertService.updateAlert(alert.id, {
				status: action,
				...(action === 'SNOOZED'
					? { snoozedUntil: new Date(Date.now() + 86400000).toISOString() }
					: {}),
			})
			setAlerts((prev) => prev.filter((a) => a.id !== alert.id))
			setCount((c) => Math.max(0, c - 1))
		} catch {
			// ignore
		}
	}

	const handleAddToShopping = async (alert: StockAlert) => {
		try {
			await alertService.updateAlert(alert.id, {
				status: alert.status === 'OPEN' ? 'VIEWED' : alert.status,
				addToShopping: true,
			})
			setAlerts((prev) => prev.filter((a) => a.id !== alert.id))
			setCount((c) => Math.max(0, c - 1))
		} catch {
			// ignore
		}
	}

	return (
		<div className='alert-bell' ref={ref}>
			<button className='alert-bell-btn' onClick={handleToggle} aria-label={t('alerts.bell')}>
				<HiOutlineBell size={20} />
				{count > 0 && <span className='alert-bell-badge'>{count > 9 ? '9+' : count}</span>}
			</button>

			{open && (
				<div className='alert-bell-dropdown'>
					<div className='alert-bell-header'>
						<span>{t('alerts.bell')}</span>
						<Link to='/alerts' className='alert-bell-view-all' onClick={() => setOpen(false)}>
							{t('alerts.viewAll')}
						</Link>
					</div>
					{alerts.length === 0 ? (
						<div className='alert-bell-empty'>{t('alerts.noPending')}</div>
					) : (
						<div className='alert-bell-list'>
							{alerts.map((alert) => (
								<div key={alert.id} className='alert-bell-item'>
									<div className='alert-bell-message'>{alert.message}</div>
									<div className='alert-bell-actions'>
										<button
											className='alert-action-btn'
											onClick={() => handleAction(alert, 'VIEWED')}
											title={t('alerts.markViewed')}>
											{t('alerts.view')}
										</button>
										<button
											className='alert-action-btn'
											onClick={() => handleAction(alert, 'SNOOZED')}
											title={t('alerts.snooze')}>
											{t('alerts.snooze')}
										</button>
										<button
											className='alert-action-btn primary'
											onClick={() => handleAddToShopping(alert)}
											title={t('alerts.addToCart')}>
											{t('alerts.addToCart')}
										</button>
										<button
											className='alert-action-btn'
											onClick={() => handleAction(alert, 'RESOLVED')}
											title={t('alerts.resolve')}>
											{t('alerts.resolve')}
										</button>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			)}
		</div>
	)
}
