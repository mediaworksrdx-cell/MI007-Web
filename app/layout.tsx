import type { Metadata, Viewport } from 'next';
import './globals.css';
import GlobalMarketCanvasFX from '@/components/fx/GlobalMarketCanvasFX';
import { MarketProvider } from '@/lib/marketContext';
import { ThemeProvider } from '@/lib/themeContext';
import { ThemeSwitcher } from '@/components/ui/ThemeSwitcher';

export const metadata: Metadata = {
  title: 'Market Intelligence AI — MI007',
  description: 'Autonomous Market Intelligence & Institutional-grade quantitative analytics across India, USA & UAE financial markets.',
  icons: { icon: '/favicon.png', apple: '/logo-falcon.png' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#060A11',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var saved = localStorage.getItem('mi007_active_theme');
                if (saved && (saved === 'lightblue' || saved === 'ivory' || saved === 'metallic' || saved === 'techno')) {
                  document.documentElement.setAttribute('data-theme', saved);
                } else if (saved === 'quartz') {
                  document.documentElement.setAttribute('data-theme', 'lightblue');
                } else if (saved === 'champagne' || saved === 'falcon') {
                  document.documentElement.setAttribute('data-theme', 'ivory');
                } else if (saved === 'obsidian') {
                  document.documentElement.setAttribute('data-theme', 'metallic');
                } else if (saved === 'cyberpunk') {
                  document.documentElement.setAttribute('data-theme', 'techno');
                } else {
                  document.documentElement.setAttribute('data-theme', 'lightblue');
                }
              } catch (e) {}
            `,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen flex flex-col relative transition-colors duration-200">
        <ThemeProvider>
          {/* Site-Wide 60fps Floating Candlesticks, Price Badges & Up/Down Arrows Parallax Engine */}
          <GlobalMarketCanvasFX />
          <MarketProvider>
            {children}
          </MarketProvider>
          {/* Client Theme Switcher floating dock */}
          <ThemeSwitcher />
        </ThemeProvider>
      </body>
    </html>
  );
}
