import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ClassSync — Transparent Classroom Focus & Digital Responsibility Platform',
  description: 'Transparent, student-empowered focus for K-12 classrooms.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              tailwind.config = {
                theme: {
                  extend: {
                    colors: {
                      ink: '#101010',
                      'ink-soft': '#48484a',
                      sub: '#6e6e73',
                      muted: '#ababb0',
                      canvas: '#f5f5f7',
                      surface: '#ffffff',
                      line: '#e6e6e9',
                      track: '#f0f0f0',
                      brand: '#0a84ff',
                      'brand-hover': '#2997ff',
                      orange: '#ff9400',
                      green: '#34c759',
                      red: '#ff383c',
                      'red-hover': '#ff5b5f',
                    },
                    borderRadius: {
                      card: '30px',
                      tile: '20px',
                      media: '16px',
                      thumb: '12px',
                    },
                    boxShadow: {
                      card: '0 4px 24px rgba(0,0,0,0.06)',
                      'card-hover': '0 12px 40px rgba(0,0,0,0.1)',
                      'tile-hover': '0 8px 30px rgba(0,0,0,0.08)',
                      seg: '0 1px 4px rgba(0,0,0,0.12)',
                      device: '0 30px 70px -15px rgba(0,0,0,0.25)',
                    },
                  },
                },
              };
            `,
          }}
        />
      </head>
      <body className="bg-canvas text-ink antialiased selection:bg-brand selection:text-white">
        {children}
      </body>
    </html>
  );
}
