import type { Metadata, Viewport } from 'next';
import './globals.css';
import { MarketProvider } from '@/lib/marketContext';
import { ThemeProvider } from '@/lib/themeContext';

export const metadata: Metadata = {
  title: 'Market Intelligence - 007 | Intelligence Beyond the Noise',
  description: 'Intelligence Beyond the Noise. Institutional-grade quantitative analytics and multi-market microstructure telemetry across India, USA & UAE financial markets.',
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
                var theme = 'arctic';
                if (saved === 'arctic' || saved === 'ivory' || saved === 'graphite' || saved === 'capital') {
                  theme = saved;
                } else if (saved === 'lightblue' || saved === 'quartz') {
                  theme = 'arctic';
                } else if (saved === 'champagne' || saved === 'falcon') {
                  theme = 'ivory';
                } else if (saved === 'metallic' || saved === 'obsidian') {
                  theme = 'graphite';
                } else if (saved === 'techno' || saved === 'cyberpunk') {
                  theme = 'capital';
                }
                document.documentElement.setAttribute('data-theme', theme);
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
          <MarketProvider>
            {children}
          </MarketProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
