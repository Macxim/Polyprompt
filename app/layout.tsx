import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SpaceProvider } from "./context/SpaceContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SpaceProvider>{children}</SpaceProvider>
      </body>
    </html>
  );
}
