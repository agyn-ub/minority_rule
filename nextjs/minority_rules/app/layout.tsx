import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { FlowProviderWrapper } from "@/components/FlowProvider";
import Navbar from "@/components/Navbar";

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
        <FlowProviderWrapper>
          <Navbar />
          {children}
        </FlowProviderWrapper>
      </body>
    </html>
  );
}
