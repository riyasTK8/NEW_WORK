"use client";

import { useEffect, useRef, useState } from "react";
import { Hexagon } from "lucide-react";

const LINKS = [
  { href: "#about", label: "About" },
  { href: "#services", label: "Services" },
  { href: "#projects", label: "Work" },
  { href: "#contact", label: "Contact" },
];

const HEADER_H = 64;

/**
 * `hasHero` is passed by the page rather than sniffed from the DOM, so the
 * first paint already knows whether the bar is sitting over the dark hero.
 * Deriving it inside an effect would mean a synchronous setState on mount --
 * a cascading render, and a visible flash of the wrong colour scheme.
 */
export default function SiteHeader({ hasHero = false }) {
  const headerRef = useRef(null);
  const [stuck, setStuck] = useState(false);
  const [onDark, setOnDark] = useState(hasHero);

  /*
   * Sticky-state detection without a scroll listener.
   *
   * A `scroll` handler fires on every frame of every scroll and has to be
   * debounced or rAF-throttled to stay honest. An IntersectionObserver on the
   * sticky element itself does the same job: with rootMargin pulled up by 1px,
   * the header stops fully intersecting the instant it sticks.
   */
  useEffect(() => {
    const el = headerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => setStuck(entry.intersectionRatio < 1),
      { threshold: [1], rootMargin: "-1px 0px 0px 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /*
   * The hero is a dark, full-bleed panel on an otherwise white page, so the
   * header has to invert while it sits over it. Pushing the root's top edge
   * down by the header height means the hero stops intersecting exactly when
   * its bottom clears the bar -- again, no scroll listener.
   */
  useEffect(() => {
    if (!hasHero || typeof IntersectionObserver === "undefined") return;
    const hero = document.getElementById("top");
    if (!hero) return;

    const observer = new IntersectionObserver(
      ([entry]) => setOnDark(entry.isIntersecting),
      { threshold: 0, rootMargin: `-${HEADER_H}px 0px 0px 0px` },
    );

    observer.observe(hero);
    return () => observer.disconnect();
  }, [hasHero]);

  /*
   * Over the hero the bar stays fully transparent with no backdrop-filter --
   * blurring a strip of the footage is exactly the artefact the hero is built
   * to avoid. The hero's top gradient keeps the white type readable.
   */
  const shell = onDark
    ? "border-transparent bg-transparent"
    : stuck
      ? "border-line/80 bg-ink/80 backdrop-blur-md"
      : "border-transparent bg-transparent";

  return (
    <header
      ref={headerRef}
      className={`sticky top-0 z-50 border-b transition-colors duration-300 ${shell}`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <a
          href="#top"
          className={`flex items-center gap-2.5 font-semibold tracking-tight transition-colors duration-300 ${
            onDark ? "text-white" : "text-fg"
          }`}
        >
          <span
            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors duration-300 ${
              onDark
                ? "border-white/25 bg-white/10 text-white"
                : "border-accent/30 bg-accent/10 text-accent"
            }`}
          >
            <Hexagon size={17} strokeWidth={2} aria-hidden="true" />
          </span>
          NexViva
        </a>

        <nav aria-label="Primary" className="hidden items-center gap-8 sm:flex">
          {LINKS.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className={`text-sm transition-colors duration-200 ${
                onDark
                  ? "text-white/75 hover:text-white"
                  : "text-muted hover:text-fg"
              }`}
            >
              {label}
            </a>
          ))}
        </nav>

        <a
          href="#contact"
          className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors duration-200 ${
            onDark
              ? "border-white/25 bg-white/10 text-white hover:bg-white/20"
              : "border-line bg-surface-2/70 text-fg hover:border-accent/40 hover:text-accent"
          }`}
        >
          Start a project
        </a>
      </div>
    </header>
  );
}
