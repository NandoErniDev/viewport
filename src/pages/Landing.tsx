import { useEffect, useRef, useState, type CSSProperties } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  Camera,
  Github,
  Globe,
  Keyboard,
  Layers,
  LayoutGrid,
  Monitor,
  Ruler,
  Share2,
  ShieldCheck,
} from 'lucide-react'
import { go } from '../lib/router'
import { cn, normalizeUrl } from '../lib/utils'
import { LogoMark, Wordmark } from '../components/ui'

interface StageDevice {
  key: string
  name: string
  width: number
  height: number
  slot: string
  cat: string
}

const STAGE_DEVICES: StageDevice[] = [
  { key: 'desktop', name: 'MacBook Air 13″', width: 1280, height: 832, slot: 'desktop', cat: 'Laptop' },
  { key: 'tablet', name: 'iPad Air 11″', width: 820, height: 1180, slot: 'tablet', cat: 'Tablet' },
  { key: 'phone', name: 'iPhone 16 Pro', width: 402, height: 874, slot: 'phone', cat: 'Phone' },
]

const FEATURES = [
  {
    icon: Globe,
    title: 'Real frames, not mockups',
    body: 'Every preview is a live browser frame at an exact CSS viewport size. Scroll it, click it, use it.',
  },
  {
    icon: Monitor,
    title: 'A library of real devices',
    body: 'Phones, tablets, laptops and desktops with accurate CSS dimensions and pixel ratios. Custom sizes included.',
  },
  {
    icon: LayoutGrid,
    title: 'Layouts that fit the work',
    body: 'Grid, columns, stack, focus or a freeform canvas. Move and resize previews when you want to think spatially.',
  },
  {
    icon: Ruler,
    title: 'Breakpoints in motion',
    body: 'Pin the widths you care about, then drag a slider and watch the layout reflow at 1px precision.',
  },
  {
    icon: Layers,
    title: 'Capture and compare',
    body: 'Screenshot any preview, overlay two captures, or highlight exactly which pixels moved.',
  },
  {
    icon: Share2,
    title: 'Share the exact setup',
    body: 'One link carries the URL, device list, dimensions, layout and zoom. No account, no upload.',
  },
]

const DEVICE_GROUPS = [
  {
    title: 'Phones',
    items: ['iPhone 16e · 390', 'iPhone 16 · 393', 'iPhone 16 Pro · 402', 'iPhone 16 Pro Max · 440', 'iPhone 17 Pro · 402', 'iPhone 17 Pro Max · 440', 'Small phone · 360', 'Large phone · 412'],
  },
  {
    title: 'Tablets',
    items: ['iPad mini · 744', 'iPad Air 11″ · 820', 'iPad Pro 11″ · 834', 'iPad Pro 13″ · 1032', 'Tablet · 768'],
  },
  {
    title: 'Laptops & desktop',
    items: ['MacBook Air 13″ · 1280', 'MacBook Pro 14″ · 1512', 'MacBook Pro 16″ · 1728', 'Laptop · 1366', '1280 × 720', '1440 × 900', '1920 × 1080', '2560 × 1440'],
  },
]

function StageFrame({ device, raised, onRaise }: { device: StageDevice; raised: boolean; onRaise: () => void }) {
  const slotRef = useRef<HTMLDivElement | null>(null)
  const [slot, setSlot] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const element = slotRef.current
    if (!element) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      setSlot({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  // Slots are measured from their grid track, so the frame can never force the
  // deck wider than its column (the iframe has a fixed intrinsic width).
  const scale = Math.max(
    0,
    Math.min(
      (slot.width - 12) / device.width || 0,
      (slot.height - 44) / device.height || 0,
      1,
    ),
  )

  return (
    <div className={cn('stage__slot', `stage__slot--${device.slot}`)} ref={slotRef}>
      <div
        className={cn('stage__device', raised && 'is-raised')}
        onMouseEnter={onRaise}
        role="group"
        aria-label={`${device.name} preview`}
      >
        <div
          className={cn('stage__bezier', device.key === 'phone' && 'stage__bezier--phone')}
          style={{ '--s': scale } as CSSProperties}
        >
          <div
            className="stage__screen"
            style={{ width: device.width * scale, height: device.height * scale }}
          >
            {scale > 0 ? (
              <iframe
                src="/demo/"
                title={`${device.name} sample preview`}
                tabIndex={-1}
                style={{ width: device.width, height: device.height, transform: `scale(${scale})` }}
              />
            ) : null}
          </div>
        </div>
      </div>
      <div className="stage__label">
        <span className="stage__dot" />
        {device.name}
        <span className="mono">
          {device.width}×{device.height}
        </span>
      </div>
    </div>
  )
}

export function Landing() {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [raised, setRaised] = useState('desktop')
  const inputRef = useRef<HTMLInputElement | null>(null)

  const launch = (raw?: string) => {
    const input = (raw ?? value).trim()
    if (!input) {
      go('/workspace')
      return
    }
    const result = normalizeUrl(input)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError(null)
    go(`/workspace?url=${encodeURIComponent(result.url)}`)
  }

  return (
    <div className="landing">
      <div className="landing__grid" aria-hidden="true" />

      <header className="lnav">
        <div className="lnav__inner">
          <a
            className="brand"
            href="/"
            onClick={(event) => {
              event.preventDefault()
              go('/')
            }}
          >
            <span className="brand__mark">
              <LogoMark size={17} />
            </span>
            <Wordmark />
          </a>

          <nav className="lnav__links" aria-label="Sections">
            <a href="#features">Features</a>
            <a href="#devices">Devices</a>
            <a href="#limits">Limits</a>
          </nav>

          <div className="lnav__actions">
            <a
              className="btn btn--ghost btn--sm"
              href="https://github.com/NandoErniDev/viewport"
              target="_blank"
              rel="noreferrer noopener"
            >
              <Github size={13} /> GitHub
            </a>
            <button type="button" className="btn btn--primary btn--sm" onClick={() => go('/workspace')}>
              Open workspace <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero__copy">
            <div className="eyebrow">
              <span className="eyebrow__dot" />
              Responsive testing studio
            </div>
            <h1 className="hero__title">
              Every screen.
              <span>One view.</span>
            </h1>
            <p className="hero__lede">
              Test your websites across devices, explore responsive layouts and compare screens —
              all from one workspace.
            </p>

            <form
              className={cn('hero__form', error && 'is-invalid')}
              onSubmit={(event) => {
                event.preventDefault()
                launch()
              }}
            >
              <div className="hero__field">
                <Globe size={15} strokeWidth={1.7} />
                <input
                  ref={inputRef}
                  value={value}
                  onChange={(event) => {
                    setValue(event.target.value)
                    setError(null)
                  }}
                  placeholder="example.com"
                  aria-label="Website to test"
                  spellCheck={false}
                  autoCapitalize="off"
                  autoComplete="url"
                />
                <span className="kbd hero__kbd">↵</span>
              </div>
              <button type="submit" className="btn btn--primary btn--lg">
                Test a site
              </button>
            </form>
            {error ? (
              <p className="hero__error" role="alert">
                {error}
              </p>
            ) : null}

            <div className="hero__meta">
              <button type="button" className="hero__sample" onClick={() => go('/workspace?url=%2Fdemo%2F')}>
                or open the sample site <ArrowUpRight size={12} />
              </button>
              <span className="hero__separator" aria-hidden="true" />
              <span className="hero__trust">
                <ShieldCheck size={12} /> No account. Nothing leaves your browser.
              </span>
            </div>
          </div>

          <div className="hero__visual" aria-label="Live responsive preview demonstration">
            <div className="stage">
              <div className="stage__head">
                <span className="badge badge--ok">
                  <span className="stage__live" /> Live frames
                </span>
                <span className="stage__hint">Scroll inside a preview</span>
              </div>
              <div className="stage__deck">
                {STAGE_DEVICES.map((device) => (
                  <StageFrame
                    key={device.key}
                    device={device}
                    raised={raised === device.key}
                    onRaise={() => setRaised(device.key)}
                  />
                ))}
              </div>
              <div className="stage__foot">
                <span className="mono">/demo/</span>
                <span className="stage__cats">Phone · Tablet · Laptop · same URL</span>
              </div>
            </div>
          </div>
        </section>

        <section className="marquee" aria-hidden="true">
          <div className="marquee__track">
            {[0, 1].map((copy) => (
              <div className="marquee__group" key={copy}>
                <span>Live previews</span>
                <span>Device library</span>
                <span>Breakpoint explorer</span>
                <span>Screen capture</span>
                <span>Visual diff</span>
                <span>Shareable workspace</span>
                <span>Keyboard first</span>
              </div>
            ))}
          </div>
        </section>

        <section className="section" id="features">
          <div className="section__head">
            <div>
              <div className="eyebrow">
                <span className="eyebrow__dot" />
                What it does
              </div>
              <h2>Built for the unglamorous part of shipping.</h2>
            </div>
            <p>
              Resizing a browser window only ever shows one screen at a time. VIEWPORT keeps every
              breakpoint visible and in sync while you work.
            </p>
          </div>

          <div className="features">
            {FEATURES.map((feature) => (
              <article className="feature" key={feature.title}>
                <span className="feature__icon">
                  <feature.icon size={16} strokeWidth={1.7} />
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section--split" id="devices">
          <div className="devices">
            <div className="devices__intro">
              <div className="eyebrow">
                <span className="eyebrow__dot" />
                Device support
              </div>
              <h2>Accurate CSS viewports. Not pictures of phones.</h2>
              <p>
                Device presets use the layout viewport the browser actually reports, so a 402px
                phone really renders at 402px. Pixel ratio is listed for reference and never
                stretched.
              </p>
              <ul className="devices__notes">
                <li>
                  <span className="mono">21</span> presets across four categories
                </li>
                <li>
                  <span className="mono">160–4096</span> px custom widths and heights
                </li>
                <li>
                  <Keyboard size={13} /> Portrait and landscape switching per preview
                </li>
              </ul>
              <button type="button" className="btn btn--outline" onClick={() => go('/workspace')}>
                Browse the library <ArrowRight size={13} />
              </button>
            </div>

            <div className="devices__groups">
              {DEVICE_GROUPS.map((group) => (
                <div className="device-group" key={group.title}>
                  <h3>{group.title}</h3>
                  <ul>
                    {group.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section section--limits" id="limits">
          <div className="limits">
            <div className="limits__icon">
              <ShieldCheck size={20} strokeWidth={1.6} />
            </div>
            <div>
              <h2>Honest about what a browser can do.</h2>
              <p>
                Some sites send <code>X-Frame-Options</code> or a CSP <code>frame-ancestors</code>{' '}
                rule that stops other domains embedding them. VIEWPORT tells you when that happens
                and offers a new tab — it never bypasses the policy or swaps in a screenshot. Scroll
                sync and visual diffing follow the same rule: real capability, clearly labelled.
              </p>
            </div>
            <div className="limits__facts">
              <div>
                <Camera size={14} strokeWidth={1.8} /> Screenshots from your display
              </div>
              <div>
                <Layers size={14} strokeWidth={1.8} /> Diff from real captures
              </div>
              <div>
                <ShieldCheck size={14} strokeWidth={1.8} /> Nothing uploaded
              </div>
            </div>
          </div>
        </section>

        <section className="section section--cta">
          <div className="cta">
            <div>
              <h2>Start with a URL.</h2>
              <p>Everything else — devices, layouts, comparison — is one workspace away.</p>
            </div>
            <form
              className="cta__form"
              onSubmit={(event) => {
                event.preventDefault()
                launch()
              }}
            >
              <input
                className="input input--mono"
                value={value}
                onChange={(event) => {
                  setValue(event.target.value)
                  setError(null)
                }}
                placeholder="your-site.com"
                aria-label="Website to test"
                spellCheck={false}
              />
              <button type="submit" className="btn btn--primary">
                Open <ArrowRight size={13} />
              </button>
            </form>
          </div>
        </section>
      </main>

      <footer className="lfooter">
        <div className="lfooter__inner">
          <div className="lfooter__brand">
            <span className="brand__mark">
              <LogoMark size={16} />
            </span>
            <div>
              <Wordmark />
              <p>Every screen. One view.</p>
            </div>
          </div>

          <div className="lfooter__links">
            <a href="https://github.com/NandoErniDev/viewport" target="_blank" rel="noreferrer noopener">
              GitHub
            </a>
            <a href="#features">Features</a>
            <a href="#devices">Devices</a>
            <button type="button" onClick={() => inputRef.current?.focus()}>
              Test a site
            </button>
          </div>

          <p className="lfooter__note">
            A responsive testing studio for people who ship interfaces. Independent project — not
            affiliated with any device manufacturer.
          </p>
        </div>
      </footer>
    </div>
  )
}
