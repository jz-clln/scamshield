import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Sans } from "next/font/google";
import Link from "next/link";
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
        <header className="border-b border-dagat/10">
          <div className="max-w-content mx-auto px-5 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <ShieldMark />
              <span className="font-display font-semibold text-lg tracking-tight text-gabi">
                ScamShield
              </span>
            </Link>
            <Link
              href="/about"
              className="text-sm text-gabi/60 hover:text-dagat transition-colors"
            >
              About
            </Link>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-dagat/10 mt-16">
          <div className="max-w-content mx-auto px-5 py-6 text-xs text-gabi/50 leading-relaxed">
            ScamShield identifies warning signs. It does not independently confirm
            whether a sender is fraudulent. Messages are analyzed for this check
            only and are not stored by default.
          </div>
        </footer>
      </body>
    </html>
  );
}

function ShieldMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
      <path
        d="M13 2 L23 6 V12.5 C23 18.5 18.7 22.6 13 24 C7.3 22.6 3 18.5 3 12.5 V6 Z"
        fill="#0E4F4B"
      />
      <path
        d="M8.5 13.2 L11.6 16.3 L18 9.5"
        stroke="#F6F8F5"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}