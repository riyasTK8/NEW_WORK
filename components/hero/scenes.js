/**
 * The story beats, pinned to where this footage actually goes.
 *
 * `at` is [fadeInStart, fullyIn, startFadeOut, fullyOut] as a fraction of the
 * hero's scroll. Values must be strictly increasing and stay within [0, 1].
 *
 * Footage map (600 files -> 240 unique frames, sampled to 150):
 *   0.00-0.17  close-up, eyes to camera            -> Vision
 *   0.22-0.44  bright studio, concept on screen    -> Design
 *   0.49-0.70  the product rendering in the room   -> Build
 *   0.74-0.88  the team shipping it together       -> Deliver
 *   0.90-1.00  closing statement + calls to action
 */
export const SCENES = [
  {
    id: "vision",
    label: "Vision",
    heading: "It Starts With Seeing It.",
    body: "Every product begins as a clear picture of what ought to exist — and a reason it does not yet.",
    at: [0, 0.012, 0.13, 0.17],
  },
  {
    id: "design",
    label: "Design",
    heading: "We Shape What You Imagine.",
    body: "Interfaces, flows and data models drawn out before a line of code is written.",
    at: [0.22, 0.265, 0.4, 0.445],
  },
  {
    id: "build",
    label: "Engineering",
    heading: "We Turn Ideas Into Code.",
    body: "Architecture, APIs and interfaces — typed end to end and built to hold up under real traffic.",
    at: [0.49, 0.535, 0.66, 0.705],
  },
  {
    id: "deliver",
    label: "Delivery",
    heading: "We Ship It Together.",
    body: "Your team and ours in the same repository, the same standups and the same release.",
    at: [0.745, 0.785, 0.845, 0.885],
  },
  {
    id: "start",
    label: "NexViva",
    heading: "From Ideas to Impact.",
    cta: true,
    at: [0.905, 0.945, 0.99, 1],
  },
];
