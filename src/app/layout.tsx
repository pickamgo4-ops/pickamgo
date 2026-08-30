import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { RoleProvider } from "@/contexts/RoleContext";
import { RoleRedirector } from "@/components/RoleRedirector";
import { ThemeProvider, ThemeScript } from "@/components/theme/ThemeProvider";
import { PublicNoticesProvider } from "@/components/PublicNoticesProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(`https://${process.env.NEXT_PUBLIC_MARKETPLACE_DOMAIN || "pickamgo.com"}`),
  title: {
    default: "PickAmGo — Your Online Marketplace",
    template: "%s | PickAmGo",
  },
  description:
    "PickAmGo is a general online marketplace where people can discover products, shops, services, and more. Buy, sell, and connect with local businesses and sellers.",
  applicationName: "PickAmGo",
  manifest: "/manifest.json",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon" },
      { url: "/logo.png", type: "image/png", sizes: "580x471" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: ["/favicon.ico"],
    apple: [{ url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" }],
  },
  openGraph: {
    type: "website",
    siteName: "PickAmGo",
    title: "PickAmGo — Your Online Marketplace",
    description:
      "PickAmGo is a general online marketplace where people can discover products, shops, services, and more.",
    url: "/",
    images: [
      { url: "/og-image.png", width: 1200, height: 630, alt: "PickAmGo - Your Online Marketplace" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PickAmGo — Your Online Marketplace",
    description:
      "PickAmGo is a general online marketplace where people can discover products, shops, services, and more.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "PickAmGo",
    url: "https://pickamgo.com",
    logo: "https://pickamgo.com/icon-512.png",
    description:
      "PickAmGo is a general online marketplace where people can discover products, shops, services, and more.",
    sameAs: [
      "https://www.facebook.com/pickamgo",
      "https://twitter.com/pickamgo",
      "https://www.instagram.com/pickamgo",
    ],
  };

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "PickAmGo",
    url: "https://pickamgo.com",
    description:
      "PickAmGo is a general online marketplace where people can discover products, shops, services, and more.",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://pickamgo.com/discover?search={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
      </head>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} font-sans bg-background text-foreground antialiased`}
      >
        <ThemeScript />
        <ThemeProvider>
          <RoleProvider>
            <PublicNoticesProvider>
              <RoleRedirector />
              <div className="min-h-screen flex flex-col">
                <div className="flex-1">{children}</div>
              </div>
            </PublicNoticesProvider>
          </RoleProvider>
        </ThemeProvider>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify([organizationJsonLd, websiteJsonLd]) }}
        />
      </body>
    </html>
  );
}
