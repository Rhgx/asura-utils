import { defineConfig } from "vite";
import monkey from "vite-plugin-monkey";

export default defineConfig({
  plugins: [
    monkey({
      entry: "src/main.js",
      userscript: {
        name: "Asura Utils",
        namespace: "http://tampermonkey.net/",
        description:
          "Reader enhancement with a single left dock, auto-scroll, image resizing, keyboard shortcuts, ad block, progress bar, layout customization, and UI cleanup.",
        author: "Rocks",
        match: ["https://asuracomic.net/*"],
        icon: "https://asuracomic.net/images/logo.webp",
        "run-at": "document-start",
        grant: ["GM_getValue", "GM_setValue"],
      },
      server: {
        open: true,
      },
      build: {
        fileName: "asura-utils.user.js",
        metaFileName: "asura-utils.meta.js",
        autoGrant: false,
      },
    }),
  ],
});
