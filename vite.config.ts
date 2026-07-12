import { defineConfig } from "vite";
import monkey from "vite-plugin-monkey";

const latestReleaseAssetUrl =
  "https://github.com/Rhgx/asura-utils/releases/latest/download";

export default defineConfig({
  plugins: [
    monkey({
      entry: "src/main.ts",
      userscript: {
        name: "Asura Utils",
        namespace: "http://tampermonkey.net/",
        description:
          "Reader enhancement with a single left dock, auto-scroll, image resizing, keyboard shortcuts, ad block, progress bar, layout customization, and UI cleanup.",
        author: "Rocks",
        match: ["https://asurascans.com/*"],
        icon: "https://asurascans.com/images/logo.webp",
        updateURL: `${latestReleaseAssetUrl}/asura-utils.meta.js`,
        downloadURL: `${latestReleaseAssetUrl}/asura-utils.user.js`,
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
