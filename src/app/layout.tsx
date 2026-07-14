import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "হিসাব খাতা",
  description: "মাসিক আয় ও খরচের হিসাব",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn">
      <body>{children}</body>
    </html>
  );
}
