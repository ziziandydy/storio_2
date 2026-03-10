import type { Metadata, Viewport } from "next";
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
  title: "Storio - Collect stories in your Folio",
  description: "A personal collection of movies, series, and books.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Storio",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  }
};

export const viewport: Viewport = {
  themeColor: "#0d0d0d",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${roboto.variable} font-sans pt-[var(--sa-top)] pb-[var(--sa-bottom)] bg-folio-black min-h-screen`}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}