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
  const { at, label, heading, body, lead, cta } = scene;

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

  const Heading = "h2";

  return (
    <m.div
      style={{ opacity, y, filter }}
      className={`${
        reduce
          ? "relative z-10 w-full"
          : "pointer-events-none absolute inset-0 z-10 flex items-end sm:items-center"
      }`}
    >
      {/*
       * Portrait viewports crop this 16:9 footage down to its middle, which is
       * exactly where the subjects are -- so on mobile the copy drops into the
       * lower third rather than sitting on someone's face. From `sm` up there
       * is real negative space on the left, and the copy moves into it.
       */}
      <div className="w-full max-w-2xl px-6 pb-20 sm:px-10 sm:pb-0 lg:px-16 xl:pl-24">
        <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-300 sm:text-xs">
          {label}
        </p>

        <Heading className="text-balance text-3xl font-semibold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
          {heading}
        </Heading>

        <p className="mt-5 max-w-lg text-pretty text-base leading-relaxed text-white/80 sm:text-lg">
          {body}
        </p>

        {cta ? (
          <div
            ref={ctaRef}
            style={{ pointerEvents: reduce ? "auto" : "none" }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <a
              href="#contact"
              tabIndex={reduce ? 0 : -1}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-[#05070e] shadow-lg shadow-black/40 transition-transform duration-200 hover:scale-[1.03]"
            >
              Start a project
              <ArrowRight size={16} strokeWidth={2.2} aria-hidden="true" />
            </a>
            <a
              href="#projects"
              tabIndex={reduce ? 0 : -1}
              className="inline-flex items-center gap-2 rounded-xl border border-white/40 bg-black/50 px-6 py-3.5 text-sm font-medium text-white shadow-lg shadow-black/40 transition-colors duration-200 hover:bg-black/70"
            >
              See our work
            </a>
          </div>
        ) : null}
      </div>
    </m.div>
  );
}
