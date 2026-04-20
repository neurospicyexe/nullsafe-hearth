import type { Metadata, Viewport } from "next";
import { Caveat, Quicksand } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import ScrollToTop from "@/components/ScrollToTop";

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#e8a83e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "Hearth",
  description: "Halseth system dashboard",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Hearth",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${caveat.variable} ${quicksand.variable}`}>
      <body>
        <div className="app-layout">
          <ScrollToTop />
          <Nav />
          <main className="app-main">{children}</main>
        </div>
      </body>
    </html>
  );
}
