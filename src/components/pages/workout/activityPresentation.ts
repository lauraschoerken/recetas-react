export type ActivityFamily = 'running' | 'walking' | 'cycling' | 'strength' | 'hiit' | 'swimming' | 'hiking' | 'mindBody' | 'cardio' | 'other'

const normalize = (value?: string | null) => (value || '').toLowerCase().replace(/[\s-]+/g, '_')

export function activityFamily(value?: string | null): ActivityFamily {
	const type = normalize(value)
	if (/(strength|weight|lifting)/.test(type)) return 'strength'
	if (/(hiit|interval|tabata)/.test(type)) return 'hiit'
	if (/(cycling|bike|biking|cyclocross|bmx|ebike|e_bike)/.test(type)) return 'cycling'
	if (/(swim|open_water)/.test(type)) return 'swimming'
	if (/(trail_run|running|treadmill|track_run|virtual_run|ultra_run|indoor_run)/.test(type)) return 'running'
	if (/(hiking|mountaineer|climb|ruck)/.test(type)) return 'hiking'
	if (/(walking|walk)/.test(type)) return 'walking'
	if (/(yoga|pilates|breath|mobility)/.test(type)) return 'mindBody'
	if (/(cardio|elliptical|stair|fitness|rowing|indoor_row)/.test(type)) return 'cardio'
	return 'other'
}

const icons: Record<ActivityFamily, string> = {
	running: '🏃', walking: '🚶', cycling: '🚴', strength: '🏋️', hiit: '⏱️', swimming: '🏊', hiking: '🥾', mindBody: '🧘', cardio: '❤️', other: '🏅',
}

export function activityIcon(value?: string | null) { return icons[activityFamily(value)] }

export function activityLabel(value: string | null | undefined, translate: (key: string) => string) {
	const family = activityFamily(value)
	if (family !== 'other' || !value) return translate(`workouts.activityFamilies.${family}`)
	return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}
