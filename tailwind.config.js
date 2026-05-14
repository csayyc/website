module.exports = {
  content: ["./layouts/**/*.html", "./content/**/*.md", "./data/**/*.{yaml,yml,json}"],
  theme: {
    extend: {
      colors: {
        navy: "#1E4C73",
        sky: "#2D6395",
        orange: "#F27D42",
        offwhite: "#F7FAFC",
        surface: "#EDF3F8",
        charcoal: "#162938",
        "csa-slate": "#4A5568",
      },
      fontFamily: {
        sans: ["IBM Plex Sans", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["Playfair Display", "Georgia", "serif"],
      },
      boxShadow: {
        premium: "0 24px 60px -32px rgba(30, 76, 115, 0.42)",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
