"use client";

import { m } from "framer-motion";
import { Lightbulb, Target, Users } from "lucide-react";
import { EASE, VIEWPORT } from "@/lib/motion";
import { useMotionPreset } from "@/lib/useMotion";
import SectionHeading from "./SectionHeading";

const VALUES = [
  {
    icon: Lightbulb,
    title: "Pragmatic invention",
    body: "We reach for the boring, proven piece first and save the clever one for the place it actually earns its keep. Novelty is a cost, not a feature.",
  },
  {
    icon: Target,
    title: "Outcomes over output",
    body: "We measure ourselves in shipped features, p95 latency and conversion lift — not in story points burned down or lines of code written.",
  },
  {
    icon: Users,
    title: "Embedded, not outsourced",
    body: "We work inside your repo, your standups and your on-call rotation. When we leave, your team owns every line and knows why it is there.",
  },
];

export default function About() {
  const preset = useMotionPreset();

  /*
   * Nested orchestration: the grid staggers the cards, and each card in turn
   * staggers its own icon. Nesting propagates through `variants` alone, so the
   * icons cost three extra transform nodes and zero extra IntersectionObservers.
   */
  const card = preset.reduce
    ? preset.fadeUp
    : {
        hidden: { opacity: 0, y: 24 },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.55, ease: EASE, staggerChildren: 0.08 },
        },
      };

  return (
    <section id="about" className="scroll-mt-20 border-t border-line/60 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="About NexViva"
          title="We build the whole stack, and we stay until it ships."
          lede="NexViva is a full-stack product studio for teams that need to move from a whiteboard to production traffic without assembling a department first. Schema, API, interface, pipeline — one team, one thread of accountability."
        />

        {/*
         * One observer for the whole grid. Timing lives here in
         * staggerChildren; the cards carry no delay of their own.
         */}
        <m.ul
          initial="hidden"
          whileInView="show"
          viewport={VIEWPORT}
          variants={preset.stagger(0.1)}
          className="mt-14 grid list-none gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {VALUES.map(({ icon: Icon, title, body }) => (
            <m.li
              key={title}
              variants={card}
              className="group rounded-card border border-line bg-surface/70 p-7 transition-colors duration-300 hover:border-accent/40"
            >
              <m.span
                variants={preset.fadeUpTight}
                className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-accent/25 bg-accent/10 text-accent"
              >
                {/* Tree-shaken SVG component -- no icon font, no sprite request. */}
                <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
              </m.span>

              <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-muted">{body}</p>
            </m.li>
          ))}
        </m.ul>
      </div>
    </section>
  );
}
