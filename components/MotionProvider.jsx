"use client";

import { LazyMotion, domAnimation } from "framer-motion";

/**
 * Loads only the DOM animation feature set (~15kb) instead of the full
 * `motion` bundle (~34kb). Everything on this page is opacity/transform work,
 * so layout projection, drag and SVG path features are dead weight.
 *
 * `strict` makes the saving enforceable: it throws if any descendant renders a
 * `motion.*` component, which would silently pull the full bundle back in.
 * Every animated element on this page is therefore an `m.*`.
 */
export default function MotionProvider({ children }) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  );
}
