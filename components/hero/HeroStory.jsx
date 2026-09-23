"use client";

import { SCENES } from "./scenes";
import HeroTextScene from "./HeroTextScene";

/** The six story beats, stacked and cross-faded by scroll position. */
export default function HeroStory({ progress, reduce }) {
  return (
    <div
      className={
        reduce
          ? "relative z-10 flex flex-col gap-16 py-20"
          : "pointer-events-none absolute inset-0 z-10"
      }
    >
      {SCENES.map((scene) => (
        <HeroTextScene
          key={scene.id}
          scene={scene}
          progress={progress}
          reduce={reduce}
        />
      ))}
    </div>
  );
}
