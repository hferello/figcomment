import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Anton, Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

const anton = Anton({
  subsets: ["latin"],
  variable: "--font-anton",
  weight: "400",
});

// metadataBase resolves relative OG image URLs on pages that set them.
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "Figcomment",
    template: "%s · Figcomment",
  },
  description: "Analyse and sort feedback from Figma comments.",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={`${geist.variable} ${anton.variable}`}>
      <body>{children}</body>
    </html>
  );
}
