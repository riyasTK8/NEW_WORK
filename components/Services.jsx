"use client";

import { m } from "framer-motion";
import { Cloud, Code, Server, Sparkles } from "lucide-react";
import { VIEWPORT } from "@/lib/motion";
import { useMotionPreset } from "@/lib/useMotion";
import SectionHeading from "./SectionHeading";

const SERVICES = [
  {
    icon: Code,
    title: "Product engineering",
    body: "React and Next.js front ends with a real design system behind them — typed end to end, accessible by default, and fast on the phone your customers actually own.",
    stack: "Next.js · TypeScript · Tailwind",
  },
  {
    icon: Server,
    title: "APIs & data",
    body: "Schema design that survives its second year, services that fail predictably, and migrations you can run on a Tuesday afternoon without a war room.",
    stack: "Node · Go · PostgreSQL",
  },
  {
    icon: Cloud,
    title: "Cloud & platform",
    body: "Infrastructure as code, CI/CD that takes minutes instead of coffee breaks, and the observability to answer 'is it us?' before the customer asks.",
    stack: "AWS · Terraform · Kubernetes",
  },
  {
    icon: Sparkles,
    title: "AI integration",
    body: "Retrieval, agents and LLM features shipped with evals, latency budgets and a cost ceiling — so the demo survives contact with production traffic.",
    stack: "RAG · Evals · Streaming",
  },
];

/* Transform-only: the compositor handles it without a layout or paint pass. */
const HOVER = { scale: 1.05, y: -6 };
const HOVER_SPRING = { type: "spring", stiffness: 320, damping: 22, mass: 0.6 };

export default function Services() {
  const preset = useMotionPreset();

  return (
    <section id="services" className="scroll-mt-20 border-t border-line/60 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="Services"
          title="Four disciplines, one team that talks to itself."
          lede="Most delivery problems are handoff problems. We keep the interface, the service and the infrastructure under a single roof so the seams never become someone else's ticket."
        />

        <m.ul
          initial="hidden"
          whileInView="show"
          viewport={VIEWPORT}
          variants={preset.stagger(0.1)}
          className="mt-14 grid list-none gap-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          {SERVICES.map(({ icon: Icon, title, body, stack }) => (
            <m.li
              key={title}
              variants={preset.fadeUp}
              whileHover={preset.reduce ? undefined : HOVER}
              whileFocus={preset.reduce ? undefined : HOVER}
              transition={HOVER_SPRING}
              tabIndex={0}
              className="group relative rounded-card border border-line bg-surface/70 p-7 shadow-none outline-none transition-[box-shadow,border-color,background-color] duration-300 hover:z-10 hover:border-accent/40 hover:bg-surface-2/70 hover:shadow-xl hover:shadow-slate-900/10 focus-visible:z-10 focus-visible:border-accent/40 focus-visible:shadow-xl focus-visible:shadow-slate-900/10"
            >
              {/*
               * The lift is split across two engines on purpose: Framer Motion
               * drives scale/y (compositor, 60fps), while the shadow and border
               * ride a CSS transition. Animating box-shadow through Framer
               * would force a paint on every frame of the hover.
               */}
              <span className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-accent/25 bg-accent/10 text-accent transition-colors duration-300 group-hover:bg-accent/20">
                <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
              </span>

              <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-muted">{body}</p>

              <p /* Full-strength muted: at /80 this line fell to 3.38:1 on the card. */
                className="mt-5 border-t border-line/70 pt-4 text-xs font-medium tracking-wide text-muted">
                {stack}
              </p>
            </m.li>
          ))}
        </m.ul>
      </div>
    </section>
  );
}
