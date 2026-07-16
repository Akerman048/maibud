import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { BRAND_DESCRIPTION, BRAND_NAME } from "@/lib/brand";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-sans",
});

export const metadata: Metadata = {
  title: {
    default: BRAND_NAME,
    template: `%s | ${BRAND_NAME}`,
  },
  description: BRAND_DESCRIPTION,
  applicationName: BRAND_NAME,
  openGraph: {
    title: BRAND_NAME,
    description: BRAND_DESCRIPTION,
    type: "website",
    locale: "uk_UA",
  },
  twitter: {
    card: "summary",
    title: BRAND_NAME,
    description: BRAND_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk">
      <body className={ibmPlexSans.variable}>{children}</body>
    </html>
  );
}
