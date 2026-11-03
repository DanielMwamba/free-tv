import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-app",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FREE TV — chaînes publiques en direct",
  description: "Un lecteur web personnel pour explorer les chaînes publiques de Free-TV/IPTV.",
};

export const viewport: Viewport = {
  themeColor: "#0b0d12",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={cn("font-sans", inter.variable)}>
      <body>{children}</body>
    </html>
  );
}
