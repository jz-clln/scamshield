import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Sans } from "next/font/google";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import "./global.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-space-grotesk",
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-sans",
});

export const metadata: Metadata = {
  title: "ScamShield — Upload. Analyze. Understand. Verify.",
  description:
    "Upload a screenshot or paste a suspicious message and ScamShield flags the warning signs before you act.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${ibmPlexSans.variable}`}>
      <body className="font-body min-h-screen flex flex-col">
        <a href="#main-content" className="skip-link">Skip to content</a>
        <header className="site-header">
          <div className="app-container header-inner">
            <Link href="/" className="brand" aria-label="ScamShield home">
              <span className="brand-mark"><Icon name="shield" width="24" height="24" /></span>
              <span className="font-display font-semibold text-lg tracking-tight text-gabi">
                ScamShield
              </span>
            </Link>
            <nav className="header-nav" aria-label="Main navigation"><Link href="/" className="nav-check">Check a message</Link><Link href="/about">About <Icon name="arrow" width="14" height="14" /></Link></nav>
            <span className="header-caption"><span className="live-dot" /> Clarity before you act</span>
          </div>
        </header>

        <main id="main-content" className="flex-1">{children}</main>

        <footer className="site-footer">
          <div className="app-container footer-inner">
            <span className="footer-brand"><Icon name="shield" width="17" height="17" /> ScamShield</span>
            <p>AI insights to support your judgment. Always verify before you act.</p>
            <Link href="/about">Privacy & limitations <Icon name="arrow" width="13" height="13" /></Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
