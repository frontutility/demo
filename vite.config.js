import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const csp = (development = false) => `default-src 'self'; base-uri 'self'; object-src 'none'; frame-src 'self' https://grownkt-c3e75.firebaseapp.com https://*.firebaseapp.com https://accounts.google.com; script-src 'self' ${development ? "'unsafe-inline' " : ""}https://www.gstatic.com https://apis.google.com; connect-src 'self' http://localhost http://127.0.0.1 ${development ? "ws://localhost:5173 " : ""}https://www.gstatic.com https://apis.google.com https://*.googleapis.com https://securetoken.googleapis.com https://identitytoolkit.googleapis.com; img-src 'self' http://localhost http://127.0.0.1 data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; form-action 'self'`;

export default defineConfig({
  plugins: [
    react(),
    {
      name: "connectnkt-csp-policy",
      transformIndexHtml(html, context) {
        return html.replace("__CSP_POLICY__", csp(Boolean(context.server)));
      },
    },
  ],
  server: {
    host: "localhost",
    allowedHosts: ['.monkeycode-ai.live'],
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
      "Content-Security-Policy": csp(true),
    },
    proxy: {
      "/api": {
        target: "http://localhost/connectnkt/backend",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
