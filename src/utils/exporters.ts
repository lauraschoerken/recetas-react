export function escapePdfText(value: string): string {
	return value
		.replace(/\\/g, '\\\\')
		.replace(/\(/g, '\\(')
		.replace(/\)/g, '\\)')
		.replace(/\r/g, ' ')
		.replace(/\n/g, ' ')
}

export function buildTextPdfDocument(lines: string[]): Blob {
	const sanitizedLines = lines.length > 0 ? lines : ['']
	const text = sanitizedLines
		.map((line) => escapePdfText(line))
		.join('\\n')
		.replace(/\\n/g, '\n')

	const content = `BT\n/F1 12 Tf\n72 720 Td\n(${escapePdfText(text)}) Tj\nET`
	const objects = [
		'<< /Type /Catalog /Pages 2 0 R >>',
		'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
		`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>`,
		`<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
		'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
	]

	let pdf = '%PDF-1.4\n'
	const offsets: number[] = []
	for (let index = 0; index < objects.length; index += 1) {
		offsets.push(pdf.length)
		pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`
	}

	const xrefOffset = pdf.length
	pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
	for (let index = 0; index < objects.length; index += 1) {
		pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`
	}
	pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

	return new Blob([pdf], { type: 'application/pdf' })
}

export function downloadBlob(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob)
	const link = document.createElement('a')
	link.href = url
	link.download = filename
	link.style.display = 'none'
	document.body.appendChild(link)
	link.click()
	link.remove()
	URL.revokeObjectURL(url)
}

export function downloadJson(data: unknown, filename: string): void {
	downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), filename)
}
