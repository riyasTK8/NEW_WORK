"use client";

import { useRef } from "react";
import { useReducedMotion, useScroll, useSpring } from "framer-motion";
import HeroFrameSequence from "./HeroFrameSequence";
import HeroStory from "./HeroStory";
import HeroProgress from "./HeroProgress";

/**
 * Scroll-scrubbed cinematic hero.
 *
 *   [ tall scroll container ]
 *     [ sticky viewport ]
 *       [ frame layer (canvas) ]
 *       [ legibility gradients ]
 *       [ story overlay ]
 *       [ progress hairline ]
 *
 * Scroll position drives the sequence -- there is no autoplay and no timer.
 */
export default function HeroSection({ frameCount }) {
  const sectionRef = useRef(null);
  const reduce = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  /*
   * A light spring between scroll and playback. Raw scroll arrives in coarse
   * jumps (a wheel notch is ~100px), which lands the sequence on visibly
   * separated frames; the spring interpolates across them so playback reads
   * as motion rather than stepping. Kept stiff enough that the image never
   * feels like it is lagging behind the user's finger.
   */
  const progress = useSpring(scrollYProgress, {
    stiffness: 170,
    damping: 34,
    mass: 0.3,
    restDelta: 0.00005,
  });

  return (
    <section
      id="top"
      ref={sectionRef}
      /*
       * 150 frames over ~600vh of travel is ~36px of scroll per frame, which
       * reads as continuous motion without making the section a chore.
       * -mt-16 pulls it behind the sticky header; without it the header's
       * white type would sit on the white page background at scroll 0.
       */
      className="relative -mt-16 bg-[#05070e]"
      style={{ height: reduce ? "auto" : "700svh" }}
    >
      <div
        data-hero-panel=""
        className={`relative overflow-hidden ${
          reduce ? "" : "sticky top-0 h-svh min-h-[560px]"
        }`}
      >
        <HeroFrameSequence
          progress={progress}
          frameCount={frameCount}
          reduce={reduce}
        />

        {/*
         * Legibility only where the type sits. The footage opens near-black
         * and ends on a bright sky, so the left column needs a bed that holds
         * across both -- but it stays a gradient, never a panel, and the
         * right two-thirds of the frame are left alone.
         */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#05070e]/85 via-[#05070e]/45 to-transparent lg:via-[#05070e]/25"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/70 to-transparent"
        />
        {/* Taller on mobile, where the copy sits in the lower third. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-[#05070e] via-[#05070e]/70 to-transparent sm:h-32 sm:via-transparent sm:from-[#05070e]/80"
        />

        {/*
         * The page's one <h1>.
         *
         * The visible hero copy is a six-beat narrative — "Ideas Start
         * Everything." is good storytelling and useless as a ranking signal.
         * This states plainly what the business does, stays in the
         * accessibility tree, and leaves the narrative headings as <h2>.
         */}
        <h1 className="sr-only">
          NexViva — full-stack web and software development studio. Custom ERP
          and CRM platforms, property management systems and AI-powered tools,
          built end to end with Next.js, Node.js, TypeScript and PostgreSQL.
        </h1>

        <HeroStory progress={progress} reduce={reduce} />

        {!reduce && <HeroProgress progress={progress} />}
      </div>
    </section>
  );
}
