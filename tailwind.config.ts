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
          red: "#C8102E", // vermelho Jura (Brand Book v1.1)
          redDark: "#8E1120", // vermelho escuro (hover/gradiente)
          green: "#2ea043", // livre
          wa: "#25D366", // verde WhatsApp (Brand Book)
          blue: "#3b82f6", // aguardando peça
          amber: "#e0a106", // alerta / lembrete (TV)
          gold: "#FFC400", // amarelo da marca (Brand Book)
          ink: "#eef1f4", // texto principal
          paper: "#F5F5F5", // off-white da marca
          muted: "#9aa3ad", // texto secundário
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.4), 0 6px 16px rgba(0,0,0,0.25)",
        strip: "inset 0 -1px 0 rgba(0,0,0,0.25)",
      },
      fontFamily: {
        // TV (painel) continua com as fontes originais
        display: ['"Barlow Condensed"', "Inter", "system-ui", "sans-serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ['"Roboto Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
        // Identidade nova (Brand Book v1.1) — telas de gestão
        title: ['"Bebas Neue"', '"Barlow Condensed"', "sans-serif"],
        anton: ["Anton", '"Bebas Neue"', "sans-serif"],
        btn: ["Montserrat", "Inter", "sans-serif"],
        price: ["Montserrat", "Inter", "sans-serif"],
        body: ["Poppins", "Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
