"use client";

import { useState } from "react";
import { m } from "framer-motion";
import { Mail, Phone, Send, LoaderCircle, Check } from "lucide-react";
// lucide-react v1 no longer ships brand marks; react-icons covers those two.
import { FaGithub, FaLinkedin } from "react-icons/fa6";
import { VIEWPORT } from "@/lib/motion";
import { useMotionPreset } from "@/lib/useMotion";
import SectionHeading from "./SectionHeading";

const CHANNELS = [
  { icon: Mail, label: "hello@nexviva.dev", href: "mailto:hello@nexviva.dev", name: "Email" },
  { icon: Phone, label: "+1 (415) 555-0134", href: "tel:+14155550134", name: "Phone" },
  { icon: FaLinkedin, label: "/company/nexviva", href: "https://www.linkedin.com/", name: "LinkedIn" },
  { icon: FaGithub, label: "github.com/nexviva", href: "https://github.com/", name: "GitHub" },
];

/*
 * White inputs on the tinted card, not the other way round: on a light theme a
 * field that is darker than its container reads as disabled. The placeholder
 * sits at 70% rather than 60% so it stays legible against the white fill.
 */
const FIELD =
  "w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-fg placeholder:text-muted/70 outline-none transition-colors duration-200 focus:border-accent/60 focus:ring-2 focus:ring-accent/15";

export default function Contact() {
  const preset = useMotionPreset();
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    if (status === "sending") return;

    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form));

    setStatus("sending");
    setError("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong. Try again?");

      form.reset();
      setStatus("sent");
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  }

  const sending = status === "sending";

  return (
    <section id="contact" className="scroll-mt-20 border-t border-line/60 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="Contact"
          title="Tell us what you're building."
          lede="A short description of the problem is plenty to start. We reply within one business day, usually with questions rather than a quote."
        />

        <m.div
          initial="hidden"
          whileInView="show"
          viewport={VIEWPORT}
          variants={preset.stagger(0.1)}
          className="mt-14 grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16"
        >
          {/* Form counts as a single animated node; the fields ride along. */}
          <m.form
            variants={preset.fadeUp}
            onSubmit={handleSubmit}
            noValidate={false}
            className="rounded-card border border-line bg-surface/70 p-6 sm:p-8"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <label htmlFor="name" className="mb-2 block text-xs font-medium text-muted">
                  Name
                </label>
                <input id="name" name="name" type="text" required autoComplete="name" placeholder="Ada Lovelace" className={FIELD} />
              </div>

              <div className="sm:col-span-1">
                <label htmlFor="email" className="mb-2 block text-xs font-medium text-muted">
                  Work email
                </label>
                <input id="email" name="email" type="email" required autoComplete="email" placeholder="ada@company.com" className={FIELD} />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="company" className="mb-2 block text-xs font-medium text-muted">
                  Company <span className="text-muted/60">(optional)</span>
                </label>
                <input id="company" name="company" type="text" autoComplete="organization" placeholder="Northwind Labs" className={FIELD} />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="message" className="mb-2 block text-xs font-medium text-muted">
                  What are you building?
                </label>
                <textarea id="message" name="message" required rows={5} minLength={10} placeholder="We have a React dashboard that falls over past ~50k rows..." className={`${FIELD} resize-y`} />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              {/*
               * Micro-interaction: tap compresses, hover lifts. Both are pure
               * transform, so the button stays on the compositor and the press
               * feels instant even mid-request.
               */}
              <m.button
                type="submit"
                disabled={sending}
                whileHover={preset.reduce || sending ? undefined : { scale: 1.03 }}
                whileTap={preset.reduce || sending ? undefined : { scale: 0.96 }}
                transition={{ type: "spring", stiffness: 420, damping: 24, mass: 0.5 }}
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-ink transition-opacity duration-200 disabled:opacity-70"
              >
                {sending ? (
                  <LoaderCircle size={16} strokeWidth={2.4} className="animate-spin" aria-hidden="true" />
                ) : status === "sent" ? (
                  <Check size={16} strokeWidth={2.4} aria-hidden="true" />
                ) : (
                  <Send size={16} strokeWidth={2.2} aria-hidden="true" />
                )}
                {sending ? "Sending..." : status === "sent" ? "Sent" : "Start the conversation"}
              </m.button>

              {/* aria-live so the outcome reaches screen readers, not just eyes. */}
              <p role="status" aria-live="polite" className="text-sm">
                {status === "sent" ? (
                  <span className="text-accent">Thanks &mdash; we&apos;ll be in touch within a business day.</span>
                ) : status === "error" ? (
                  <span className="text-rose-600">{error}</span>
                ) : null}
              </p>
            </div>
          </m.form>

          <div>
            <p className="text-sm leading-relaxed text-muted">
              Prefer something other than a form? Every one of these reaches us directly.
            </p>

            <ul className="mt-6 grid list-none gap-3">
              {CHANNELS.map(({ icon: Icon, label, href, name }) => (
                <m.li key={name} variants={preset.fadeUp}>
                  <a
                    href={href}
                    target={href.startsWith("http") ? "_blank" : undefined}
                    rel={href.startsWith("http") ? "noreferrer noopener" : undefined}
                    className="group flex items-center gap-3.5 rounded-xl border border-line bg-surface/70 px-4 py-3.5 transition-colors duration-300 hover:border-accent/40 hover:bg-surface-2/70"
                  >
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-accent/25 bg-accent/10 text-accent">
                      <Icon size={17} strokeWidth={1.9} aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs text-muted">{name}</span>
                      <span className="block truncate text-sm font-medium text-fg">{label}</span>
                    </span>
                  </a>
                </m.li>
              ))}
            </ul>
          </div>
        </m.div>
      </div>
    </section>
  );
}
