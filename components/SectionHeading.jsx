"use client";

import { m } from "framer-motion";
import { VIEWPORT } from "@/lib/motion";
import { useMotionPreset } from "@/lib/useMotion";

/**
 * Section eyebrow + title + lede.
 *
 * Counts as ONE animated node: the children are variant-less plain elements
 * carried by the wrapper's single transform, which keeps each section's
 * concurrent node budget available for the cards that actually need it.
 */
export default function SectionHeading({ eyebrow, title, lede, align = "left" }) {
  const preset = useMotionPreset();

  return (
    <m.div
      initial="hidden"
      whileInView="show"
      viewport={VIEWPORT}
      variants={preset.fadeUp}
      className={
        align === "center"
          ? "mx-auto max-w-2xl text-center"
          : "max-w-2xl text-left"
      }
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
        {eyebrow}
      </p>
      <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h2>
      {lede ? (
        <p className="mt-4 text-pretty text-base leading-relaxed text-muted sm:text-lg">
          {lede}
        </p>
      ) : null}
    </m.div>
  );
}
