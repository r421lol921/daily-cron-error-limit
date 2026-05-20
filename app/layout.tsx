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
  metadataBase: new URL('https://peytotoria.vercel.app'),
  title: {
    default: 'PeytOtoria - What\'s happening now',
    template: '%s | PeytOtoria',
  },
  description: 'Join the conversation on PeytOtoria. Connect with friends, share updates, discover trending topics, and stay informed about what\'s happening around the world.',
  keywords: ['social media', 'social network', 'PeytOtoria', 'connect', 'share', 'discover', 'trending'],
  authors: [{ name: 'PeytOtoria' }],
  creator: 'PeytOtoria',
  publisher: 'PeytOtoria',
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
    url: 'https://peytotoria.vercel.app',
    siteName: 'PeytOtoria',
    title: 'PeytOtoria - What\'s happening now',
    description: 'Join the conversation on PeytOtoria. Connect with friends, share updates, and discover what\'s happening.',
    images: [
      {
        url: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/linux-penguin-sketched-logo-outline-2Nrhx0fwu1UwusfWDffvzLdaZVrVLy.png',
        width: 1200,
        height: 630,
        alt: 'PeytOtoria Social Network',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PeytOtoria - What\'s happening now',
    description: 'Join the conversation on PeytOtoria. Connect with friends, share updates, and discover what\'s happening.',
    images: ['https://hebbkx1anhila5yf.public.blob.vercel-storage.com/linux-penguin-sketched-logo-outline-2Nrhx0fwu1UwusfWDffvzLdaZVrVLy.png'],
    creator: '@peytotoria',
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
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
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
    <html lang="en" suppressHydrationWarning>
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
