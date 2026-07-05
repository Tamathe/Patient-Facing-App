import "@/styles/globals.css";
import { HealthStateProvider } from "@/state/store";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Home Health Ownership",
  description: "Patient-owned home care support for blood pressure, medicines, and visits."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <HealthStateProvider>{children}</HealthStateProvider>
      </body>
    </html>
  );
}
