import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  DEFAULT_BREAKPOINTS,
  DEFAULT_DEVICE_IDS,
  DEVICE_PRESETS,
  findPreset,
  previewFromPreset,
} from './devices'
import type {
  Capture,
  DeviceCategory,
  DevicePreset,
  FrameStyle,
  Layout,
  Orientation,
  PanelId,
  Preview,
  RecentEntry,
  Session,
  Toast,
  WorkspaceConfig,
  WorkspaceMode,
} from './types'
import { clamp, isInternalUrl, normalizeUrl, uid, type UrlResult } from './utils'

export const MAX_PREVIEWS = 8
export const MIN_PREVIEWS = 1

function defaultWorkspaceUrl(): string {
  return '/demo/'
}

function buildDefaultPreviews(): Preview[] {
  return DEFAULT_DEVICE_IDS.map((id) => {
    const preset = DEVICE_PRESETS.find((item) => item.id === id)
    return preset ? previewFromPreset(preset) : null
  }).filter((item): item is Preview => item !== null)
}

function sanitizeUrl(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) return defaultWorkspaceUrl()
  if (isInternalUrl(value)) return value
  const result = normalizeUrl(value)
  return result.ok ? result.url : defaultWorkspaceUrl()
}

function sanitizeConfig(config: WorkspaceConfig): {
  url: string
  previews: Preview[]
  layout: Layout
  zoom: number
  syncScroll: boolean
  syncNav: boolean
  showFrames: boolean
  breakpoints: number[]
} {
  const previews = (Array.isArray(config.previews) ? config.previews : [])
    .slice(0, MAX_PREVIEWS)
    .map((item) => {
      const raw = item as Partial<Preview>
      const category = (raw.category ?? 'custom') as DeviceCategory
      const frameStyle: FrameStyle =
        raw.frameStyle === 'none' || raw.frameStyle === 'outline' || raw.frameStyle === 'bezel'
          ? raw.frameStyle
          : 'bezel'
      return {
        instanceId: uid('pv'),
        presetId: typeof raw.presetId === 'string' ? raw.presetId : 'shared',
        name: typeof raw.name === 'string' ? raw.name.slice(0, 64) : 'Preview',
        width: clamp(Number(raw.width) || 390, 160, 4096),
        height: clamp(Number(raw.height) || 844, 160, 4096),
        dpr: clamp(Number(raw.dpr) || 1, 0.5, 4),
        category,
        orientation: (raw.orientation === 'landscape' ? 'landscape' : 'portrait') as Orientation,
        frameStyle,
        nonce: 0,
        url: typeof raw.url === 'string' && raw.url.length > 0 ? sanitizeUrl(raw.url) : null,
      } satisfies Preview
    })

  const breakpoints = (Array.isArray(config.breakpoints) ? config.breakpoints : DEFAULT_BREAKPOINTS)
    .map((value) => Math.round(Number(value)))
    .filter((value) => Number.isFinite(value) && value >= 200 && value <= 3840)

  const layoutList: Layout[] = ['grid', 'row', 'column', 'freeform', 'focus']

  return {
    url: sanitizeUrl(config.url),
    previews: previews.length > 0 ? previews : buildDefaultPreviews(),
    layout: layoutList.includes(config.layout) ? config.layout : 'grid',
    zoom: typeof config.zoom === 'number' && Number.isFinite(config.zoom) ? clamp(config.zoom, 0, 1) : 0,
    syncScroll: Boolean(config.syncScroll),
    syncNav: config.syncNav !== false,
    showFrames: config.showFrames !== false,
    breakpoints: Array.from(new Set(breakpoints)).sort((a, b) => a - b),
  }
}

export function configFromState(state: WorkspaceState): WorkspaceConfig {
  return {
    url: state.url,
    previews: state.previews.map(({ presetId, name, width, height, dpr, category, orientation, frameStyle, url }) => ({
      presetId,
      name,
      width,
      height,
      dpr,
      category,
      orientation,
      frameStyle,
      url,
    })),
    layout: state.layout,
    zoom: state.zoom,
    syncScroll: state.syncScroll,
    syncNav: state.syncNav,
    showFrames: state.showFrames,
    breakpoints: state.breakpoints,
  }
}

export function resolvePreviewUrl(preview: Preview, workspaceUrl: string): string {
  return preview.url ?? workspaceUrl
}

interface WorkspaceState {
  url: string
  previews: Preview[]
  layout: Layout
  zoom: number
  focusId: string | null
  mode: WorkspaceMode
  showFrames: boolean
  syncScroll: boolean
  syncNav: boolean
  breakpoints: number[]
  breakpointHeight: number
  customDevices: DevicePreset[]
  recent: RecentEntry[]
  sessions: Session[]
  capturePrefix: string
  captures: Capture[]
  toasts: Toast[]
  panel: PanelId

  navigate: (input: string, targetId?: string) => UrlResult
  setWorkspaceUrl: (url: string) => void
  setPreviewUrl: (id: string, url: string | null) => void
  addPreset: (presetId: string) => void
  addCustomPreview: (preset: DevicePreset, frameStyle?: FrameStyle) => void
  duplicatePreview: (id: string) => void
  removePreview: (id: string) => void
  reloadPreview: (id: string) => void
  reloadAll: () => void
  rotatePreview: (id: string) => void
  setPreviewSize: (id: string, size: { width?: number; height?: number }) => void
  setPreviewFrame: (id: string, frameStyle: FrameStyle) => void
  setPreviewPos: (id: string, pos: Preview['pos']) => void
  setFocus: (id: string | null) => void
  setLayout: (layout: Layout) => void
  autoArrange: () => void
  setZoom: (zoom: number) => void
  setMode: (mode: WorkspaceMode) => void
  setShowFrames: (show: boolean) => void
  setSyncScroll: (value: boolean) => void
  setSyncNav: (value: boolean) => void
  setBreakpoints: (values: number[]) => void
  addBreakpoint: (value: number) => void
  removeBreakpoint: (value: number) => void
  updateBreakpoint: (index: number, value: number) => void
  setBreakpointHeight: (height: number) => void
  addCustomDevice: (device: Omit<DevicePreset, 'id'>) => DevicePreset
  removeCustomDevice: (id: string) => void
  recordRecent: (url: string) => void
  clearRecent: () => void
  saveSession: (name: string) => void
  loadSession: (id: string) => void
  deleteSession: (id: string) => void
  applyConfig: (config: WorkspaceConfig) => void
  resetWorkspace: () => void
  setCapturePrefix: (prefix: string) => void
  addCapture: (capture: Capture) => void
  removeCapture: (id: string) => void
  clearCaptures: () => void
  toast: (message: string, kind?: Toast['kind'], extra?: Partial<Toast>) => void
  dismissToast: (id: string) => void
  setPanel: (panel: PanelId) => void
}

export const useWorkspace = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      url: defaultWorkspaceUrl(),
      previews: buildDefaultPreviews(),
      layout: 'grid',
      zoom: 0,
      focusId: null,
      mode: 'devices',
      showFrames: true,
      syncScroll: false,
      syncNav: true,
      breakpoints: [...DEFAULT_BREAKPOINTS],
      breakpointHeight: 900,
      customDevices: [],
      recent: [],
      sessions: [],
      capturePrefix: 'viewport',
      captures: [],
      toasts: [],
      panel: null,

      navigate: (input, targetId) => {
        const result = normalizeUrl(input)
        if (!result.ok) {
          get().toast(result.error, 'error')
          return result
        }
        const { previews, focusId, syncNav } = get()
        const target = targetId ?? (syncNav ? null : (focusId ?? previews[0]?.instanceId))
        if (target) {
          set({
            previews: previews.map((preview) =>
              preview.instanceId === target
                ? { ...preview, url: result.url, nonce: preview.nonce + 1 }
                : preview,
            ),
          })
        } else {
          set({
            url: result.url,
            previews: previews.map((preview) => ({ ...preview, url: null })),
          })
        }
        get().recordRecent(result.url)
        return result
      },

      setWorkspaceUrl: (url) => set({ url }),
      setPreviewUrl: (id, url) =>
        set({
          previews: get().previews.map((preview) =>
            preview.instanceId === id ? { ...preview, url, nonce: preview.nonce + 1 } : preview,
          ),
        }),

      addPreset: (presetId) => {
        const { previews, customDevices } = get()
        if (previews.length >= MAX_PREVIEWS) {
          get().toast(`Up to ${MAX_PREVIEWS} previews at once. Remove one to add another.`, 'error')
          return
        }
        const preset = findPreset(presetId, customDevices)
        if (!preset) return
        const preview = previewFromPreset(preset)
        set({ previews: [...previews, preview], focusId: preview.instanceId })
      },

      addCustomPreview: (preset, frameStyle) => {
        const { previews } = get()
        if (previews.length >= MAX_PREVIEWS) {
          get().toast(`Up to ${MAX_PREVIEWS} previews at once. Remove one to add another.`, 'error')
          return
        }
        const preview = previewFromPreset(preset)
        set({
          previews: [...previews, frameStyle ? { ...preview, frameStyle } : preview],
          focusId: preview.instanceId,
        })
      },

      duplicatePreview: (id) => {
        const { previews } = get()
        if (previews.length >= MAX_PREVIEWS) {
          get().toast(`Up to ${MAX_PREVIEWS} previews at once.`, 'error')
          return
        }
        const source = previews.find((preview) => preview.instanceId === id)
        if (!source) return
        const copy: Preview = { ...source, instanceId: uid('pv'), nonce: 0, pos: undefined }
        set({ previews: [...previews, copy], focusId: copy.instanceId })
      },

      removePreview: (id) => {
        const { previews, focusId } = get()
        if (previews.length <= MIN_PREVIEWS) {
          get().toast('Keep at least one preview in the workspace.', 'error')
          return
        }
        const next = previews.filter((preview) => preview.instanceId !== id)
        set({
          previews: next,
          focusId: focusId === id ? (next[0]?.instanceId ?? null) : focusId,
        })
      },

      reloadPreview: (id) =>
        set({
          previews: get().previews.map((preview) =>
            preview.instanceId === id ? { ...preview, nonce: preview.nonce + 1 } : preview,
          ),
        }),

      reloadAll: () =>
        set({
          previews: get().previews.map((preview) => ({ ...preview, nonce: preview.nonce + 1 })),
        }),

      rotatePreview: (id) =>
        set({
          previews: get().previews.map((preview) =>
            preview.instanceId === id
              ? {
                  ...preview,
                  width: preview.height,
                  height: preview.width,
                  orientation: preview.orientation === 'portrait' ? 'landscape' : 'portrait',
                }
              : preview,
          ),
        }),

      setPreviewSize: (id, size) =>
        set({
          previews: get().previews.map((preview) =>
            preview.instanceId === id
              ? {
                  ...preview,
                  width: clamp(size.width ?? preview.width, 160, 4096),
                  height: clamp(size.height ?? preview.height, 160, 4096),
                  orientation:
                    (size.width ?? preview.width) <= (size.height ?? preview.height)
                      ? 'portrait'
                      : 'landscape',
                }
              : preview,
          ),
        }),

      setPreviewFrame: (id, frameStyle) =>
        set({
          previews: get().previews.map((preview) =>
            preview.instanceId === id ? { ...preview, frameStyle } : preview,
          ),
        }),

      setPreviewPos: (id, pos) =>
        set({
          previews: get().previews.map((preview) =>
            preview.instanceId === id ? { ...preview, pos } : preview,
          ),
        }),

      setFocus: (id) => set({ focusId: id }),
      setLayout: (layout) => set({ layout }),
      autoArrange: () =>
        set({
          previews: get().previews.map((preview) => ({ ...preview, pos: undefined })),
        }),
      setZoom: (zoom) => set({ zoom: clamp(zoom, 0, 1) }),
      setMode: (mode) => set({ mode }),
      setShowFrames: (showFrames) => set({ showFrames }),
      setSyncScroll: (syncScroll) => set({ syncScroll }),
      setSyncNav: (syncNav) => set({ syncNav }),

      setBreakpoints: (values) =>
        set({
          breakpoints: Array.from(new Set(values.map((value) => Math.round(clamp(value, 200, 3840)))))
            .filter((value) => Number.isFinite(value))
            .sort((a, b) => a - b),
        }),

      addBreakpoint: (value) => {
        const { breakpoints } = get()
        if (breakpoints.length >= 12) {
          get().toast('Up to 12 breakpoints.', 'error')
          return
        }
        const rounded = Math.round(clamp(value, 200, 3840))
        if (breakpoints.includes(rounded)) {
          get().toast(`A ${rounded}px breakpoint already exists.`, 'info')
          return
        }
        get().setBreakpoints([...breakpoints, rounded])
      },

      removeBreakpoint: (value) =>
        set({ breakpoints: get().breakpoints.filter((item) => item !== value) }),

      updateBreakpoint: (index, value) =>
        set({
          breakpoints: get()
            .breakpoints.map((item, itemIndex) =>
              itemIndex === index ? Math.round(clamp(value, 200, 3840)) : item,
            )
            .sort((a, b) => a - b),
        }),

      setBreakpointHeight: (height) => set({ breakpointHeight: clamp(height, 320, 2000) }),

      addCustomDevice: (device) => {
        const preset: DevicePreset = {
          ...device,
          id: uid('custom'),
          name: device.name.trim().slice(0, 40) || 'Custom device',
          category: 'custom',
        }
        set({ customDevices: [...get().customDevices, preset] })
        return preset
      },

      removeCustomDevice: (id) =>
        set({ customDevices: get().customDevices.filter((device) => device.id !== id) }),

      recordRecent: (url) => {
        if (isInternalUrl(url)) return
        const entry: RecentEntry = { url, at: Date.now() }
        const recent = [entry, ...get().recent.filter((item) => item.url !== url)].slice(0, 12)
        set({ recent })
      },

      clearRecent: () => set({ recent: [] }),

      saveSession: (name) => {
        const state = get()
        const session: Session = {
          id: uid('ws'),
          name: name.trim().slice(0, 60) || `Workspace ${state.sessions.length + 1}`,
          createdAt: Date.now(),
          config: configFromState(state),
        }
        set({ sessions: [session, ...state.sessions].slice(0, 40) })
        get().toast(`Saved “${session.name}”.`, 'success')
      },

      loadSession: (id) => {
        const session = get().sessions.find((item) => item.id === id)
        if (!session) return
        get().applyConfig(session.config)
        get().toast(`Loaded “${session.name}”.`, 'success')
      },

      deleteSession: (id) =>
        set({ sessions: get().sessions.filter((session) => session.id !== id) }),

      applyConfig: (config) => {
        set({ ...sanitizeConfig(config), panel: null })
      },

      resetWorkspace: () => {
        set({
          url: defaultWorkspaceUrl(),
          previews: buildDefaultPreviews(),
          layout: 'grid',
          zoom: 0,
          focusId: null,
          mode: 'devices',
          panel: null,
        })
        get().toast('Workspace reset.', 'success')
      },

      setCapturePrefix: (capturePrefix) => set({ capturePrefix }),
      addCapture: (capture) => set({ captures: [capture, ...get().captures].slice(0, 24) }),
      removeCapture: (id) =>
        set({ captures: get().captures.filter((capture) => capture.id !== id) }),
      clearCaptures: () => set({ captures: [] }),

      toast: (message, kind = 'info', extra) => {
        const id = uid('toast')
        set({ toasts: [...get().toasts, { id, message, kind, ...extra }].slice(-4) })
        window.setTimeout(() => get().dismissToast(id), 4600)
      },

      dismissToast: (id) =>
        set({ toasts: get().toasts.filter((toast) => toast.id !== id) }),

      setPanel: (panel) => set({ panel }),
    }),
    {
      name: 'viewport.workspace.v1',
      version: 1,
      partialize: (state) => ({
        url: state.url,
        previews: state.previews,
        layout: state.layout,
        zoom: state.zoom,
        focusId: state.focusId,
        showFrames: state.showFrames,
        syncScroll: state.syncScroll,
        syncNav: state.syncNav,
        breakpoints: state.breakpoints,
        breakpointHeight: state.breakpointHeight,
        customDevices: state.customDevices,
        recent: state.recent,
        sessions: state.sessions,
        capturePrefix: state.capturePrefix,
      }),
    },
  ),
)
