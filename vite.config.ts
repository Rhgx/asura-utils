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
          "A cleaner way to read on Asura Scans with auto-scroll, reader dock, themes, reading history, keyboard shortcuts, ad blocking, and layout controls.",
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
