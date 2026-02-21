import type { Metadata } from "next";
import { Inter, Roboto } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ToastProvider";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const roboto = Roboto({ 
  weight: ['300', '400', '500', '700'],
  subsets: ["latin"], 
  variable: '--font-roboto' 
});

export const metadata: Metadata = {
  title: "Storio - Collect stories in your folio",
  description: "A personal collection of movies, series, and books.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${roboto.variable} font-sans`}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}