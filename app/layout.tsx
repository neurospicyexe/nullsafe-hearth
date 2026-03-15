import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import ScrollToTop from "@/components/ScrollToTop";

export const metadata: Metadata = {
  title: "Hearth",
  description: "Halseth system dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
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
