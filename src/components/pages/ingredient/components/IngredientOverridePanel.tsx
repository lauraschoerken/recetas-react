import './IngredientOverridePanel.scss'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { IngredientVariant } from '@/services/ingredient'
import { IngredientOverride, ingredientOverrideService } from '@/services/ingredientExtras'
import { useDialog } from '@/utils/dialog/DialogContext'

interface Props {
	ingredientId: number
	variants: IngredientVariant[]
	ingredientUnit: string
}

export function IngredientOverridePanel({ ingredientId, variants, ingredientUnit }: Props) {
	const { t } = useTranslation()
	const { toast } = useDialog()
	const [override, setOverride] = useState<IngredientOverride | null>(null)
	const [preferredUnit, setPreferredUnit] = useState('')
	const [imageUrl, setImageUrl] = useState('')
	const [defaultLocation, setDefaultLocation] = useState('')
	const [purchaseVariantId, setPurchaseVariantId] = useState<number | ''>('')
	const [purchaseIndifferent, setPurchaseIndifferent] = useState(false)
	const [saving, setSaving] = useState(false)

	useEffect(() => {
		ingredientOverrideService.get(ingredientId).then((data) => {
			setOverride(data)
			if (data) {
				setPreferredUnit(data.preferredUnit ?? '')
				setImageUrl(data.imageUrl ?? '')
				setDefaultLocation(data.defaultLocation ?? '')
				setPurchaseVariantId(data.preferredPurchaseVariantId ?? '')
				setPurchaseIndifferent(data.purchaseIsIndifferent)
			}
		})
	}, [ingredientId])

	const handleSave = async () => {
		setSaving(true)
		try {
			const saved = await ingredientOverrideService.save(ingredientId, {
				preferredUnit: preferredUnit || null,
				imageUrl: imageUrl || null,
				defaultLocation: defaultLocation || null,
				preferredPurchaseVariantId: purchaseIndifferent
					? null
					: purchaseVariantId === ''
						? null
						: Number(purchaseVariantId),
				purchaseIsIndifferent: purchaseIndifferent,
			})
			setOverride(saved)
			toast.success(t('overrides.saved'))
		} catch {
			toast.error(t('overrides.saveError'))
		} finally {
			setSaving(false)
		}
	}

	const handleClear = async () => {
		try {
			await ingredientOverrideService.clear(ingredientId)
			setOverride(null)
			setPreferredUnit('')
			setImageUrl('')
			setDefaultLocation('')
			setPurchaseVariantId('')
			setPurchaseIndifferent(false)
			toast.success(t('overrides.cleared'))
		} catch {
			toast.error(t('overrides.clearError'))
		}
	}

	return (
		<div className='ing-override-panel'>
			<p className='ing-override-panel__subtitle'>{t('overrides.subtitle')}</p>

			<div className='ing-override-panel__row'>
				<label>{t('overrides.preferredUnit')}</label>
				<input
					type='text'
					value={preferredUnit}
					placeholder={ingredientUnit || t('overrides.preferredUnitHint')}
					onChange={(e) => setPreferredUnit(e.target.value)}
					className='ing-override-panel__input'
				/>
			</div>

			<div className='ing-override-panel__row'>
				<label>{t('overrides.imageUrl')}</label>
				<input
					type='text'
					value={imageUrl}
					placeholder={t('overrides.imageUrlHint')}
					onChange={(e) => setImageUrl(e.target.value)}
					className='ing-override-panel__input'
				/>
			</div>

			<div className='ing-override-panel__row'>
				<label>{t('overrides.defaultLocation')}</label>
				<select
					value={defaultLocation}
					onChange={(e) => setDefaultLocation(e.target.value)}
					className='ing-override-panel__input'>
					<option value=''>{t('recipes.noPreference')}</option>
					<option value='nevera'>{t('homePage.fridge')}</option>
					<option value='congelador'>{t('homePage.freezer')}</option>
					<option value='despensa'>{t('homePage.pantry')}</option>
				</select>
			</div>

			<div className='ing-override-panel__row'>
				<label>{t('overrides.purchaseVariant')}</label>
				<label className='ing-override-panel__check'>
					<input
						type='checkbox'
						checked={purchaseIndifferent}
						onChange={(e) => {
							setPurchaseIndifferent(e.target.checked)
							if (e.target.checked) setPurchaseVariantId('')
						}}
					/>
					{t('overrides.purchaseIndifferent')}
				</label>
				{!purchaseIndifferent && variants.length > 0 && (
					<select
						value={purchaseVariantId}
						onChange={(e) =>
							setPurchaseVariantId(e.target.value === '' ? '' : Number(e.target.value))
						}
						className='ing-override-panel__input'>
						<option value=''>{t('recipes.noPreference')}</option>
						{variants.map((v) => (
							<option key={v.id} value={v.id}>
								{v.name}
							</option>
						))}
					</select>
				)}
			</div>

			<div className='ing-override-panel__actions'>
				{override && (
					<button className='ing-override-panel__btn-clear' onClick={handleClear}>
						{t('overrides.clear')}
					</button>
				)}
				<button className='ing-override-panel__btn-save' onClick={handleSave} disabled={saving}>
					{saving ? t('loading') : t('overrides.save')}
				</button>
			</div>
		</div>
	)
}
