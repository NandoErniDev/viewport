import type { DeviceCategory, DevicePreset, Preview } from './types'
import { uid } from './utils'

/**
 * Device preset library.
 *
 * All numbers are CSS viewport dimensions (window.innerWidth / innerHeight on the
 * device), not physical panel resolutions. DPR is stored for reference only — a
 * browser preview cannot change the host machine's pixel density.
 */
export const DEVICE_PRESETS: DevicePreset[] = [
  // ---------------------------------------------------------------- phones
  { id: 'iphone-16e', name: 'iPhone 16e', width: 390, height: 844, dpr: 3, category: 'phone', note: '6.1″' },
  { id: 'iphone-16', name: 'iPhone 16', width: 393, height: 852, dpr: 3, category: 'phone', note: '6.1″' },
  { id: 'iphone-16-pro', name: 'iPhone 16 Pro', width: 402, height: 874, dpr: 3, category: 'phone', note: '6.3″' },
  { id: 'iphone-16-pro-max', name: 'iPhone 16 Pro Max', width: 440, height: 956, dpr: 3, category: 'phone', note: '6.9″' },
  { id: 'iphone-17-pro', name: 'iPhone 17 Pro', width: 402, height: 874, dpr: 3, category: 'phone', note: '6.3″' },
  { id: 'iphone-17-pro-max', name: 'iPhone 17 Pro Max', width: 440, height: 956, dpr: 3, category: 'phone', note: '6.9″' },
  { id: 'phone-small', name: 'Small phone', width: 360, height: 640, dpr: 2, category: 'phone', note: 'Generic' },
  { id: 'phone-large', name: 'Large phone', width: 412, height: 915, dpr: 2.625, category: 'phone', note: 'Generic' },

  // --------------------------------------------------------------- tablets
  { id: 'ipad-mini', name: 'iPad mini', width: 744, height: 1133, dpr: 2, category: 'tablet', note: '8.3″' },
  { id: 'ipad-air-11', name: 'iPad Air 11″', width: 820, height: 1180, dpr: 2, category: 'tablet' },
  { id: 'ipad-pro-11', name: 'iPad Pro 11″', width: 834, height: 1210, dpr: 2, category: 'tablet' },
  { id: 'ipad-pro-13', name: 'iPad Pro 13″', width: 1032, height: 1376, dpr: 2, category: 'tablet' },
  { id: 'tablet-generic', name: 'Tablet', width: 768, height: 1024, dpr: 2, category: 'tablet', note: 'Generic' },

  // --------------------------------------------------------------- laptops
  { id: 'macbook-air-13', name: 'MacBook Air 13″', width: 1280, height: 832, dpr: 2, category: 'laptop' },
  { id: 'macbook-pro-14', name: 'MacBook Pro 14″', width: 1512, height: 982, dpr: 2, category: 'laptop' },
  { id: 'macbook-pro-16', name: 'MacBook Pro 16″', width: 1728, height: 1117, dpr: 2, category: 'laptop' },
  { id: 'laptop-generic', name: 'Laptop', width: 1366, height: 768, dpr: 1, category: 'laptop', note: 'Generic' },

  // --------------------------------------------------------------- desktop
  { id: 'desktop-1280', name: '1280 × 720', width: 1280, height: 720, dpr: 1, category: 'desktop' },
  { id: 'desktop-1440', name: '1440 × 900', width: 1440, height: 900, dpr: 1, category: 'desktop' },
  { id: 'desktop-1920', name: '1920 × 1080', width: 1920, height: 1080, dpr: 1, category: 'desktop' },
  { id: 'desktop-2560', name: '2560 × 1440', width: 2560, height: 1440, dpr: 1, category: 'desktop' },
]

export const CATEGORY_LABELS: Record<DeviceCategory, string> = {
  phone: 'Phones',
  tablet: 'Tablets',
  laptop: 'Laptops',
  desktop: 'Desktop',
  custom: 'Custom',
}

export const CATEGORY_ORDER: DeviceCategory[] = ['phone', 'tablet', 'laptop', 'desktop', 'custom']

export const DEFAULT_BREAKPOINTS = [375, 390, 430, 640, 768, 1024, 1280, 1440]

export function findPreset(id: string, custom: DevicePreset[] = []): DevicePreset | undefined {
  return DEVICE_PRESETS.find((p) => p.id === id) ?? custom.find((p) => p.id === id)
}

export function defaultFrameFor(category: DeviceCategory): Preview['frameStyle'] {
  if (category === 'phone' || category === 'tablet') return 'bezel'
  if (category === 'custom') return 'bezel'
  return 'outline'
}

export function previewFromPreset(preset: DevicePreset): Preview {
  return {
    instanceId: uid('pv'),
    presetId: preset.id,
    name: preset.name,
    width: preset.width,
    height: preset.height,
    dpr: preset.dpr,
    category: preset.category,
    orientation: preset.width <= preset.height ? 'portrait' : 'landscape',
    frameStyle: defaultFrameFor(preset.category),
    nonce: 0,
    url: null,
  }
}

/** Devices every new workspace starts with. */
export const DEFAULT_DEVICE_IDS = ['iphone-16-pro', 'ipad-air-11', 'macbook-air-13']

export function dimensionsLabel(width: number, height: number): string {
  return `${Math.round(width)} × ${Math.round(height)}`
}

/* ------------------------------------------------------------------ hardware */

export type DeviceTone = 'titanium' | 'aluminum' | 'graphite' | 'glass' | 'none'

/** Physical proportions of a device body, in the device's own CSS pixels. */
export interface FrameSpec {
  /** Bezel thickness around the screen. */
  pad: number
  /** Extra body below the screen (a laptop chin). */
  chin: number
  /** Outer body corner radius. */
  bodyRadius: number
  /** Display corner radius. */
  screenRadius: number
  tone: DeviceTone
  island: 'dynamic' | 'notch' | 'none'
  buttons: boolean
  camera: boolean
}

const BARE: FrameSpec = {
  pad: 0,
  chin: 0,
  bodyRadius: 0,
  screenRadius: 0,
  tone: 'none',
  island: 'none',
  buttons: false,
  camera: false,
}

type FrameInput = Pick<Preview, 'category' | 'presetId' | 'width' | 'height' | 'frameStyle'>

/**
 * Body geometry per device family. Real hardware proportions: a phone bezel is a
 * few percent of the screen width, a tablet's is wider, a laptop has a chin.
 */
export function frameSpec(preview: FrameInput): FrameSpec {
  if (preview.frameStyle === 'none') return BARE

  if (preview.frameStyle === 'outline') {
    return { ...BARE, pad: 0, bodyRadius: 10, screenRadius: 8, tone: 'glass' }
  }

  switch (preview.category) {
    case 'phone':
      return preview.presetId.startsWith('iphone')
        ? {
            pad: 11,
            chin: 0,
            bodyRadius: 62,
            screenRadius: 52,
            tone: 'titanium',
            island: 'dynamic',
            buttons: true,
            camera: false,
          }
        : {
            pad: 10,
            chin: 0,
            bodyRadius: 44,
            screenRadius: 34,
            tone: 'graphite',
            island: 'notch',
            buttons: true,
            camera: false,
          }

    case 'tablet':
      return {
        pad: 16,
        chin: 0,
        bodyRadius: 30,
        screenRadius: 20,
        tone: 'aluminum',
        island: 'none',
        buttons: false,
        camera: true,
      }

    case 'laptop':
      return {
        pad: 9,
        chin: 22,
        bodyRadius: 15,
        screenRadius: 7,
        tone: 'aluminum',
        island: 'none',
        buttons: false,
        camera: true,
      }

    case 'desktop':
      return {
        pad: 9,
        chin: 22,
        bodyRadius: 12,
        screenRadius: 6,
        tone: 'graphite',
        island: 'none',
        buttons: false,
        camera: false,
      }

    default: {
      const short = Math.min(preview.width, preview.height)
      const radius = Math.max(10, Math.min(44, Math.round(short * 0.05)))
      return {
        pad: 9,
        chin: 0,
        bodyRadius: radius,
        screenRadius: Math.max(4, radius - 7),
        tone: 'graphite',
        island: 'none',
        buttons: false,
        camera: false,
      }
    }
  }
}

/** Outer size of the device including its body. */
export function framedSize(
  preview: FrameInput,
): { width: number; height: number; spec: FrameSpec } {
  const spec = frameSpec(preview)
  return {
    width: preview.width + spec.pad * 2,
    height: preview.height + spec.pad * 2 + spec.chin,
    spec,
  }
}
