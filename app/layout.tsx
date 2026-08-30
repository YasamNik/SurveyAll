import type { Metadata } from "next";
import Link from "next/link";
import { Bricolage_Grotesque, Public_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: "variable",
});

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  weight: "variable",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "SurveyAll",
  description: "Surveys and calendar scheduling for a group.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${publicSans.variable} ${plexMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink font-sans antialiased">
        <header className="border-b border-rule">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="font-display font-bold text-xl text-ink no-underline">
              SurveyAll
            </Link>
            <nav className="flex items-center gap-4">
              <Link href="/surveys" className="text-pencil text-sm no-underline hover:text-ink">
                Surveys
              </Link>
              <Link href="/events" className="text-pencil text-sm no-underline hover:text-ink">
                Events
              </Link>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
