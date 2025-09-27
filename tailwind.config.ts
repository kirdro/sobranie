import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        midnight: "#050510",
        dawn: "#f7f0ff",
        accent: {
          purple: "#6f4ef2",
          teal: "#18b7a0",
          amber: "#f5a524"
        }
      },
      backgroundImage: {
        "orb-iris": "radial-gradient(circle at center, rgba(111, 78, 242, 0.45), transparent 68%)",
        "mesh-aurora": "linear-gradient(135deg, rgba(24, 183, 160, 0.32) 0%, rgba(111, 78, 242, 0.18) 48%, rgba(245, 165, 36, 0.24) 100%)"
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-space-grotesk)", "system-ui", "sans-serif"]
      },
      fontSize: {
        hero: ["clamp(2.5rem, 2vw + 1rem, 3.75rem)", { lineHeight: "1.1" }],
        signal: ["0.75rem", { letterSpacing: "0.28em" }]
      },
      letterSpacing: {
        trackingDense: "0.15em",
        trackingWide: "0.28em"
      },
      boxShadow: {
        glow: "0 0 40px 0 rgba(111, 78, 242, 0.35)",
        neon: "0 0 45px rgba(24, 183, 160, 0.35)"
      },
      animation: {
        float: "float 8s ease-in-out infinite",
        shimmer: "shimmer 6s linear infinite"
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" }
        },
        shimmer: {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "200% 50%" }
        }
      }
    }
  },
  plugins: []
};

export default config;
