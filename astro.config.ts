import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import react from "@astrojs/react";
import remarkToc from "remark-toc";
import remarkCollapse from "remark-collapse";
import sitemap from "@astrojs/sitemap";
import { SITE } from "./src/config";

// https://astro.build/config
export default defineConfig({
  site: SITE.website,
  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
    react(),
    sitemap(),
  ],
  markdown: {
    remarkPlugins: [
      remarkToc,
      [
        remarkCollapse,
        {
          test: "Table of contents",
        },
      ],
    ],
    shikiConfig: {
      // For more themes, visit https://shiki.style/themes
      themes: { light: "min-light", dark: "night-owl" },
      wrap: true,
    },
  },
  redirects: {
    "2016/04/11/from-traditional-to-reactive":
      "/posts/from-traditional-to-reactive",
    "2016/04/13/composing-operations-in-swift":
      "/posts/composing-operations-in-swift",
    "2016/04/26/attaching-patches-to-pull-requests":
      "/posts/attaching-patches-to-pull-requests",
    "2017/03/24/diving-into-swift-compiler-performance":
      "/posts/diving-into-swift-compiler-performance",
    "2020/02/21/styling-react-native-with-css":
      "/posts/styling-react-native-with-css",
  },
  build: {
    assets: "assets",
  },
  vite: {
    optimizeDeps: {
      exclude: ["@resvg/resvg-js"],
    },
  },
  scopedStyleStrategy: "where",
});
