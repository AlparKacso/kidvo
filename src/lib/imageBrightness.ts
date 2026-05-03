export type ContrastMode = 'normal' | 'bright' | 'placeholder'

export function detectBrightness(imgEl: HTMLImageElement): 'normal' | 'bright' {
  if (!imgEl.naturalWidth || !imgEl.naturalHeight) return 'normal'

  const w = 64
  const h = Math.max(1, Math.round(w * (imgEl.naturalHeight / imgEl.naturalWidth)))
  const sampleH = Math.max(1, Math.round(h * 0.4))
  const sampleY = h - sampleH

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return 'normal'

  try {
    ctx.drawImage(imgEl, 0, 0, w, h)
    const { data } = ctx.getImageData(0, sampleY, w, sampleH)
    let sum = 0
    const pixels = data.length / 4
    for (let i = 0; i < data.length; i += 4) {
      sum += (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255
    }
    const avg = sum / pixels
    return avg > 0.7 ? 'bright' : 'normal'
  } catch {
    return 'normal'
  }
}

export function getProviderInitials(name: string | null | undefined): string {
  if (!name) return ''
  const trimmed = name.trim()
  if (!trimmed) return ''
  const words = trimmed.split(/\s+/).filter(Boolean)
  if (words.length === 0) return ''

  if (words.length === 1) {
    const w = words[0]
    const chars = Array.from(w)
    if (chars.length < 2) {
      return /[A-Za-z]/.test(chars[0] ?? '') ? chars[0].toUpperCase() : ''
    }
    const first = chars[0]
    const second = chars[1]
    if (/[A-Za-z]/.test(first) && /[A-Za-z]/.test(second)) {
      return (first + second).toUpperCase()
    }
    return ''
  }

  const first = words[0][0]
  const second = words[1][0]
  if (/[A-Za-z]/.test(first) && /[A-Za-z]/.test(second)) {
    return (first + second).toUpperCase()
  }
  return ''
}
