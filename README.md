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
  HeroStory.jsx          the story beats
  HeroTextScene.jsx      one beat: fade + rise + blur-to-sharp
  HeroProgress.jsx       hairline progress on the right edge
  scenes.js              copy and scroll ranges
```

### Frames

`public/images/herosection/` holds the source and is **read-only** to this
project — nothing renames, moves or overwrites it.

`npm run hero:frames` re-encodes it into `public/hero-frames/`. What the
current source actually contains, measured rather than assumed:

| | |
| --- | --- |
| files | 1,800 (`frame_0001` … `frame_1800`), no numbering gaps |
| **unique images** | **240** — 1,560 files are byte-identical duplicates |
| dimensions | all 3840×2160, JPEG q95, sRGB, effectively 4:4:4 |
| defects | `frame_0024.jpg` is **0 bytes**; `grid_preview.jpg` is not a frame |

> **3840×2160 is the container, not the detail.** A 1:1 native-pixel crop of an
> eye shows eyelashes as soft blobs, an iris with no fibre structure and skin
> with no pore texture. A genuinely 4K-captured frame at q95 would also weigh
> 2–5 MB; these weigh 413–704 KB, because there is little high-frequency
> detail to encode. The frames are an upscale.

Two source defects the pipeline now handles rather than crashes on:
`grid_preview.jpg` has no digits in its name, so it sorted to index 0 and
silently became frame 0000 **and** the LCP poster — a black contact sheet at
the top of the hero. Non-sequence files are now excluded, and unreadable or
zero-byte frames are skipped with a warning.

| Tier | Width | Weight | Served to |
| --- | --- | --- | --- |
| `mobile/` | 1024px | 7.58 MB | viewport ≤ 768px, or 2G |
| `desktop/` | 1536px | 14.02 MB | `innerWidth × DPR` ≤ 1800 |
| `ultra/` | 2048px | 18.76 MB | wider |

> **Each tier is sharpened at its own delivery width, and that is the whole
> trick.** Shipping bigger frames makes the hero look *softer*. Measured
> delivered sharpness on a 1540px hero (Laplacian sd ×1000, frames
> 1/211/900/1800):
>
> | encoded at | delivered sharpness | KB/frame |
> | --- | --- | --- |
> | **1536** | **3.7 / 3.5 / 6.7 / 8.8** | 41 |
> | 1920 | 3.0 / 2.9 / 5.6 / 7.2 | 50 |
> | 3840 native | 2.4 / 2.3 / 4.3 / 5.5 | 114 |
>
> Unsharp masking enhances edges at the pixel scale it is applied to. Sharpen
> at 3840, then let the browser resample down to ~1540, and that enhancement is
> averaged straight back out.

**The enhancement chain** (`enhance()` in the build script) is three stages,
each scaled to the tier's own width:

1. **CLAHE** — contrast-limited adaptive histogram equalisation. This is what
   lifts micro-contrast in skin, iris and hair where a global curve cannot: it
   works per tile, and `maxSlope` caps amplification so flat areas stay clean.
2. **A tight unsharp pass** (small sigma) for genuine fine detail — lashes,
   brow hairs, pore structure.
3. **A wider unsharp pass** for edge definition and depth.

Measured across frames 1/211/900/1795 at delivery scale:

| chain | sharpness | extreme pixels (halo proxy) |
| --- | --- | --- |
| no enhancement | 21.8 | 0.27% |
| single unsharp | 41.5 | 0.39% |
| **CLAHE + dual unsharp** | **49.2** | **0.30%** |

It is ~19% sharper than a single unsharp pass *and* clips fewer pixels, so the
extra sharpness is not being bought with halos. Verified visually at 1:1 on the
eye and on cheek skin: lashes separate, iris edge resolves, skin gains pore
texture without turning plastic or gritty.

**On AI super-resolution.** Real-ESRGAN is not installed and is not a good fit
here: it needs PyTorch (~2 GB) with no CUDA available on Intel HD 4600, 4K CPU
inference runs minutes per frame (240 frames ≈ many hours) and would very
likely exhaust an 8 GB machine. More importantly it *invents* eyelashes, pores
and iris fibre that were never captured — which is explicitly ruled out. The
honest fix for more real detail is a re-export from a higher-resolution master.

### Scroll

The section is **700svh**. The inner panel is `sticky top-0`, so the viewport
holds still while the sequence plays, and About follows once the story ends.

`useScroll` gives raw progress; a `useSpring` sits between it and playback so a
coarse wheel notch (~100px) becomes continuous travel rather than a jump.

**Sub-frame interpolation is what removes the judder.** Snapping the playhead
with `Math.round()` means only 150 distinct images can ever appear, so playback
steps however smooth the input is. Instead the canvas holds the exact
fractional position and cross-fades the two frames either side of it — frame N
at full opacity, frame N+1 at the fraction.

Draws are coalesced to **one per animation frame**. React does not re-render at
all while scrolling: frames live in a ref, progress is a motion value, and the
canvas is written directly.

### Story

Beats are pinned to where the footage goes — the close-up, the studio, the
product rendering, the team shipping it — then a closing statement with the
calls to action.

Copy sits **bottom-left**, where this footage is consistently least busy.

**Legibility is tuned by measurement.** This sequence is a sunlit studio in
almost every frame, so white type needs a bed — but only just enough. An
earlier pass sat at 11–20:1 where AA asks for 4.5:1, which buried bright
footage under a wash of black. The scrims now land every tested device in the
**6.5–19:1** band, with the worst case on a 1280px laptop at 6.50:1.

### Measured performance

On the target machine (i5-4300M, 2 cores, Intel HD 4600, 8 GB), production
build, 1540×800:

| | |
| --- | --- |
| load event | 426 ms |
| first hero frame on canvas | 189 ms after load |
| rAF interval during a full scrub | median **16.7 ms** (vsync-locked), p95 34.7 ms, max 39.1 ms |
| frames over 25 ms | 23 of 244 (~9%) |
| JS heap | 5 MB |
| black / frozen frames across the sequence | 0 / 0 |
| canvas buffer | matches CSS size × DPR (1540×800 at DPR 1) — never a fixed low-res buffer |

> Measure without pixel readback. An early version of this benchmark called
> `getImageData` on the full canvas each step; that forces a GPU→CPU readback
> and allocates ~5 MB per call, which reported 53.6 ms median and 152 MB heap.
> Both numbers were the instrumentation, not the page.

**Loading strategy is chosen by measurement, not by rule of thumb.** A rolling
window is the textbook answer for long sequences, and above `PRELOAD_ALL_BELOW`
(400 frames) that is what runs. For *this* 240-frame sequence it measured
worse — 39.2 ms median and a 108.6 ms worst frame, because the window fetches
and decodes mid-scrub — against 16.7 ms when all frames are held. 240 frames is
~14 MB encoded and the browser evicts decoded bitmaps itself.

### Sharpness while scrolling

Cross-fading neighbouring frames is what makes the scrub read as motion rather
than stepping — but a partial blend is two exposures of a moving subject on
screen at once, which looks exactly like the image is out of focus. That is
fine in motion, when the eye cannot resolve detail anyway. It is not fine the
moment the user stops, which is precisely when they judge sharpness.

So blending is used **only while moving**. 110ms after the last scroll change
the canvas redraws snapped to the nearest whole frame. Verified by rendering
the candidate images in-page and comparing: the settled canvas matches a single
frame at **RMSE 0**, against 20–27 for a 50/50 blend.

The draw-time zoom is also held to 1.5% (it was 5%) — every extra percent is
another upscale applied to already-soft source.

### Mobile

Phones get their own profile, because the expensive thing on a handset is not
the tier width — it is `cover` on a tall viewport.

> A 16:9 frame filling a 9:19.5 screen is scaled until its HEIGHT matches, so
> on an iPhone 14 the 1024px frame was being drawn at **3029px wide — a 2.96x
> upscale — with only 26% of its width ever on screen.** That was both the
> softness and the cost: two such draws is 34.7ms on a throttled CPU before a
> single decode.

Four things follow from that:

- **The mobile tier is cropped to 3:4 before scaling.** A portrait phone now
  sees **60–75%** of the frame instead of 26%, the face is framed rather than
  cut off at both edges, and the delivered pixels land near 1:1 instead of
  being upscaled 3x. The centre crop also removes the watermark region outright.
- **Tier follows orientation, not device class.** A phone held sideways is
  852px wide and sails past any width test; it takes the 16:9 tier, because
  handing it the portrait crop would blow a 3:4 frame up to fill a 2.17 aspect
  viewport.
- **Canvas is budgeted by area, not just DPR** (1.2 Mpx on handsets). A DPR cap
  alone still let an iPad mini build a 1.9 Mpx buffer, which made it the
  slowest device tested.
- **Every second frame** (every third in landscape) and **no cross-fade.**
  Halves the bytes over cellular and the number of decodes; cross-fading
  doubles `drawImage` cost for a smoothing effect that matters least where
  frames are furthest apart.

Verified across 13 device profiles, portrait and landscape, DPR 2–4:

| | before | after |
| --- | --- | --- |
| rAF median, normal CPU | 16.7ms | **16.7ms** (vsync-locked) |
| rAF median, 4x CPU throttle | 107–200ms | **16.8–37.1ms** |
| payload | 12 MB | **5.5 MB** (6.5 MB landscape) |
| visible frame width (portrait) | 26% | **60–75%** |

No horizontal overflow, hero panel fits the viewport, text block fits
vertically, zero black frames and zero console errors on every profile;
contrast behind the copy 12.7–17.2:1.

> 4x throttling on the target i5-4300M is considerably harsher than a real
> mid-range phone — treat those numbers as a floor, not a forecast.

### Responsive

Type scales on **both axes**. Width alone is not enough: a phone in landscape
is 852px wide but only ~390px tall, and a width-only scale serves it
desktop-sized type in a viewport with no vertical room. `max-height` queries
pull the scale back, drop the body copy below 560px of height, and tighten the
padding.

The sticky panel carries **no `min-height`** — a fixed 560px floor is taller
than a landscape phone, which pushes the panel past the viewport and breaks the
sticky behaviour exactly where the scrub matters.

Verified across ten device profiles (320px phone through 2560px ultrawide,
portrait and landscape, DPR 1–3): no horizontal overflow, hero panel fits the
viewport, text block fits vertically, and white type clears AA on every one.

### Reduced motion

`prefers-reduced-motion` collapses the runway to auto height, drops the canvas,
keeps the poster, and renders every beat as a stacked, readable narrative.
**Zero** sequence frames are fetched. `Save-Data` gets the same treatment.

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
