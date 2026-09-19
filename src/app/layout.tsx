import type { Metadata } from "next";
import "./globals.css";
import { Azeret_Mono } from "next/font/google";
import { cn } from "@/lib/utils";

const azeretMono = Azeret_Mono({
  subsets: ["latin"],
  variable: "--font-broadcast",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FREE TV — chaînes publiques en direct",
  description: "Un lecteur web personnel pour explorer les chaînes publiques de Free-TV/IPTV.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={cn("font-sans", azeretMono.variable)}>
      <body>{children}</body>
    </html>
  );
}
