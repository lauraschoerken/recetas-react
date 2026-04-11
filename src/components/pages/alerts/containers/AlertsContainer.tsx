import './AlertsContainer.scss'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { alertService, StockAlert } from '@/services/alert'
import { useDialog } from '@/utils/dialog/DialogContext'

export function AlertsContainer() {
	const { t } = useTranslation()
	const { toast } = useDialog()
	const [alerts, setAlerts] = useState<StockAlert[]>([])
	const [loading, setLoading] = useState(true)
	const [showResolved, setShowResolved] = useState(false)

	useEffect(() => {
		loadAlerts()
	}, [showResolved])

	const loadAlerts = async () => {
		setLoading(true)
		try {
			const data = await alertService.getAlerts(showResolved)
			setAlerts(data)
		} catch {
			toast.error(t('alerts.loadError'))
		} finally {
			setLoading(false)
		}
	}

	const handleAction = async (alert: StockAlert, action: 'VIEWED' | 'SNOOZED' | 'RESOLVED') => {
		try {
			await alertService.updateAlert(alert.id, {
				status: action,
				...(action === 'SNOOZED'
					? { snoozedUntil: new Date(Date.now() + 86400000).toISOString() }
					: {}),
			})
			toast.success(
				action === 'RESOLVED'
					? t('alerts.resolved')
					: action === 'SNOOZED'
						? t('alerts.snoozed')
						: t('alerts.viewed')
			)
			loadAlerts()
		} catch {
			toast.error(t('alerts.updateError'))
		}
	}

	const handleAddToShopping = async (alert: StockAlert) => {
		try {
			await alertService.updateAlert(alert.id, {
				status: alert.status === 'OPEN' ? 'VIEWED' : alert.status,
				addToShopping: true,
			})
			toast.success(t('alerts.addedToCart'))
			loadAlerts()
		} catch {
			toast.error(t('alerts.updateError'))
		}
	}

	const formatDate = (dateStr: string) =>
		new Date(dateStr).toLocaleDateString('es-ES', {
			day: 'numeric',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit',
		})

	const triggerLabels: Record<string, string> = {
		COOK: t('alerts.triggerCook'),
		CONSUME: t('alerts.triggerConsume'),
		PLANNING: t('alerts.triggerPlanning'),
		MANUAL: t('alerts.triggerManual'),
	}

	if (loading) return <div className='loading'>{t('loading')}</div>

	return (
		<div className='alerts-container'>
			<div className='page-header'>
				<h1 className='page-title'>{t('alerts.title')}</h1>
				<div className='page-header-actions'>
					<button
						className={`btn btn-outline btn-sm ${showResolved ? 'active' : ''}`}
						onClick={() => setShowResolved(!showResolved)}>
						{showResolved ? t('alerts.hideResolved') : t('alerts.showResolved')}
					</button>
				</div>
			</div>

			{alerts.length === 0 ? (
				<div className='alerts-empty'>
					<p>{t('alerts.empty')}</p>
				</div>
			) : (
				<div className='alerts-list'>
					{alerts.map((alert) => (
						<div key={alert.id} className={`alert-card alert-card--${alert.status.toLowerCase()}`}>
							<div className='alert-card-header'>
								<span className={`alert-status alert-status--${alert.status.toLowerCase()}`}>
									{alert.status}
								</span>
								<span className='alert-trigger'>
									{triggerLabels[alert.triggerType] || alert.triggerType}
								</span>
								<span className='alert-date'>{formatDate(alert.createdAt)}</span>
							</div>
							<div className='alert-card-body'>
								<p className='alert-message'>{alert.message}</p>
								<div className='alert-details'>
									<span>
										{t('alerts.before')}: {alert.beforeQty}
									</span>
									<span>
										{t('alerts.delta')}: -{alert.deltaQty}
									</span>
									<span>
										{t('alerts.after')}: {alert.afterQty}
									</span>
									<span>
										{t('alerts.minimum')}: {alert.minimum}
									</span>
								</div>
							</div>
							{alert.status !== 'RESOLVED' && (
								<div className='alert-card-actions'>
									{alert.status === 'OPEN' && (
										<button
											className='btn btn-outline btn-sm'
											onClick={() => handleAction(alert, 'VIEWED')}>
											{t('alerts.markViewed')}
										</button>
									)}
									<button
										className='btn btn-outline btn-sm'
										onClick={() => handleAction(alert, 'SNOOZED')}>
										{t('alerts.snooze')}
									</button>
									<button
										className='btn btn-primary btn-sm'
										onClick={() => handleAddToShopping(alert)}>
										{t('alerts.addToCart')}
									</button>
									<button
										className='btn btn-outline btn-sm'
										onClick={() => handleAction(alert, 'RESOLVED')}>
										{t('alerts.resolve')}
									</button>
								</div>
							)}
						</div>
					))}
				</div>
			)}
		</div>
	)
}
