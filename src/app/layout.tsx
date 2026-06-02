import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import InteractiveBackground from "@/components/InteractiveBackground";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dear Memory - Retro Digital Time Capsule",
  description: "Capture high-quality photobooth frames, apply retro-cyber filters, attach voice recordings, and schedule automated memory delivery to your future self or loved ones.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-transparent text-slate-900 flex flex-col font-sans selection:bg-purple-500 selection:text-white">
        <InteractiveBackground />
        {children}
      </body>
    </html>
  );
}
