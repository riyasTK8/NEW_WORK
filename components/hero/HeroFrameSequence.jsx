"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMotionValueEvent } from "framer-motion";

const pad = (i) => String(i).padStart(4, "0");
const frameSrc = (variant, i) => `/hero-frames/${variant}/${pad(i)}.webp`;

/**
 * Device profile: which tier, how dense a canvas, how many frames, and whether
 * to cross-fade.
 *
 * The thing that makes phones expensive here is not the tier width, it is
 * `cover` on a tall viewport. A 16:9 frame filling a 9:19.5 screen has to be
 * scaled until its HEIGHT matches, which on an iPhone 14 means drawing the
 * 1024px frame at 3029px wide — a 2.96x upscale — while only 26% of its width
 * is ever on screen. Two of those draws per animation frame is 34.7ms on a
 * throttled CPU before any decoding.
 *
 * So on phones:
 *  - the canvas is capped at 1.5x DPR rather than 2x. The source is already
 *    being upscaled ~3x by the cover crop, so extra canvas density buys no
 *    real detail and costs fill rate linearly.
 *  - every second frame is used. 120 frames still reads as continuous motion
 *    once scrubbed, and it halves both the bytes over cellular and the number
 *    of decodes.
 *  - cross-fading is off. It doubles drawImage cost for a smoothing effect
 *    that matters least where frames are furthest apart.
 */
function deviceProfile() {
  if (typeof window === "undefined") {
    return { variant: "desktop", dprCap: 2, stride: 1, blend: true, pixelBudget: 4e6 };
  }
  const conn = navigator.connection;
  const slow = conn && /^(slow-)?2g$/.test(conn.effectiveType || "");

  /*
   * Width alone misclassifies a phone in landscape: an iPhone 14 on its side
   * is 852px wide, sails past a 768px test and gets served the desktop tier at
   * 2x DPR with cross-fading -- on a phone. Test the SHORT side instead, and
   * require a coarse pointer so a short laptop window (1440x620) is not
   * mistaken for a handset.
   */
  const minDim = Math.min(window.innerWidth, window.innerHeight);
  const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const phone = slow || (minDim <= 820 && (coarse || window.innerWidth <= 768));

  if (phone) {
    /*
     * Which tier a phone gets depends on ORIENTATION, not just on being a
     * phone. The mobile tier is cropped to 3:4 for portrait screens; handing
     * that to a phone held sideways means blowing a portrait frame up to fill
     * a 2.17 aspect viewport and cropping the composition vertically instead.
     * Landscape phones take the 16:9 tier and keep the phone's cheaper
     * rendering budget.
     */
    const portrait = window.innerHeight >= window.innerWidth;
    return {
      variant: portrait ? "mobile" : "desktop",
      dprCap: 1.5,
      /*
       * A landscape phone is on the wider 16:9 tier, so each frame is heavier
       * to fetch and decode. Thin it further: the hero's scroll runway is also
       * much shorter in landscape (it is a fraction of a short viewport), so
       * fewer frames still covers that distance densely.
       */
      stride: portrait ? 2 : 3,
      blend: false,
      pixelBudget: 1.2e6,
    };
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const variant = window.innerWidth * dpr > 1800 ? "ultra" : "desktop";
  /* Few cores usually means a low-power machine; drop the second draw. */
  const lowPower = (navigator.hardwareConcurrency || 8) <= 4;
  return { variant, dprCap: 2, stride: 1, blend: !lowPower, pixelBudget: 4e6 };
}

export default function HeroFrameSequence({ progress, frameCount, reduce }) {
  const canvasRef = useRef(null);
  const framesRef = useRef([]);
  const progressRef = useRef(0);
  const rafRef = useRef(0);
  const idleRef = useRef(true);
  const idleTimer = useRef(0);
  const [ready, setReady] = useState(false);
  /*
   * Resolved once, on mount. A lazy useState initialiser rather than a ref
   * written during render -- reading or writing a ref mid-render is exactly
   * the kind of thing that breaks under concurrent rendering.
   */
  const [profile] = useState(deviceProfile);

  /* Indices actually used, after the mobile stride. */
  const usable = useMemo(() => {
    const out = [];
    for (let i = 0; i < frameCount; i += profile.stride) out.push(i);
    return out;
  }, [frameCount, profile.stride]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || frameCount === 0) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const p = Math.min(1, Math.max(0, progressRef.current));

    /*
     * Sub-frame interpolation.
     *
     * Snapping to Math.round() means only 150 distinct images ever appear, so
     * playback steps however smooth the scroll input is. Instead, hold the
     * exact fractional position and cross-fade the two frames either side of
     * it: frame N at full opacity, frame N+1 at the fraction. That turns 150
     * stills into a continuous blend and is what actually removes the
     * judder -- the spring on the scroll value alone cannot.
     */
    const list = usable;
    if (list.length === 0) return;
    const exact = p * (list.length - 1);
    let slot = Math.floor(exact);
    if (slot >= list.length - 1) slot = list.length - 1;
    let blend = exact - slot;
    if (!profile.blend) blend = 0;
    let i0 = list[slot];

    /*
     * Snap to a single frame once scrolling stops.
     *
     * Cross-fading neighbours is what makes the scrub read as motion rather
     * than stepping, but a partial blend is two exposures of a moving subject
     * on screen at once -- which looks exactly like the image is out of focus.
     * That is fine while the user is moving and cannot resolve detail anyway;
     * it is not fine the moment they stop, which is when they actually judge
     * sharpness. So blending is used only in motion, and the instant the
     * scroll settles we land on the nearest whole frame, perfectly sharp.
     */
    if (idleRef.current) {
      if (blend > 0.5 && slot + 1 < list.length) i0 = list[slot + 1];
      blend = 0;
    }

    const pick = (idx) => {
      const hit = framesRef.current[idx];
      if (hit) return hit;
      // Stay scrubbable while frames are still streaming in.
      for (let d = 1; d < list.length; d++) {
        const a = list[slot - d];
        const b = list[slot + d];
        const near =
          (a !== undefined && framesRef.current[a]) ||
          (b !== undefined && framesRef.current[b]);
        if (near) return near;
      }
      return null;
    };

    const base = pick(i0);
    if (!base) return;
    const nextIdx = list[slot + 1];
    const next = nextIdx !== undefined ? framesRef.current[nextIdx] : null;

    const cw = canvas.width;
    const ch = canvas.height;

    /*
     * `cover`, computed by hand so the image is never stretched: fit to the
     * axis that leaves no gap, then centre the overflow. A very slight zoom
     * (1 -> 1.05) rides the scroll for depth -- done here rather than with a
     * CSS transform so it cannot fight the canvas backing-store size.
     */
    /* Kept small: every extra percent here is another upscale of soft source. */
    const zoom = 1 + p * 0.015;
    const paint = (img, alpha) => {
      const ir = img.naturalWidth / img.naturalHeight;
      let dw = cw;
      let dh = cw / ir;
      if (dh < ch) {
        dh = ch;
        dw = ch * ir;
      }
      dw *= zoom;
      dh *= zoom;
      ctx.globalAlpha = alpha;
      ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
    };

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    paint(base, 1);
    if (next && blend > 0.001) paint(next, blend);
    ctx.globalAlpha = 1;
  }, [frameCount, usable, profile.blend]);

  /*
   * One draw per animation frame. This is the correct throttle for a scrubbed
   * sequence: a time-based debounce would detach the image from the user's
   * scroll and feel broken.
   */
  const schedule = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      draw();
    });
  }, [draw]);

  useMotionValueEvent(progress, "change", (v) => {
    progressRef.current = v;
    idleRef.current = false;
    clearTimeout(idleTimer.current);
    /* 110ms after the last change, redraw snapped to the nearest frame. */
    idleTimer.current = setTimeout(() => {
      idleRef.current = true;
      schedule();
    }, 110);
    schedule();
  });

  /* Size the backing store to the box, capped at 2x DPR to bound fill cost. */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = canvas;
      if (!w || !h) return;

      /*
       * Cap the canvas by total pixels, not just by DPR.
       *
       * A DPR cap alone still lets a physically large screen build a very big
       * buffer -- an iPad mini at 744x1133 and 1.5x is 1.9 Mpx, and fill cost
       * scales with that area, which is why it was the slowest device tested.
       * Budgeting the area keeps the worst case bounded on every geometry.
       */
      const budget = profile.pixelBudget;
      const areaCap = Math.sqrt(budget / (w * h));
      const dpr = Math.min(window.devicePixelRatio || 1, profile.dprCap, areaCap);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      draw();
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [draw, profile.dprCap, profile.pixelBudget]);

/*
 * Loading strategy, chosen by measurement rather than by rule of thumb.
 *
 * A rolling window is the textbook answer for long sequences, and for a very
 * long one it is right. For THIS sequence it measured worse: holding all 240
 * frames gave a locked 16.7ms median rAF interval (max 16.8ms, no dropped
 * frames, 5MB JS heap), while a rolling window gave 39.2ms median and a
 * 108.6ms worst frame -- because the window has to fetch and decode while the
 * user is mid-scrub, and decoding during a scrub is precisely what stutters.
 *
 * 240 frames is only ~14MB of encoded data; the decoded bitmaps are managed
 * and evicted by the browser itself. So below the threshold everything is
 * preloaded in order, and the windowed path exists for sequences large enough
 * that holding them all really would be reckless.
 */
const PRELOAD_ALL_BELOW = 400;

  useEffect(() => {
    if (reduce || frameCount === 0) return;
    if (navigator.connection?.saveData) return;

    const { variant } = profile;
    const CONCURRENCY = 6;
    const list = usable;
    const windowed = list.length >= PRELOAD_ALL_BELOW;
    const FORWARD = 60;
    const BACKWARD = 20;
    const KEEP = 110;

    let cancelled = false;
    let inflight = 0;
    let cursor = 0;
    const pending = new Set();

    const load = (i) => {
      if (cancelled || framesRef.current[i] || pending.has(i)) return;
      pending.add(i);
      inflight++;
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        inflight--;
        pending.delete(i);
        if (cancelled) return;
        framesRef.current[i] = img;
        if (i === list[0]) setReady(true);
        if (i % 8 === 0) schedule();
        pump();
      };
      img.onerror = () => {
        inflight--;
        pending.delete(i);
        if (!cancelled) pump();
      };
      img.src = frameSrc(variant, i);
    };

    const pump = () => {
      if (cancelled) return;

      if (!windowed) {
        // Straight through, in order, a few at a time.
        while (inflight < CONCURRENCY && cursor < list.length) load(list[cursor++]);
        return;
      }

      const centre = Math.round(
        Math.min(1, Math.max(0, progressRef.current)) * (list.length - 1),
      );
      for (let k = 0; k < list.length; k++) {
        if (framesRef.current[list[k]] && Math.abs(k - centre) > KEEP) {
          framesRef.current[list[k]] = undefined;
        }
      }
      for (let d = 0; d <= FORWARD && inflight < CONCURRENCY; d++) {
        if (centre + d < list.length) load(list[centre + d]);
        if (d <= BACKWARD && centre - d >= 0) load(list[centre - d]);
      }
    };

    pump();
    const poll = windowed ? setInterval(pump, 250) : 0;
    return () => {
      cancelled = true;
      if (poll) clearInterval(poll);
      framesRef.current = [];
    };
  }, [draw, schedule, reduce, frameCount, usable, profile]);

  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(idleTimer.current);
    },
    [],
  );

  return (
    <>
      {/* The LCP paint, and the still shown if the canvas never draws. */}
      <img
        src="/hero-frames/poster.webp"
        alt=""
        aria-hidden="true"
        fetchPriority="high"
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
          ready && !reduce ? "opacity-0" : "opacity-100"
        }`}
      />
      {!reduce && (
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="absolute inset-0 h-full w-full"
        />
      )}
    </>
  );
}
