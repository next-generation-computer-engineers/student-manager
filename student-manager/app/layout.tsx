import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';

import './globals.css';

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
});

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
});

export const metadata: Metadata = {
    title: 'CENG Student Manager',
    description: 'Track courses, students and attendance for CENG.',
    icons: {
        icon: [
            { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
            { url: '/icon.png', sizes: '48x48', type: 'image/png' },
        ],
        apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        // suppressHydrationWarning is required: next-themes sets the class on
        // <html> before React hydrates, so the server markup cannot match.
        <html lang="en" suppressHydrationWarning>
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
            >
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    {children}
                    <Toaster richColors closeButton />
                </ThemeProvider>
            </body>
        </html>
    );
}
