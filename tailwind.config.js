/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        accent: {
          DEFAULT: '#00d4aa',
          dark: '#00d4aa',
          light: '#00886a',
        },
        secondary: {
          DEFAULT: '#f0a030',
          dark: '#f0a030',
          light: '#c07820',
        },
      },
    },
  },
  plugins: [],
};
