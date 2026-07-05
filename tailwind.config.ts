import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172026",
        paper: "#fbfaf7",
        care: "#217c70",
        pulse: "#9d3f31",
        calm: "#d8ece7",
        note: "#f4d06f"
      },
      borderRadius: {
        control: "8px"
      }
    }
  },
  plugins: []
};

export default config;
