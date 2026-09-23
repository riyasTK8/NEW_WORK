import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

/*
 * Flat config. eslint-config-next 16 ships native flat configs, so this does
 * not need FlatCompat -- routing it through the compat layer throws on a
 * circular structure while formatting its own schema errors.
 */
const config = [
  { ignores: [".next/**", "node_modules/**", "public/**", "next-env.d.ts"] },
  ...nextCoreWebVitals,
  {
    rules: {
      /*
       * The hero paints 150 frames into a <canvas>, which next/image cannot
       * do, and its poster is a deliberate raw <img> so it renders before any
       * JavaScript executes.
       */
      "@next/next/no-img-element": "off",
    },
  },
];

export default config;
