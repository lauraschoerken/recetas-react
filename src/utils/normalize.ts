/**
 * Elimina tildes/diacríticos y convierte a minúsculas.
 * Usar para comparaciones de texto insensibles a tildes.
 */
export function normalizeText(str: string): string {
	return str
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
}
