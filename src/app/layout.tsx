import type { Metadata } from "next";
import { Geist, Geist_Mono, Outfit } from "next/font/google";
import { SideNav } from "@/components/side-nav";
import "./globals.css";

// Runs before paint so a saved dark theme does not flash light first.
const themeBoot = `(function(){try{if(localStorage.getItem("smart-theme")==="dark"){document.documentElement.classList.add("dark")}}catch(e){}})();`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Smart$",
  description: "Trane Technologies marketing collateral budget tracker",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${outfit.variable} h-full antialiased`}
    >
      {/* Grammarly adds data attributes on body before hydrate. Ignore that mismatch. */}
      <body className="min-h-full" suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
        <div className="flex min-h-full">
          <SideNav />
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </body>
    </html>
  );
}
