import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import { AppProvider } from "./state/AppProvider";
import { AuthProvider } from "./providers/AuthProvider";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

import SidebarLayout from "./components/SidebarLayout";
import { CSPostHogProvider } from "./providers/PostHogProvider";

export const metadata: Metadata = {
  title: "Polyprompt",
  description: "Spaces and AI agents",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${outfit.variable} antialiased bg-slate-50 relative flex h-screen overflow-hidden`}>
        <CSPostHogProvider>
          <AuthProvider>
            <AppProvider>
              <SidebarLayout>{children}</SidebarLayout>
            </AppProvider>
          </AuthProvider>
        </CSPostHogProvider>
      </body>
    </html>
  );
}
