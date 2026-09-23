# NexViva — landing page

Next.js (App Router) · React · Framer Motion · Tailwind CSS v4 · Lucide + React Icons

```bash
npm install
npm run dev     # http://localhost:3000
npm run build && npm start
```

---

## Structure

| Path | Role |
| --- | --- |
| [app/page.jsx](app/page.jsx) | Composition. Hero eager, the four sections via `next/dynamic`. |
| [app/layout.jsx](app/layout.jsx) | Metadata, Inter via `next/font`, no-JS fallback. |
| [app/globals.css](app/globals.css) | Tailwind v4 `@theme` tokens, reduced-motion kill switch. |
| [lib/motion.js](lib/motion.js) | Every variant on the page. One source of truth. |
| [lib/useMotion.js](lib/useMotion.js) | `useMotionPreset()` (reduced motion), `useWillChange()`. |
| [components/MotionProvider.jsx](components/MotionProvider.jsx) | `LazyMotion` boundary. |
| [components/HeroSequence.jsx](components/HeroSequence.jsx) | Scroll-scrubbed frame sequence + the four text beats. |
| [components/](components/) | `About` · `Services` · `Projects` · `Contact` · header/footer. |
| [app/api/contact/route.js](app/api/contact/route.js) | Form intake. Validates; **does not send mail yet**. |

The hero is a scroll-scrubbed image sequence (see below). It is the one part
of the page that is expensive on purpose; everything under it stays on the
cheap path.

---

## The cinematic hero

A scroll-scrubbed frame sequence: scroll position *is* the playhead. No
autoplay, no timer, no carousel.

```
components/hero/
  HeroSection.jsx        tall container + sticky viewport, owns scroll progress
  HeroFrameSequence.jsx  <canvas> frame layer + streaming loader
  HeroStory.jsx          the six beats
  HeroTextScene.jsx      one beat: fade + rise + blur-to-sharp
  HeroProgress.jsx       hairline progress on the right edge
  scenes.js             copy and scroll ranges
```

### Frames

`public/images/herosection/` holds **150 source PNGs** and is read-only to this
project — nothing renames, moves or overwrites them.

`npm run hero:frames` re-encodes them for delivery into `public/hero-frames/`:

| Tier | Width | Weight | Served to |
| --- | --- | --- | --- |
| `desktop/` | 1280px | **5.61 MB** | viewport > 768px |
| `mobile/` | 768px | **2.85 MB** | viewport ≤ 768px, or 2G |
| `poster.webp` | 1600px | 24 KB | first paint, always |

> **Why the encode step is not optional.** The source frames total **143 MB** —
> PNG is a lossless archival format, not a delivery one. No browser can stream
> that for a hero. Re-encoding the same pixels at the same 1280×720 costs
> 5.6 MB, a 25× reduction with no change in resolution. Re-run the script
> whenever the source frames change; it rewrites `lib/hero-manifest.json`, which
> is where the frame count comes from, so the two can never drift.

The encode also strips the generator watermark — a static ~41×45 grey sparkle
at x1140–1180, y577–621 in the source. It sits ~100px in from both the right
and bottom edges, so cropping it away would cost far too much composition.
[lib/hero-inpaint.mjs](lib/hero-inpaint.mjs) instead rebuilds that rectangle
from the clean pixels on its four borders — the mark is never sampled — then
box-blurs out the interpolation streaks and feathers the edges back into the
original. It runs at full source resolution, before downscaling.

### Scroll

The section is **700svh** (150 frames over ~600vh of travel ≈ 36px of scroll per
frame, which reads as continuous motion). The inner panel is `sticky top-0`, so
the viewport holds still while the sequence plays, and About follows naturally
once the story ends.

`useScroll` gives raw progress; a `useSpring` sits between it and playback so a
coarse wheel notch (~100px) becomes continuous travel rather than a jump.

**Sub-frame interpolation is what actually removes the judder.** Snapping the
playhead with `Math.round()` means only 150 distinct images can ever appear, so
playback steps however smooth the input is. Instead the canvas holds the exact
fractional position and cross-fades the two frames either side of it — frame N
at full opacity, frame N+1 at the fraction — turning 150 stills into a
continuous blend. Verified: nudging by a fifth of one frame's travel changes
the canvas every time, and midpoints land monotonically between the two frames
rather than jumping at the halfway mark.

Draws are coalesced to **one per animation frame**. React does not re-render at
all while scrolling: frames live in a ref, progress is a motion value, and the
canvas is written directly.

### Rendering

One `<canvas>`, never 150 `<img>` nodes. `cover` is computed by hand so frames
are never stretched, with a slight 1→1.05 zoom riding the scroll. The backing
store is sized to the box at up to 2× DPR, and frames stream 6-at-a-time behind
the poster, scrubbing against whatever has arrived.

### Story

Six beats pinned to where the footage actually goes — lone developer, code,
collaboration, the handshake, the ascent, the city. Each fades up out of an 8px
blur, holds, and fades back out. The first is pinned visible at rest and the
last at the end; otherwise the hero would load with no text and the closing beat
would fade out exactly as you reached it.

Copy sits in the **left** negative space on desktop, where the footage keeps its
subjects centre and right. Portrait viewports crop this 16:9 footage to its
middle — which is where the subjects are — so on mobile the copy drops into the
lower third instead of sitting on someone's face.

The existing hero CTAs (`Start a project`, `See our work`) land on the final
beat. While that beat is invisible its links are pulled out of the tab order, so
keyboard focus never lands on a button nobody can see; the text itself stays in
the accessibility tree so the six beats read as a narrative.

> **Transformers are passed as functions, never as `(input, output)` arrays.**
> Given arrays, Framer Motion compiles the binding to a Web Animations API
> scroll-timeline animation and spreads the keyframes evenly across the timeline
> instead of honouring the declared stops. The scenes then cross-fade on a
> schedule nobody wrote, while the inline `style` still reads correctly — which
> makes it very hard to spot. See `ramp()` in [lib/motion.js](lib/motion.js).

### Reduced motion

`prefers-reduced-motion` collapses the runway to auto height, drops the canvas,
keeps the poster, and renders all six beats as a stacked, readable narrative.
**Zero** sequence frames are fetched — the whole 5.6 MB is skipped. `Save-Data`
gets the same treatment.

---

## Motion contract

Every entrance obeys the same three rules, enforced in [lib/motion.js](lib/motion.js):

**1. `initial` + `whileInView` + `viewport={{ once: true, amount: 0.2 }}`, everywhere.**
`VIEWPORT` is a shared constant, so `once: true` can't be forgotten on one
section. Nothing re-animates on scroll-back; a scroll pass over a finished
section costs zero animation work.

**2. Sequencing comes from `staggerChildren` on the parent.** No child carries a
`delay`, and — just as important — no child carries its own `whileInView`, which
would give it a private observer and destroy the parent's ordering.

**3. Reduced motion resolves to the final state, not to "disabled".** Simply
skipping the animation would strand 37 elements at `opacity: 0`. Verified: with
`prefers-reduced-motion: reduce`, all 30 animated nodes read `opacity: 1`
*before* any scroll.

### Where the observers live

| Section | Observers | Why |
| --- | --- | --- |
| About | 1 (the grid) | Cards sit side by side and enter the viewport together. |
| Services | 1 (the grid) | Same. |
| Projects | 3 (one per card) | **Deliberate.** The cards are full-width and tall. A single parent observer resolves as soon as the top of the list crosses the threshold, so cards 2 and 3 would finish animating far below the fold, where nobody sees them. |
| Contact | 1 | Form + the four channel links. |

Nesting (About's icons, Projects' tech pills) propagates through `MotionContext`,
which passes through plain DOM elements — so nested elements cost extra
*transform nodes* but **no extra observers**.

### Concurrent animated nodes

Capped at 6–8 per viewport:

- About — 1 heading + 3 cards + 3 icons = **7**
- Services — 1 heading + 4 cards = **5**
- Projects — 1 card + its 5 tech pills = **6** (cards enter one at a time)
- Contact — 1 heading + 1 form + 4 links = **6**

`SectionHeading` is one node on purpose: its eyebrow, title and lede are plain
elements carried by a single transform, leaving budget for the cards.

---

## Performance notes

**`LazyMotion` + `domAnimation` + `m`, not `motion`.** Loads the DOM feature set
(~15kb) instead of the full bundle (~34kb); everything here is opacity/transform,
so layout projection, drag and SVG path features are dead weight. The provider
uses `strict`, which *throws* if any descendant renders `motion.*` — so the
saving can't silently regress. Verified absent from the build:
`HTMLProjectionNode`, `layoutDependency`.

**Hover lift is split across two engines.** Framer Motion drives `scale`/`y`
(compositor, 60fps); the shadow and border ride a CSS transition. Animating
`box-shadow` through Framer would force a paint on every frame of the hover.

**`will-change` is applied, then released.** [`useWillChange()`](lib/useMotion.js)
promotes an element only while it is actually animating and drops it on
completion — a permanent `will-change` keeps a layer and its texture memory alive
for the life of the page. Used only on the three project cards (the heavy,
image-bearing nodes); Framer Motion handles the rest itself. Verified: all three
read `will-change: auto` once settled.

**No scroll listeners anywhere.** The sticky header's scrolled state uses an
`IntersectionObserver` on the header itself (`threshold: [1]`,
`rootMargin: "-1px 0 0 0"`) — it fires twice per page instead of ~600 times per
scroll, so there is nothing to debounce.

**Theme.** Light, driven entirely by the `@theme` tokens in
[app/globals.css](app/globals.css) — `ink` (page), `surface`/`surface-2`
(cards, inputs, pills), `line`, `fg`, `muted`, `accent`, `accent-2`. Components
reference tokens rather than literal colours, so the palette is one edit.

Every text style was measured on the rendered page (contrast computed from
rasterized pixels, because Tailwind v4 resolves colours to `oklab()` and
parsing the computed string gives nonsense). All 15 sampled styles clear WCAG
AA: accent 5.93:1, muted body 5.07:1, tech pill 4.55:1, white-on-accent button
5.93:1, headings 16.75–17.85:1. Placeholders sit lower by design and are
backed by a permanent visible label on every field.

**Icons are tree-shaken SVG components.** No icon font, no sprite request.
Verified: exactly 2 react-icons definitions in the bundle (the two brand marks)
and 11 lucide `viewBox`es — the ones actually imported.

> lucide-react v1 no longer ships brand icons, so GitHub/LinkedIn come from
> `react-icons/fa6`. Both packages are in `optimizePackageImports`.

**Images.** `next/image` with static imports, so each gets an automatic blur
placeholder and intrinsic dimensions (no CLS). The hero is the only `priority`
image — it is the LCP candidate and gets a `<link rel="preload">`. The three
project images stay lazy so nothing competes with it. AVIF/WebP are negotiated
via the `Accept` header.

### On `next/dynamic` — what it does and doesn't buy

The four below-fold sections are `next/dynamic`, **with SSR left on**. Be clear
about the tradeoff:

- ✅ Their JavaScript is split out of the initial bundle into separate chunks.
- ✅ Their copy is still in the server HTML — confirmed for all four sections.
- ❌ It does **not** defer *fetching* those chunks. With SSR on, React must
  hydrate that markup on load, so the chunks are still requested during the
  initial page load — just asynchronously, rather than bundled into the entry.

Real deferral needs `ssr: false` (or mount-on-visible), which keeps the copy out
of the HTML and costs the landing page its SEO plus a layout shift per section.
For a marketing page that trade isn't worth it. If you decide it is, flip
`ssr: false` in [app/page.jsx](app/page.jsx) and move the `dynamic()` calls into
a Client Component — `ssr: false` is not allowed in a Server Component.

---

## Verified in headless Chrome

- No hydration errors, no runtime exceptions, `strict` mode clean.
- All 30 animated nodes reach `opacity: 1` after one scroll pass; `hiddenNodes: 0`.
- Scroll back to top → `anyReHidden: 0`. `once: true` confirmed at runtime.
- `prefers-reduced-motion: reduce` → everything visible before any scroll.
- JavaScript disabled → all checked nodes visible via the `<noscript>` fallback.
- `#services` anchor settles 80px from the top under a 65px header.
- `/api/contact` returns 200 / 422 / 422 / 400 across its four paths.
- All 15 sampled text styles pass WCAG AA contrast on the light theme.
- Hero scrubs with scroll: canvas centre luminance tracks 20 → 222 across the
  section (dark studio → bright city), and each beat resolves at its range.
- Tier selection: 1540px → `desktop`, 390px → `mobile`. 150 frames requested.
- Sub-frame blending confirmed: 5/5 distinct canvases across a fifth-of-a-frame
  nudge; midpoints interpolate monotonically between adjacent frames.
- Watermark absent from every encoded frame; `public/images/herosection`
  unchanged at 150 files / 143 MB.
- **0** frames fetched under `prefers-reduced-motion`; all six beats readable.
- `npm run lint` clean, production build clean with no warnings.

---

## SEO

Configured for the landing page:

- **One keyword-bearing `<h1>`** (`sr-only`, in [HeroSection](components/hero/HeroSection.jsx)).
  The visible hero is a six-beat narrative — "Ideas Start Everything." is good
  storytelling and useless as a ranking signal, so the story headings are `<h2>`.
- **JSON-LD** ([components/StructuredData.jsx](components/StructuredData.jsx)):
  `ProfessionalService` + `WebSite` + an `ItemList` of the three case studies as
  `SoftwareApplication`. Server-rendered, and every claim in it is also visible
  on the page — schema that disagrees with the page is a manual-action risk.
- **Case-study copy** ([lib/projects.js](lib/projects.js)) is the single source
  for both the rendered section and the structured data, so they cannot drift.
- `app/sitemap.js`, `app/robots.js`, canonical URL, Open Graph and Twitter cards.
- Descriptive link text (`Discuss a build like XeroCare`, not "read more") and
  real image `alt` text.

> **Set `NEXT_PUBLIC_SITE_URL`** in the deploy environment. Canonical tags, OG
> URLs, the sitemap and the JSON-LD all read from [lib/site.js](lib/site.js),
> which falls back to `https://nexviva.dev`. If that is not the real domain,
> every canonical on the site points somewhere wrong.

After deploying: submit the sitemap in Google Search Console and run the three
case-study URLs through the Rich Results Test.

## Before shipping

1. **Wire the contact form.** [app/api/contact/route.js](app/api/contact/route.js)
   validates and `console.log`s. Add a transport (Resend, Postmark, SES) **and
   rate limiting** — an unthrottled public POST route is an invitation.
2. **Replace the case-study imagery.** `public/projects/*.webp` are generated
   mockups. Letsellr is live at letsellr.in — real screenshots of it and of
   XeroCare would be a large credibility and SEO gain over placeholder art.
3. **Move the hero source frames out of `public/`.** The 240 JPEGs in
   `public/images/herosection/` (7.7 MB) are the pipeline's input and are not
   referenced at runtime, but everything under `public/` is deployed. Move them
   to a non-served folder or delete them once you're happy with the output.
4. **Replace the placeholder contact details** in
   [components/Contact.jsx](components/Contact.jsx) and
   [components/SiteFooter.jsx](components/SiteFooter.jsx) — the phone number,
   email and social URLs are all fictional.
5. Project metrics in [components/Projects.jsx](components/Projects.jsx) are
   illustrative copy. Don't publish them as client results.
6. Set the real domain in `metadataBase` ([app/layout.jsx](app/layout.jsx)) and
   add an OG image.
# NEW_WORK
