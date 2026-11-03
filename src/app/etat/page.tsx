import type { Metadata } from "next";

import { StatusBoard } from "@/components/status-board";

export const metadata: Metadata = {
  title: "État du service — FREE TV",
  description: "Disponibilité des flux du catalogue au dernier contrôle.",
};

export default function StatusPage() {
  return <StatusBoard />;
}
