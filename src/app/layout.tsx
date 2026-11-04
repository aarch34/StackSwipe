
import type { Metadata } from 'next';
import { Handjet, Silkscreen, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/hooks/use-auth';
import { AppRouter } from '@/components/app-router';

const pixel = Handjet({ subsets: ['latin'], variable: '--font-pixel', display: 'swap' });
const label = Silkscreen({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-label', display: 'swap' });
const body = Space_Grotesk({ subsets: ['latin'], variable: '--font-body', display: 'swap' });

export const metadata: Metadata = {
  title: 'StackSwipe',
  description: 'Swipe to meet developers, designers, founders and students. When you both swipe right, you can message.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${pixel.variable} ${label.variable} ${body.variable}`}>
      <body className="font-body">
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:bg-accent focus:px-4 focus:py-2 focus:font-headline focus:text-lg focus:text-accent-foreground"
          >
            Skip to content
          </a>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            storageKey="stackswipe-theme"
            disableTransitionOnChange
          >
            <AuthProvider>
              <AppRouter>
                {children}
              </AppRouter>
              <Toaster />
            </AuthProvider>
          </ThemeProvider>
      </body>
    </html>
  );
}
