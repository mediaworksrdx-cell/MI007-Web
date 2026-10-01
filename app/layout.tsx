import type { Metadata } from 'next';
import './globals.css';
import GlobalMarketCanvasFX from '@/components/fx/GlobalMarketCanvasFX';
import { MarketProvider } from '@/lib/marketContext';

export const metadata: Metadata = {
  title: 'Market Intelligence AI — MI007',
  description: 'Autonomous Market Intelligence & Institutional-grade quantitative analytics across India, USA & UAE financial markets.',
  icons: { icon: '/favicon.png', apple: '/logo-falcon.png' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-white text-slate-900 antialiased min-h-screen flex flex-col relative">
        {/* Site-Wide 60fps Floating Candlesticks, Price Badges & Up/Down Arrows Parallax Engine */}
        <GlobalMarketCanvasFX />
        <MarketProvider>
          {children}
        </MarketProvider>
      </body>
    </html>
  );
}
