"use client";

import { useMemo, useRef } from "react";
import { m, useMotionValueEvent, useTransform } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { ramp } from "@/lib/motion";

/**
 * One story beat. Fades up out of a soft blur, holds for its scroll range,
 * then fades back out before the next beat arrives.
 *
 * Sits in the left third of the frame: the footage keeps its subjects centre
 * and right throughout, so this is the negative space.
 */
export default function HeroTextScene({ scene, progress, reduce }) {
  const ctaRef = useRef(null);
  const { at, label, heading, body, cta } = scene;

  /*
   * A scene anchored to the very start of the scroll must already be on
   * screen at rest, and one anchored to the very end must stay on screen
   * there -- otherwise the hero loads with no text at all, and the closing
   * beat fades out just as the user reaches it.
   */
  const head = at[0] <= 0 ? 1 : 0;
  const tail = at[3] >= 1 ? 1 : 0;

  const opacity = useTransform(
    progress,
    useMemo(
      () => (reduce ? () => 1 : ramp(at, [head, 1, 1, tail])),
      [at, reduce, head, tail],
    ),
  );
  const y = useTransform(
    progress,
    useMemo(
      () => (reduce ? () => 0 : ramp(at, [head ? 0 : 28, 0, 0, tail ? 0 : -20])),
      [at, reduce, head, tail],
    ),
  );
  const filter = useTransform(
    progress,
    useMemo(
      () =>
        reduce
          ? () => "blur(0px)"
          : (v) =>
              `blur(${ramp(at, [head ? 0 : 8, 0, 0, tail ? 0 : 5])(v).toFixed(2)}px)`,
      [at, reduce, head, tail],
    ),
  );

  /*
   * Keep the final scene's links out of the tab order while that scene is
   * invisible -- otherwise keyboard focus lands on a button nobody can see.
   * Driven straight off the motion value so it costs no React re-render.
   * The text itself stays in the accessibility tree: the six scenes read as a
   * narrative for anyone who is not scrolling through them.
   */
  useMotionValueEvent(opacity, "change", (v) => {
    const el = ctaRef.current;
    if (!el) return;
    const on = v > 0.5;
    el.style.pointerEvents = on ? "auto" : "none";
    for (const a of el.querySelectorAll("a")) a.tabIndex = on ? 0 : -1;
  });

  /*
   * Bottom-left, with the closing beat centred.
   *
   * Type scales on BOTH axes. Width alone is not enough: a phone in landscape
   * is 844px wide but only ~390px tall, so a width-only scale would serve it
   * desktop-sized type in a viewport with no vertical room. The
   * max-height queries pull the scale back on short viewports, which is what
   * keeps this working on landscape phones and small laptops.
   */
  const anchor = cta
    ? "items-end justify-center text-center"
    : "items-end justify-start";

  return (
    <m.div
      data-scene={scene.id}
      style={{ opacity, y, filter }}
      className={
        reduce
          ? "relative z-10 w-full"
          : `pointer-events-none absolute inset-0 z-10 flex ${anchor}`
      }
    >
      <div
        className={`w-full px-5 pb-12 sm:px-8 sm:pb-16 md:px-10 lg:px-14 xl:pl-20 2xl:pl-28
          [@media(max-height:560px)]:pb-6 [@media(max-height:700px)]:pb-8
          ${cta ? "max-w-2xl" : "max-w-[34rem] md:max-w-xl lg:max-w-2xl"}`}
      >
        {label ? (
          <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.26em] text-sky-200 sm:mb-4 sm:text-xs">
            {label}
          </p>
        ) : null}

        {heading ? (
          <h2
            className="text-balance font-semibold leading-[1.08] tracking-tight text-white
              text-[1.75rem] sm:text-4xl md:text-5xl lg:text-[3.25rem] 2xl:text-6xl
              [@media(max-height:560px)]:text-2xl [@media(max-height:700px)]:text-3xl
              [@media(max-height:700px)_and_(min-width:1024px)]:text-4xl"
          >
            {heading}
          </h2>
        ) : null}

        {body ? (
          <p
            className="mt-3 max-w-lg text-pretty leading-relaxed text-white/90
              text-sm sm:mt-5 sm:text-base lg:text-lg
              [@media(max-height:640px)]:mt-2 [@media(max-height:640px)]:text-sm
              [@media(max-height:560px)]:hidden"
          >
            {body}
          </p>
        ) : null}

        {cta ? (
          <div
            ref={ctaRef}
            style={{ pointerEvents: reduce ? "auto" : "none" }}
            className="mt-6 flex flex-wrap items-center justify-center gap-2.5 sm:mt-8 sm:gap-3 [@media(max-height:560px)]:mt-4"
          >
            <a
              href="#contact"
              tabIndex={reduce ? 0 : -1}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#05070e] shadow-lg shadow-black/40 transition-transform duration-200 hover:scale-[1.03] sm:px-6 sm:py-3.5"
            >
              Start a project
              <ArrowRight size={16} strokeWidth={2.2} aria-hidden="true" />
            </a>
            <a
              href="#projects"
              tabIndex={reduce ? 0 : -1}
              className="inline-flex items-center gap-2 rounded-xl border border-white/40 bg-black/60 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-black/40 transition-colors duration-200 hover:bg-black/75 sm:px-6 sm:py-3.5"
            >
              See our work
            </a>
          </div>
        ) : null}
      </div>
    </m.div>
  );
}
