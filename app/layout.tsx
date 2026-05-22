import type { Metadata, Viewport } from 'next'
import './globals.css'
import NavBar from './components/NavBar'

export const metadata: Metadata = {
  title: 'XFG Platform',
  description: 'XFG Agent Onboarding & Activation System',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, padding: 0, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif', background: '#F5F2ED' }}>
        <NavBar />
        {children}
      </body>
    </html>
  )
}
