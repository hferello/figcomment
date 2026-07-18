import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Newsreader } from "next/font/google";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  weight: ["600", "700"],
});

export const metadata: Metadata = {
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
    <html lang="en" className={`${geist.variable} ${newsreader.variable}`}>
      <body>{children}</body>
    </html>
  );
}
