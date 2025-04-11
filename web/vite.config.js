import { defineConfig } from "vite";
// import vue from "@vitejs/plugin-vue"
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
      },
    },
  },
  plugins: [viteSingleFile()],
});
