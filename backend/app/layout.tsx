import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Anton, Geist } from "next/font/google";
import { app_constants, getAppUrl } from "@/data/constants";
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
  metadataBase: new URL(getAppUrl()),
  title: {
    default: app_constants.backend.title,
    template: `%s · ${app_constants.backend.title}`,
  },
  description: "Sort Figma comments with keywords or optional AI.",
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
