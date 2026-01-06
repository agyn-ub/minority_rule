import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { configureFlow } from "@/lib/flow-config";
import Navbar from "@/components/Navbar";
import { RealtimeGameProvider } from "@/contexts/RealtimeGameProvider";

// Initialize FCL configuration
configureFlow();

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Minority Rule Game",
  description: "A decentralized minority rule game on Flow blockchain",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <RealtimeGameProvider>
          <Navbar />
          {children}
        </RealtimeGameProvider>
      </body>
    </html>
  );
}
