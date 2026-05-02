import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Agora você pode usar classes como 'bg-brand' ou 'text-brand'
        brand: {
          50: '#ecfdf5',
          400: '#34d399',
          500: '#10b981', // Este é o nosso verde principal
          600: '#059669', // Versão um pouco mais escura para o hover dos botões
        },
      },
    },
  },
  plugins: [],
};
export default config;