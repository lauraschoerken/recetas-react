import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
	const envRoot = path.resolve(__dirname, 'enviroments')
	const common = loadEnv('', envRoot, 'VITE_')
	const byModeDir =
		mode === 'dev'
			? path.resolve(envRoot, 'dev')
			: mode === 'prod'
				? path.resolve(envRoot, 'prod')
				: envRoot
	const byMode = fs.existsSync(byModeDir) ? loadEnv(mode, byModeDir, 'VITE_') : {}
	const env = { ...common, ...byMode }

	// If a mode-specific directory exists, copy any general `.env*` files
	// that are missing there so Vite loads both general and mode-specific
	// env files from the same `envDir`. This makes mode values override general ones.
	let finalEnvDir = envRoot
	if (fs.existsSync(byModeDir) && byModeDir !== envRoot) {
		const generalFiles = fs.readdirSync(envRoot).filter((f) => f.startsWith('.env'))
		for (const f of generalFiles) {
			const src = path.join(envRoot, f)
			const dest = path.join(byModeDir, f)
			if (!fs.existsSync(dest)) {
				try {
					fs.copyFileSync(src, dest)
				} catch (e) {
					// ignore copy errors
				}
			}
		}
		finalEnvDir = byModeDir
	}

	return {
		plugins: [react()],
		envDir: finalEnvDir,
		resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
		server: {
			port: Number(env.VITE_DEV_PORT),
			proxy: {
				'/api': {
					target: env.VITE_API_URL,
					changeOrigin: true,
				},
			},
		},

		define: {
			__APP_NAME__: JSON.stringify(env.VITE_APP_NAME ?? 'App'),
		},
	}
})
