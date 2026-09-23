/**
 * The six story beats, pinned to where the footage actually goes.
 *
 * `at` is [fadeInStart, fullyIn, startFadeOut, fullyOut] as a fraction of the
 * hero's scroll. Values must be strictly increasing and stay within [0, 1].
 *
 * Frame mapping (150 frames):
 *   1-25    lone developer, dark room        -> Ideas
 *   25-48   code and holograms               -> Engineering
 *   48-72   developer + business, brain      -> Collaboration
 *   72-95   handshake on the data staircase  -> Innovation
 *   95-122  ascending the ecosystem          -> Growth
 *   122-150 the future city                  -> The future we build
 */
export const SCENES = [
  {
    id: "ideas",
    label: "Digital innovation",
    heading: "Ideas Start Everything.",
    body: "Every great solution begins with an idea.",
    at: [0, 0.015, 0.125, 0.17],
    lead: true, // renders the page's <h1>
  },
  {
    id: "engineering",
    label: "Engineering",
    heading: "We Turn Ideas Into Code.",
    body: "Thoughts become systems, products and technology.",
    at: [0.19, 0.235, 0.295, 0.335],
  },
  {
    id: "collaboration",
    label: "Collaboration",
    heading: "We Build Together.",
    body: "Your business knowledge and our technology expertise come together to create something meaningful.",
    at: [0.355, 0.4, 0.455, 0.495],
  },
  {
    id: "innovation",
    label: "Innovation",
    heading: "Code Becomes Innovation.",
    body: "Software transforms ideas into intelligent digital experiences.",
    at: [0.515, 0.56, 0.615, 0.655],
  },
  {
    id: "growth",
    label: "Growth",
    heading: "Technology Moves Business Forward.",
    body: "Connected systems help businesses operate, scale and grow.",
    at: [0.675, 0.72, 0.775, 0.815],
  },
  {
    id: "future",
    label: "The future we build",
    heading: "We Grow Together.",
    body: "From ideas to technology. From technology to growth.",
    at: [0.835, 0.885, 0.995, 1],
    cta: true, // the existing hero CTAs land here
  },
];
