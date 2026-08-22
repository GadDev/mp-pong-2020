import { defineConfig } from "vite";

export default defineConfig({
  // GitHub Pages serves this from a project subpath
  // (https://gaddev.github.io/mp-pong-2020/), so assets must resolve
  // relative to it. Hardcoded rather than derived from an env var so a
  // local `npm run build` produces a byte-identical artifact to CI —
  // `npm run dev` / `preview` just serve under the same subpath locally.
  base: "/mp-pong-2020/",
});
