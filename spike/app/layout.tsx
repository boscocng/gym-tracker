import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gym Tracker Spike",
  appleWebApp: { capable: true, title: "GT Spike", statusBarStyle: "black" },
};

export const viewport: Viewport = {
  themeColor: "#0D0D0C",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
