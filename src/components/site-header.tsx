import { Activity, ExternalLink, Tv } from "lucide-react";
import Link from "next/link";

type Section = "channels" | "status";

export function SiteHeader({ current }: { current: Section }) {
  return (
    <header className="topbar">
      <Link className="brand" href="/" aria-label="FREE TV, accueil">
        <span className="brand-mark" aria-hidden="true">
          <Tv size={18} />
        </span>
        FREE TV
      </Link>
      <nav className="topnav" aria-label="Navigation principale">
        <Link href="/" aria-current={current === "channels" ? "page" : undefined}>
          <Tv size={16} aria-hidden="true" />
          <span>Chaînes</span>
        </Link>
        <Link href="/etat" aria-current={current === "status" ? "page" : undefined}>
          <Activity size={16} aria-hidden="true" />
          <span>État</span>
        </Link>
        <a href="https://github.com/Free-TV/IPTV" target="_blank" rel="noreferrer">
          <ExternalLink size={16} aria-hidden="true" />
          <span>Source</span>
        </a>
      </nav>
    </header>
  );
}
