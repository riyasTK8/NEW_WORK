import dynamic from "next/dynamic";
import HeroSection from "@/components/hero/HeroSection";
import MotionProvider from "@/components/MotionProvider";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { getHeroFrameCount } from "@/lib/heroFrames";

/*
 * Below-the-fold sections are split into their own client chunks.
 *
 * SSR stays ON deliberately. Gating these behind `ssr: false` would keep the
 * copy out of the initial HTML, costing the landing page its SEO and adding a
 * layout shift as each section pops in. This still splits the JS.
 */
const Placeholder = ({ height }) => (
  <div aria-hidden="true" style={{ minHeight: height }} />
);

const About = dynamic(() => import("@/components/About"), {
  loading: () => <Placeholder height="60vh" />,
});
const Services = dynamic(() => import("@/components/Services"), {
  loading: () => <Placeholder height="60vh" />,
});
const Projects = dynamic(() => import("@/components/Projects"), {
  loading: () => <Placeholder height="80vh" />,
});
const Contact = dynamic(() => import("@/components/Contact"), {
  loading: () => <Placeholder height="60vh" />,
});

export default function Page() {
  /* Read off disk at build time so the frame count can never drift. */
  const frameCount = getHeroFrameCount();

  return (
    <>
      <SiteHeader hasHero />

      {/* One LazyMotion boundary for the page; `m.*` throws without it. */}
      <MotionProvider>
        <main>
          <HeroSection frameCount={frameCount} />
          <About />
          <Services />
          <Projects />
          <Contact />
        </main>
      </MotionProvider>

      <SiteFooter />
    </>
  );
}
