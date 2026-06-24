import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import LoadingScreen from '@/components/LoadingScreen'
import { ThemeProvider } from '@/components/ThemeProvider'
import PWAInstallPrompt from '@/components/PWAInstallPrompt'
import SwipeBackProvider from '@/components/SwipeBackProvider'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://faundry.buzz'),
  title: {
    default: 'Faundry.buzz - What\'s happening now',
    template: '%s | Faundry.buzz',
  },
  description: 'Join the conversation on Faundry.buzz. Connect with friends, share updates, discover trending topics, and stay informed about what\'s happening around the world.',
  keywords: ['social media', 'social network', 'Faundry.buzz', 'connect', 'share', 'discover', 'trending'],
  authors: [{ name: 'Faundry.buzz' }],
  creator: 'Faundry.buzz',
  publisher: 'Faundry.buzz',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/linux-penguin-sketched-logo-outline-2Nrhx0fwu1UwusfWDffvzLdaZVrVLy.png',
    apple: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/linux-penguin-sketched-logo-outline-2Nrhx0fwu1UwusfWDffvzLdaZVrVLy.png',
  },
  manifest: '/site.webmanifest',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://faundry.buzz',
    siteName: 'Faundry.buzz',
    title: 'Faundry.buzz - What\'s happening now',
    description: 'Join the conversation on Faundry.buzz. Connect with friends, share updates, and discover what\'s happening.',
    images: [
      {
        url: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/linux-penguin-sketched-logo-outline-2Nrhx0fwu1UwusfWDffvzLdaZVrVLy.png',
        width: 1200,
        height: 630,
        alt: 'Faundry.buzz Social Network',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Faundry.buzz - What\'s happening now',
    description: 'Join the conversation on Faundry.buzz. Connect with friends, share updates, and discover what\'s happening.',
    images: ['https://hebbkx1anhila5yf.public.blob.vercel-storage.com/linux-penguin-sketched-logo-outline-2Nrhx0fwu1UwusfWDffvzLdaZVrVLy.png'],
    creator: '@faundry_buzz',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f0ff' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1330' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark bg-background">
      <body className={`${inter.variable} antialiased`}>
        <ThemeProvider>
          <LoadingScreen />
          <SwipeBackProvider>
            {children}
          </SwipeBackProvider>
          <PWAInstallPrompt />
        </ThemeProvider>
      </body>
    </html>
  )
}
