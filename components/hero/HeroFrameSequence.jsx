"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMotionValueEvent } from "framer-motion";

const pad = (i) => String(i).padStart(4, "0");
const frameSrc = (variant, i) => `/hero-frames/${variant}/${pad(i)}.webp`;

/** Phones take the light tier regardless of DPR; bandwidth wins there. */
function pickVariant() {
  if (typeof window === "undefined") return "desktop";
  if (window.innerWidth <= 768) return "mobile";
  const conn = navigator.connection;
  if (conn && /^(slow-)?2g$/.test(conn.effectiveType || "")) return "mobile";
  return "desktop";
}

/**
 * The cinematic layer: one <canvas>, not 150 <img> nodes.
 *
 * `progress` is a MotionValue in [0, 1]. Nothing here is React state during
 * scroll -- frames live in a ref and draws are coalesced into one per
 * animation frame, so scrolling triggers zero re-renders.
 */
export default function HeroFrameSequence({ progress, frameCount, reduce }) {
  const canvasRef = useRef(null);
  const framesRef = useRef([]);
  const progressRef = useRef(0);
  const rafRef = useRef(0);
  const [ready, setReady] = useState(false);

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
    const exact = p * (frameCount - 1);
    let i0 = Math.floor(exact);
    if (i0 >= frameCount - 1) i0 = frameCount - 1;
    const blend = exact - i0;

    const pick = (idx) => {
      const hit = framesRef.current[idx];
      if (hit) return hit;
      // Stay scrubbable while frames are still streaming in.
      for (let d = 1; d < frameCount; d++) {
        const near = framesRef.current[idx - d] || framesRef.current[idx + d];
        if (near) return near;
      }
      return null;
    };

    const base = pick(i0);
    if (!base) return;
    const next = i0 + 1 < frameCount ? framesRef.current[i0 + 1] : null;

    const cw = canvas.width;
    const ch = canvas.height;

    /*
     * `cover`, computed by hand so the image is never stretched: fit to the
     * axis that leaves no gap, then centre the overflow. A very slight zoom
     * (1 -> 1.05) rides the scroll for depth -- done here rather than with a
     * CSS transform so it cannot fight the canvas backing-store size.
     */
    const zoom = 1 + p * 0.05;
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
  }, [frameCount]);

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
    schedule();
  });

  /* Size the backing store to the box, capped at 2x DPR to bound fill cost. */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { clientWidth: w, clientHeight: h } = canvas;
      if (!w || !h) return;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      draw();
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [draw]);

  /* Stream frames in order, a few at a time, so the first paint is not blocked. */
  useEffect(() => {
    if (reduce || frameCount === 0) return;
    if (navigator.connection?.saveData) return;

    const variant = pickVariant();
    let cancelled = false;
    let cursor = 0;
    let inflight = 0;
    const CONCURRENCY = 6;

    const pump = () => {
      while (!cancelled && inflight < CONCURRENCY && cursor < frameCount) {
        const i = cursor++;
        inflight++;
        const img = new Image();
        img.decoding = "async";
        img.onload = () => {
          inflight--;
          if (cancelled) return;
          framesRef.current[i] = img;
          if (i === 0) {
            setReady(true);
            draw();
          } else if (i % 8 === 0) {
            schedule();
          }
          pump();
        };
        img.onerror = () => {
          inflight--;
          if (!cancelled) pump();
        };
        img.src = frameSrc(variant, i);
      }
    };

    pump();
    return () => {
      cancelled = true;
      framesRef.current = [];
    };
  }, [draw, schedule, reduce, frameCount]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

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
