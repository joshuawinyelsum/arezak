import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Arezak - Money Governed by Rules",
  description: "Arezak helps you keep the promises you make to your money through strict rules and constraints.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <body className={`${inter.variable} font-sans antialiased overflow-hidden h-screen w-full`}>
        {children}
      </body>
    </html>
  );
}
