import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Caveat, Quicksand } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/shell/AppShell";
import { WriteQueueProvider } from "@/components/shell/WriteQueueProvider";
import ScrollToTop from "@/components/ScrollToTop";
import RegisterServiceWorker from "@/components/RegisterServiceWorker";

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

const atkinson = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--h-font",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#1b1814",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // Home-screen app: draw edge to edge; globals.css pads the notch and home bar via safe-area insets.
  viewportFit: "cover",
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
    <html lang="en" className={`${caveat.variable} ${quicksand.variable} ${atkinson.variable}`}>
      <body>
        <div className="app-layout">
          <ScrollToTop />
          <RegisterServiceWorker />
          <WriteQueueProvider>
            <AppShell>{children}</AppShell>
          </WriteQueueProvider>
        </div>
      </body>
    </html>
  );
}
