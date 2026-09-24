import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ScamShield token system
        buhangin: "#F6F8F5", // page background — cool neutral, not warm cream
        gabi: "#10221D", // primary ink / text
        dagat: {
          DEFAULT: "#0E4F4B", // brand teal — protection, depth
          light: "#E4EEEC",
          dark: "#082E2B",
        },
        ligtas: {
          DEFAULT: "#3E8E5B", // low concern / safe
          light: "#E4F2E9",
        },
        alerto: {
          DEFAULT: "#C4832A", // needs verification
          light: "#FAEFDD",
        },
        peligro: {
          DEFAULT: "#B23A32", // high concern
          light: "#FBE7E5",
        },
      },
      fontFamily: {
        display: ["var(--font-space-grotesk)", "system-ui", "sans-serif"],
        body: ["var(--font-ibm-plex-sans)", "system-ui", "sans-serif"],
      },
      maxWidth: {
        content: "640px",
      },
    },
  },
  plugins: [],
};

export default config;
