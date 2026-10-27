import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Aura Beauty & Dress Studio | Booking, Payments & POS",
  description: "Premier beauty, makeup, lash tech, hair, and dress services in Accra, Ghana.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${jakartaSans.variable} font-sans h-full antialiased`}>
      <body className="min-h-full bg-swirl text-[#1E1E1E] flex flex-col">
        {children}
      </body>
    </html>
  );
}
