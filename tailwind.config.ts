import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        jura: {
          bg: "#181b20", // grafite profundo (aço escuro, não preto)
          panel: "#21252c", // superfície de seções
          card: "#262b33", // cards / boxes
          input: "#1b1f25", // campos de formulário
          border: "#353c46", // bordas
          line: "#434b57", // divisórias sutis
          red: "#d11f1f", // vermelho Jura (acento de marca)
          green: "#2ea043", // livre
          blue: "#3b82f6", // aguardando peça
          amber: "#e0a106", // alerta / lembrete
          ink: "#eef1f4", // texto principal
          muted: "#9aa3ad", // texto secundário
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.4), 0 6px 16px rgba(0,0,0,0.25)",
        strip: "inset 0 -1px 0 rgba(0,0,0,0.25)",
      },
      fontFamily: {
        display: ['"Barlow Condensed"', "Inter", "system-ui", "sans-serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ['"Roboto Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
