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
        <SuperTokensProvider>
          {children}
          <footer className="border-t border-zinc-200 bg-white px-6 py-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-black dark:text-zinc-400">
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p>Need support or want to share feedback?</p>
              <a
                className="w-fit font-medium text-zinc-950 underline underline-offset-4 dark:text-zinc-50"
                href="https://discord.gg/64BsP4MDGG"
              >
                Join the Discord server
              </a>
            </div>
          </footer>
        </SuperTokensProvider>
      </body>
    </html>
  );
}
