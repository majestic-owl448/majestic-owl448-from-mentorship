import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SuperTokensProvider } from "./components/supertokensProvider";
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
  title: "Stamp Inventory",
  description: "Record a stamp collection and calculate its postage value.",
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
        <SuperTokensProvider>{children}</SuperTokensProvider>
      </body>
    </html>
  );
}
