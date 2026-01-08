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

const APPTITLE = "Polyprompt - Ask a question, get a debate.";
const APPDESC = "AI agents argue different perspectives so you can make better decisions.";

export const metadata: Metadata = {
  title: APPTITLE,
  description: APPDESC,
  openGraph: {
    title: APPTITLE,
    description: APPDESC,
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: APPTITLE,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: APPTITLE,
    description: APPDESC,
    images: ["/og.png"],
  },
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
