"use client";

import { useCallback, useMemo, useState } from "react";
import { useReducedMotion } from "framer-motion";
import {
  fadeIn,
  fadeUp,
  fadeUpTight,
  slideInX,
  stagger,
  still,
  stillParent,
} from "./motion";

/**
 * Returns the page's variants, collapsed to their final state when the user has
 * asked for reduced motion. Sections consume this instead of importing variants
 * directly so the preference is honoured in one place rather than four.
 */
export function useMotionPreset() {
  const reduce = useReducedMotion();

  return useMemo(() => {
    if (reduce) {
      return {
        reduce: true,
        stagger: () => stillParent,
        fadeUp: still,
        fadeUpTight: still,
        fadeIn: still,
        slideInX: () => still,
      };
    }
    return {
      reduce: false,
      stagger,
      fadeUp,
      fadeUpTight,
      fadeIn,
      slideInX,
    };
  }, [reduce]);
}

/**
 * Promotes an element to its own compositor layer for the duration of a
 * transform animation and drops it the moment the animation settles.
 *
 * A permanently applied `will-change: transform` keeps a layer (and its texture
 * memory) alive for the life of the page, which is exactly the kind of thing
 * that degrades low-end mobile. Framer Motion already does this for values it
 * animates itself; use this hook only for the heavier nodes -- large cards
 * carrying an image -- where the promotion measurably matters.
 *
 * Spread onto an `m.*` element: {...willChange}
 */
export function useWillChange() {
  const [animating, setAnimating] = useState(false);

  const onAnimationStart = useCallback(() => setAnimating(true), []);
  const onAnimationComplete = useCallback(() => setAnimating(false), []);

  return useMemo(
    () => ({
      onAnimationStart,
      onAnimationComplete,
      style: { willChange: animating ? "transform, opacity" : "auto" },
    }),
    [animating, onAnimationStart, onAnimationComplete],
  );
}
