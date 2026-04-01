/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        chrome: {
          950: "#090c15",
          900: "#101523",
          850: "#151c2d",
          800: "#1e2639",
          700: "#30405e",
          200: "#dce6ff"
        },
        accent: {
          cyan: "#34d3ff",
          violet: "#8b5cf6",
          lime: "#9fe870",
          amber: "#f6b84e"
        }
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(52,211,255,0.18), 0 24px 70px rgba(14,20,35,0.45)",
        card: "0 18px 40px rgba(3, 8, 20, 0.28)"
      },
      backgroundImage: {
        "hero-grid":
          "radial-gradient(circle at top left, rgba(52,211,255,0.18), transparent 28%), radial-gradient(circle at top right, rgba(139,92,246,0.16), transparent 24%), linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0))"
      }
    }
  },
  plugins: []
};
