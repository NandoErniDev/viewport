export type DeviceCategory = 'phone' | 'tablet' | 'laptop' | 'desktop' | 'custom'

export type Orientation = 'portrait' | 'landscape'

export type FrameStyle = 'bezel' | 'outline' | 'none'

/** A device definition. Dimensions are CSS viewport pixels, never physical pixels. */
export interface DevicePreset {
  id: string
  name: string
  /** CSS viewport width in px (portrait for phones/tablets, native for laptops/desktops). */
  width: number
  /** CSS viewport height in px. */
  height: number
  /** Device pixel ratio of the real hardware, shown for reference. */
  dpr: number
  category: DeviceCategory
  note?: string
}

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/** One live preview in the workspace. */
export interface Preview {
  instanceId: string
  presetId: string
  name: string
  width: number
  height: number
  dpr: number
  category: DeviceCategory
  orientation: Orientation
  frameStyle: FrameStyle
  /** Bumped to force a reload of this individual frame. */
  nonce: number
  /** Per-preview URL override. `null` means it follows the workspace URL. */
  url: string | null
  /** Position in freeform layout. */
  pos?: Rect
}

export type Layout = 'grid' | 'row' | 'column' | 'freeform' | 'focus'

export type WorkspaceMode = 'devices' | 'breakpoints'

export type PanelId =
  | 'devices'
  | 'sessions'
  | 'settings'
  | 'shortcuts'
  | 'compare'
  | 'device-editor'
  | null

export interface RecentEntry {
  url: string
  at: number
}

export interface Capture {
  id: string
  label: string
  device: string
  url: string
  dataUrl: string
  width: number
  height: number
  createdAt: number
}

/** Serialisable workspace configuration — the only thing that is ever shared. */
export interface WorkspaceConfig {
  url: string
  previews: Array<
    Pick<
      Preview,
      | 'presetId'
      | 'name'
      | 'width'
      | 'height'
      | 'dpr'
      | 'category'
      | 'orientation'
      | 'frameStyle'
      | 'url'
    >
  >
  layout: Layout
  zoom: number
  syncScroll: boolean
  syncNav: boolean
  showFrames: boolean
  breakpoints: number[]
}

export interface Session {
  id: string
  name: string
  createdAt: number
  config: WorkspaceConfig
}

export interface Toast {
  id: string
  message: string
  kind: 'info' | 'success' | 'error'
  href?: string
  hrefLabel?: string
}
