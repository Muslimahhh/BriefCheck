import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BriefCheck",
  description: "Inspect assumptions in hiring briefs before delegation."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
