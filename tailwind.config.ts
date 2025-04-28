import type { Config } from "tailwindcss";
import type { PluginAPI } from "tailwindcss/types/config";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "scale-up": {
          "0%": { transform: "scale(0)", opacity: "0" },
          "50%": { transform: "scale(1.5)", opacity: "1" },
          "100%": { transform: "scale(1) translateY(-20px)", opacity: "0" }
        },
        "float-heart": {
          "0%": { transform: "scale(0) translateY(0)", opacity: "0" },
          "15%": { transform: "scale(1.8) translateY(0)", opacity: "1" },
          "30%": { transform: "scale(1) translateY(0)", opacity: "1" },
          "100%": { transform: "scale(1) translateY(-150px)", opacity: "0" }
        },
        "instagram-heart": {
          "0%": { transform: "scale(0)", opacity: "0", filter: "blur(0px)" },
          "15%": { transform: "scale(1.8)", opacity: "0.9", filter: "blur(0px)" },
          "25%": { transform: "scale(1)", opacity: "1", filter: "blur(0px)" },
          "50%": { transform: "scale(1.1)", opacity: "1", filter: "blur(0px)" },
          "80%": { transform: "scale(1)", opacity: "0.9", filter: "blur(0px)" },
          "100%": { transform: "scale(1)", opacity: "0", filter: "blur(1px)" }
        },
        "heart-pulse": {
          "0%": { transform: "scale(1)", opacity: "0.5" },
          "50%": { transform: "scale(1.15)", opacity: "0.2" },
          "100%": { transform: "scale(1)", opacity: "0" }
        },
        "double-click-hint": {
          "0%": { transform: "scale(1)", opacity: "0" },
          "20%": { transform: "scale(1.2)", opacity: "0.5" },
          "40%": { transform: "scale(0.9)", opacity: "0.3" },
          "60%": { transform: "scale(1.2)", opacity: "0.5" },
          "80%": { transform: "scale(0.9)", opacity: "0.3" },
          "100%": { transform: "scale(1)", opacity: "0" }
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "scale-up": "scale-up 1s ease-out forwards",
        "float-heart": "float-heart 1.5s cubic-bezier(0.2, 0.6, 0.3, 1) forwards",
        "instagram-heart": "instagram-heart 1.2s cubic-bezier(0.17, 0.89, 0.32, 1.25) forwards",
        "heart-pulse": "heart-pulse 1.5s ease-out infinite",
        "double-click-hint": "double-click-hint 2s ease-in-out"
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    function({ addUtilities }: PluginAPI) {
      const newUtilities = {
        '.scrollbar-hide': {
          /* IE and Edge */
          '-ms-overflow-style': 'none',
          /* Firefox */
          'scrollbar-width': 'none',
          /* Safari and Chrome */
          '&::-webkit-scrollbar': {
            display: 'none'
          }
        }
      }
      addUtilities(newUtilities);
    }
  ],
}

export default config;
