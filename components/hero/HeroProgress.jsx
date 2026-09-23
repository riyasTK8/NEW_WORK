"use client";

import { useMemo } from "react";
import { m, useTransform } from "framer-motion";
import { ramp } from "@/lib/motion";

/**
 * A hairline on the right edge that fills as the story advances.
 *
 * Deliberately not a scrubber: no handle, no timestamps, nothing draggable.
 * It exists only to signal that the section responds to scrolling.
 */
export default function HeroProgress({ progress }) {
  const scaleY = useTransform(
    progress,
    useMemo(() => ramp([0, 1], [0, 1]), []),
  );

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute right-5 top-1/2 hidden h-40 w-px -translate-y-1/2 bg-white/15 sm:block lg:right-8 lg:h-56"
    >
      <m.div
        style={{ scaleY }}
        className="h-full w-full origin-top bg-gradient-to-b from-sky-300 to-white/80"
      />
    </div>
  );
}
