import type { Metadata } from "next";
import { Inter, Michroma } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const michroma = Michroma({
  weight: "400",
  variable: "--font-michroma",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TRAKN Command Center",
  description: "Private Instagram Automation Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={cn(
          inter.variable,
          michroma.variable,
          "antialiased bg-[#121212] text-white min-h-screen font-sans"
        )}
      >
        {children}
      </body>
    </html>
  );
}
