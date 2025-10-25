import type { Metadata } from "next";
import { DM_Serif_Display, Commissioner } from "next/font/google";
import "./globals.css";

const dmSerif = DM_Serif_Display({
  weight: ["400"],
  variable: "--font-serif",
  subsets: ["latin"],
});

const commissioner = Commissioner({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Calendera - AI-Powered Gmail Intelligence",
  description: "Intelligent email organization powered by AI. Transform your Gmail into a productivity powerhouse.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${dmSerif.variable} ${commissioner.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
