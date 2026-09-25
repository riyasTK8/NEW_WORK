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
        /*
         * No min-height. A fixed 560px floor is taller than a landscape phone
         * (~390px), which pushes the panel past the viewport and breaks the
         * sticky behaviour exactly where the scrub matters most. h-svh already
         * tracks the visible viewport on mobile browsers.
         */
        className={`relative overflow-hidden ${
          reduce ? "" : "sticky top-0 h-svh"
        }`}
      >
        <HeroFrameSequence
          progress={progress}
          frameCount={frameCount}
          reduce={reduce}
        />

        {/*
         * Legibility for white type over BRIGHT footage.
         *
         * The previous sequence was near-black and a light scrim sufficed.
         * This one is a sunlit studio in almost every frame, so the copy needs
         * a bed or it disappears. But only just enough: an earlier pass sat at
         * 11-20:1 where 4.5:1 is the requirement, which buried a sunlit studio
         * under a wash of black. These are tuned to land in the 6-9:1 band --
         * comfortably legible, with the footage still visibly bright.
         */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[64%] bg-gradient-to-t from-[#05070e] via-[#05070e]/55 to-transparent sm:h-[58%] sm:via-[#05070e]/42"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 hidden w-2/3 bg-gradient-to-r from-[#05070e]/70 via-[#05070e]/18 to-transparent sm:block lg:w-1/2"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/75 to-transparent sm:h-28"
        />

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
