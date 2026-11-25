import type { Capture } from './types'

/**
 * Screenshot capture.
 *
 * A cross-origin iframe cannot be rasterised from JavaScript: the canvas would be
 * tainted by the embedded site. Instead we ask the browser for a display-capture
 * stream of the current tab (one explicit user permission) and crop the actual
 * rendered pixels of the requested preview. What we save is what was on screen.
 */

export interface RegionCapture {
  dataUrl: string
  width: number
  height: number
  scale: number
}

export function isCaptureSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices?.getDisplayMedia === 'function' &&
    window.isSecureContext
  )
}

export async function acquireDisplayStream(): Promise<MediaStream> {
  if (!isCaptureSupported()) {
    throw new Error(
      'Screen capture is unavailable here. It needs a secure (https) page and a browser with display capture.',
    )
  }
  const constraints = {
    video: { displaySurface: 'browser', frameRate: 30 },
    audio: false,
    preferCurrentTab: true,
    selfBrowserSurface: 'include',
  }
  return navigator.mediaDevices.getDisplayMedia(
    constraints as unknown as DisplayMediaStreamOptions,
  )
}

function waitForMetadata(video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error('Capture timed out.')), 8000)
    video.onloadedmetadata = () => {
      window.clearTimeout(timeout)
      resolve()
    }
    video.onerror = () => {
      window.clearTimeout(timeout)
      reject(new Error('The capture stream could not be read.'))
    }
  })
}

/** Crops the live frame of `stream` to the on-screen rectangle of `element`. */
export async function captureRegion(
  stream: MediaStream,
  element: HTMLElement,
): Promise<RegionCapture> {
  const video = document.createElement('video')
  video.srcObject = stream
  video.muted = true
  video.playsInline = true
  await waitForMetadata(video)
  await video.play().catch(() => undefined)

  // Give the compositor two frames so the region is up to date.
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })

  const rect = element.getBoundingClientRect()
  if (rect.width < 2 || rect.height < 2) throw new Error('That preview is not visible right now.')

  const viewWidth = Math.max(document.documentElement.clientWidth, 1)
  const viewHeight = Math.max(document.documentElement.clientHeight, 1)
  const scaleX = video.videoWidth / viewWidth
  const scaleY = video.videoHeight / viewHeight

  const sx = Math.max(0, Math.round(rect.left * scaleX))
  const sy = Math.max(0, Math.round(rect.top * scaleY))
  const sw = Math.min(video.videoWidth - sx, Math.round(rect.width * scaleX))
  const sh = Math.min(video.videoHeight - sy, Math.round(rect.height * scaleY))

  if (sw < 2 || sh < 2) throw new Error('That preview is outside the captured area.')

  const canvas = document.createElement('canvas')
  canvas.width = sw
  canvas.height = sh
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is unavailable in this browser.')
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh)

  video.pause()
  video.srcObject = null

  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: sw,
    height: sh,
    scale: scaleX,
  }
}

export function stopStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop())
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('A captured image could not be loaded.'))
    image.src = src
  })
}

/**
 * Builds a difference map between two captures. Pixels are compared after both are
 * scaled to a shared width, so this is an approximate visual diff — not a
 * pixel-perfect regression baseline.
 */
export async function diffCaptures(a: Capture, b: Capture): Promise<string> {
  const [imageA, imageB] = await Promise.all([loadImage(a.dataUrl), loadImage(b.dataUrl)])
  const targetWidth = Math.min(1400, Math.max(480, imageA.naturalWidth))
  const targetHeight = Math.max(1, Math.round((targetWidth / imageA.naturalWidth) * imageA.naturalHeight))

  const canvasA = document.createElement('canvas')
  canvasA.width = targetWidth
  canvasA.height = targetHeight
  const ctxA = canvasA.getContext('2d')
  const canvasB = document.createElement('canvas')
  canvasB.width = targetWidth
  canvasB.height = targetHeight
  const ctxB = canvasB.getContext('2d')
  if (!ctxA || !ctxB) throw new Error('Canvas is unavailable in this browser.')

  ctxA.drawImage(imageA, 0, 0, targetWidth, targetHeight)
  ctxB.drawImage(imageB, 0, 0, targetWidth, targetHeight)

  const dataA = ctxA.getImageData(0, 0, targetWidth, targetHeight)
  const dataB = ctxB.getImageData(0, 0, targetWidth, targetHeight)
  const out = ctxA.createImageData(targetWidth, targetHeight)

  for (let index = 0; index < dataA.data.length; index += 4) {
    const base = (dataA.data[index] + dataA.data[index + 1] + dataA.data[index + 2]) / 3
    const next = (dataB.data[index] + dataB.data[index + 1] + dataB.data[index + 2]) / 3
    const delta = Math.abs(base - next)

    // Muted greyscale of the original beneath the highlighted differences.
    out.data[index] = base * 0.12
    out.data[index + 1] = base * 0.13
    out.data[index + 2] = base * 0.16
    out.data[index + 3] = 255

    if (delta > 12) {
      const strength = Math.min(1, delta / 90)
      out.data[index] = 178 + Math.round(70 * strength)
      out.data[index + 1] = 120 - Math.round(40 * strength)
      out.data[index + 2] = 255 - Math.round(60 * strength)
    }
  }

  ctxA.putImageData(out, 0, 0)
  return canvasA.toDataURL('image/png')
}

/** Percentage of sampled pixels that differ, for a quick summary line. */
export async function diffRatio(a: Capture, b: Capture): Promise<number> {
  const [imageA, imageB] = await Promise.all([loadImage(a.dataUrl), loadImage(b.dataUrl)])
  const width = 320
  const height = Math.max(1, Math.round((width / imageA.naturalWidth) * imageA.naturalHeight))
  const canvasA = document.createElement('canvas')
  canvasA.width = width
  canvasA.height = height
  const canvasB = document.createElement('canvas')
  canvasB.width = width
  canvasB.height = height
  const ctxA = canvasA.getContext('2d', { willReadFrequently: true })
  const ctxB = canvasB.getContext('2d', { willReadFrequently: true })
  if (!ctxA || !ctxB) return 0
  ctxA.drawImage(imageA, 0, 0, width, height)
  ctxB.drawImage(imageB, 0, 0, width, height)
  const dataA = ctxA.getImageData(0, 0, width, height).data
  const dataB = ctxB.getImageData(0, 0, width, height).data
  let changed = 0
  const total = width * height
  for (let index = 0; index < dataA.length; index += 4) {
    if (Math.abs(dataA[index] - dataB[index]) > 12) changed += 1
  }
  return (changed / total) * 100
}
