import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { FlowProvider } from "@/components/providers/FlowProvider";
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
  title: "Minority Rule Game",
  description: "A blockchain-based voting game where the minority wins",
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
        <FlowProvider>{children}</FlowProvider>
      </body>
    </html>
  );
}
