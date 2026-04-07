import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import LoadingScreen from '@/components/LoadingScreen'
import { ThemeProvider } from '@/components/ThemeProvider'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'PeytOtoria',
  description: 'What is happening – PeytOtoria social network',
  generator: 'PeytOtoria',
  icons: {
    icon: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/linux-penguin-sketched-logo-outline-2Nrhx0fwu1UwusfWDffvzLdaZVrVLy.png',
    apple: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/linux-penguin-sketched-logo-outline-2Nrhx0fwu1UwusfWDffvzLdaZVrVLy.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
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
          {children}
        </ThemeProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
