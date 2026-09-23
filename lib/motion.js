/**
 * Shared motion contract for the whole page.
 *
 * Two rules everything here enforces:
 *
 * 1. Entrances are viewport-triggered and run EXACTLY ONCE. `VIEWPORT` is
 *    spread into every `whileInView` so no element re-animates when the user
 *    scrolls back up. On mobile this is the single biggest win: a scroll pass
 *    over a finished section costs zero animation work.
 *
 * 2. Sequencing comes from `staggerChildren` on the parent. Children declare a
 *    variant and nothing else -- no per-child `delay`, and critically no
 *    per-child `whileInView`, which would make each child fire on its own
 *    observer and destroy the parent's ordering.
 */

/** easeOutExpo-ish: fast out of the gate, long settle. Reads as "expensive". */
export const EASE = [0.22, 1, 0.36, 1];

/**
 * amount: 0.2 -> fire when 20% of the element is visible, so the animation is
 * already underway by the time the element is comfortably in frame.
 */
export const VIEWPORT = { once: true, amount: 0.2 };

/** Looser trigger for tall sections that would otherwise start late. */
export const VIEWPORT_TALL = { once: true, amount: 0.15 };

/**
 * Parent orchestrator. Holds no visual state of its own -- it exists purely to
 * time its children. `delayChildren` lets the section heading land first.
 */
export const stagger = (staggerChildren = 0.1, delayChildren = 0.05) => ({
  hidden: {},
  show: { transition: { staggerChildren, delayChildren } },
});

export const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};

/** Slightly shorter travel for small elements like tag pills and icons. */
export const fadeUpTight = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
};

export const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.5, ease: EASE } },
};

/** Alternating case-study entrances. dir: -1 from the left, 1 from the right. */
export const slideInX = (dir = -1) => ({
  hidden: { opacity: 0, x: 56 * dir },
  show: { opacity: 1, x: 0, transition: { duration: 0.6, ease: EASE } },
});

/**
 * Reduced-motion counterparts. The elements must still end up visible, so these
 * resolve to the final state instead of being disabled -- disabling the
 * animation alone would leave everything stuck at opacity 0.
 */
export const still = {
  hidden: { opacity: 1, x: 0, y: 0 },
  show: { opacity: 1, x: 0, y: 0, transition: { duration: 0 } },
};

export const stillParent = {
  hidden: {},
  show: { transition: { staggerChildren: 0, delayChildren: 0 } },
};

/**
 * Piecewise-linear interpolation across arbitrary stops, as a FUNCTION.
 *
 * Always pass transformers to `useTransform` as functions rather than as
 * (input, output) array pairs. Given arrays, Framer Motion compiles the
 * binding to a Web Animations API scroll-timeline animation and spreads the
 * keyframes evenly across the timeline instead of honouring the stops -- the
 * element then animates on a schedule nobody wrote, while its inline `style`
 * still reads correctly, which makes it very hard to spot. A function cannot
 * be expressed as WAAPI keyframes, so Framer drives it on its own frameloop.
 */
export const ramp = (stops, outputs) => (v) => {
  if (v <= stops[0]) return outputs[0];
  const last = stops.length - 1;
  if (v >= stops[last]) return outputs[last];
  for (let i = 1; i <= last; i++) {
    if (v <= stops[i]) {
      const span = stops[i] - stops[i - 1];
      const t = span === 0 ? 1 : (v - stops[i - 1]) / span;
      return outputs[i - 1] + t * (outputs[i] - outputs[i - 1]);
    }
  }
  return outputs[last];
};
