import type { Metadata, Viewport } from 'next';
import './globals.css';
import { MarketProvider } from '@/lib/marketContext';
import { ThemeProvider } from '@/lib/themeContext';
import { TradeEngineProvider } from '@/lib/tradeEngineContext';
import { GlobalCommandPalette } from '@/components/ui/GlobalCommandPalette';

export const metadata: Metadata = {
  title: 'MARKET INTELLIGENCE MI-007 | Intelligence Beyond the Noise',
  description: 'Intelligence Beyond the Noise. Institutional-grade quantitative analytics and multi-market microstructure telemetry across India, USA & UAE financial markets.',
  icons: { icon: '/favicon.png', apple: '/logo-falcon.png' },
  manifest: '/manifest.json',
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
                var theme = 'ocean';
                if (saved === 'ocean' || saved === 'violet' || saved === 'cream' || saved === 'sky') {
                  theme = saved;
                } else if (saved === 'arctic' || saved === 'lightblue' || saved === 'quartz') {
                  theme = 'sky';
                } else if (saved === 'ivory' || saved === 'champagne' || saved === 'excel' || saved === 'falcon') {
                  theme = 'cream';
                } else if (saved === 'graphite' || saved === 'metallic' || saved === 'obsidian' || saved === 'cyberpunk') {
                  theme = 'ocean';
                } else if (saved === 'capital' || saved === 'azure' || saved === 'techno') {
                  theme = 'violet';
                }
                document.documentElement.setAttribute('data-theme', theme);
                if (theme !== 'cream' && theme !== 'sky') {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            `,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Berkshire+Swash&family=Playwrite+US+Trad:wght@100..400&family=Caveat:wght@700&family=Permanent+Marker&family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen flex flex-col relative transition-colors duration-200">
        <ThemeProvider>
          <MarketProvider>
            <TradeEngineProvider>
              {children}
              <GlobalCommandPalette />
            </TradeEngineProvider>
          </MarketProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
