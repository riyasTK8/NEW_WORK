import manifest from "./hero-manifest.json";

/**
 * Frame count for the hero sequence.
 *
 * `lib/hero-manifest.json` is written by `npm run hero:frames`, so the count
 * can never drift from what is actually encoded in public/hero-frames. A
 * static import keeps this out of the runtime entirely.
 */
export function getHeroFrameCount() {
  return Number(manifest?.count) || 0;
}
