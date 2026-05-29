import type { Metadata } from "next";
import { Bebas_Neue, Space_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "sonner";

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-grotesk",
});

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Crash Game",
  description: "Jungle Gaming — Technical Challenge (fictional credits)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${bebasNeue.variable} ${spaceGrotesk.variable} ${spaceMono.variable}`}
    >
      <body style={{ fontFamily: "var(--font-grotesk), Helvetica, Arial, sans-serif" }}>
        <Providers>
          {children}
          <Toaster theme="dark" position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
