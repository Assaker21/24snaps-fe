import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Hostnames the dev server will answer to. local.sawwerna.com is what a phone on
    // the LAN (and Google's OAuth redirect, which refuses a bare IP over http) uses.
    allowedHosts: ["local.sawwerna.com", "sawwerna.com", "beta.sawwerna.com"],
  },
});
