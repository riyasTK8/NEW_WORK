import { Mail } from "lucide-react";
import { FaGithub, FaLinkedin } from "react-icons/fa6";

const SOCIALS = [
  { icon: FaLinkedin, href: "https://www.linkedin.com/", label: "NexViva on LinkedIn" },
  { icon: FaGithub, href: "https://github.com/", label: "NexViva on GitHub" },
  { icon: Mail, href: "mailto:hello@nexviva.dev", label: "Email NexViva" },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-line/60 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 px-6 sm:flex-row">
        <p className="text-sm text-muted">
          © {new Date().getFullYear()} NexViva. Built end to end.
        </p>

        <ul className="flex list-none items-center gap-2">
          {SOCIALS.map(({ icon: Icon, href, label }) => (
            <li key={label}>
              <a
                href={href}
                aria-label={label}
                target={href.startsWith("http") ? "_blank" : undefined}
                rel={href.startsWith("http") ? "noreferrer noopener" : undefined}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line text-muted transition-colors duration-200 hover:border-accent/40 hover:text-accent"
              >
                <Icon size={16} strokeWidth={1.9} aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
