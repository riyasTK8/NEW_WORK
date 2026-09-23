"use client";

import Image from "next/image";
import { m } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { EASE, VIEWPORT } from "@/lib/motion";
import { useMotionPreset, useWillChange } from "@/lib/useMotion";
import SectionHeading from "./SectionHeading";

import { PROJECTS } from "@/lib/projects";

function ProjectCard({ project, index }) {
  const preset = useMotionPreset();
  const willChange = useWillChange();

  const fromRight = index % 2 === 1;

  /*
   * Each card owns its observer. A single parent observer would resolve as
   * soon as the top of the list crossed the threshold and fire all three at
   * once -- cards two and three would finish animating far below the fold,
   * where nobody would see them.
   */
  const card = preset.reduce
    ? preset.fadeUp
    : {
        hidden: { opacity: 0, x: fromRight ? 56 : -56 },
        show: {
          opacity: 1,
          x: 0,
          transition: { duration: 0.6, ease: EASE, staggerChildren: 0.06, delayChildren: 0.15 },
        },
      };

  return (
    <m.article
      id={project.id}
      initial="hidden"
      whileInView="show"
      viewport={VIEWPORT}
      variants={card}
      /* Layer promotion for the duration of the slide only -- see useWillChange. */
      {...willChange}
      className="group grid items-center gap-8 rounded-card border border-line bg-surface/60 p-6 sm:p-8 lg:grid-cols-2 lg:gap-12"
    >
      <div
        className={`relative overflow-hidden rounded-xl border border-line/80 ${
          fromRight ? "lg:order-2" : ""
        }`}
      >
        <Image
          src={project.image}
          alt={project.alt}
          sizes="(min-width: 1024px) 45vw, (min-width: 640px) 90vw, 100vw"
          placeholder="blur"
          className="h-auto w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          /*
           * No `priority`: every project card sits below the fold, so these
           * stay on the native lazy loader and never compete with the hero
           * image for bandwidth during the initial load.
           */
        />
      </div>

      <div className={fromRight ? "lg:order-1" : ""}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-2">
            {project.kicker}
          </p>
          <span
            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
              project.href
                ? "border-emerald-600/30 bg-emerald-600/10 text-emerald-700"
                : "border-line bg-surface-2/80 text-muted"
            }`}
          >
            {project.status}
          </span>
        </div>

        <h3 className="mt-2.5 text-2xl font-semibold tracking-tight sm:text-3xl">
          {project.href ? (
            <a
              href={project.href}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-accent"
            >
              {project.name}
              <ArrowUpRight size={20} strokeWidth={2} aria-hidden="true" />
            </a>
          ) : (
            project.name
          )}
        </h3>

        <p className="mt-4 text-pretty text-sm leading-relaxed text-muted sm:text-base">
          {project.summary}
        </p>

        <p className="mt-5 inline-flex rounded-lg border border-accent/25 bg-accent/10 px-3 py-1.5 text-sm font-medium text-accent">
          {project.metric}
        </p>

        {/*
         * Pills inherit the card's stagger through MotionContext, so they
         * cascade after the slide lands without declaring a single delay of
         * their own. Five pills + one card = six concurrent nodes at most.
         */}
        <ul className="mt-6 flex list-none flex-wrap gap-2">
          {project.stack.map((tech) => (
            <m.li
              key={tech}
              variants={preset.fadeUpTight}
              className="rounded-full border border-line bg-surface-2/80 px-3 py-1 text-xs font-medium text-muted"
            >
              {tech}
            </m.li>
          ))}
        </ul>

        {/*
         * Descriptive link text rather than "read more" -- it tells both the
         * reader and a crawler what is on the other end.
         */}
        <a
          href="#contact"
          className="mt-7 inline-flex items-center gap-1.5 text-sm font-medium text-fg transition-colors hover:text-accent"
        >
          Discuss a build like {project.name}
          <ArrowUpRight size={16} strokeWidth={2} aria-hidden="true" />
        </a>
      </div>
    </m.article>
  );
}

export default function Projects() {
  return (
    <section id="projects" className="scroll-mt-20 border-t border-line/60 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="Case studies"
          title="Custom ERP, property and AI platforms, built end to end."
          lede="Three production systems designed, built and deployed with Next.js, Node.js and TypeScript — from microservices ERP and CRM architecture to AI-powered data visualisation. Every figure below is one the codebase can back up."
        />

        <div className="mt-14 flex flex-col gap-6">
          {PROJECTS.map((project, index) => (
            <ProjectCard key={project.name} project={project} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
