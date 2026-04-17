import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'EduPredict v2 | AI Student Intelligence Platform',
  description: 'Next-gen student performance prediction with AI, real-time points & analytics',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen" suppressHydrationWarning>
        <div className="fixed inset-0 bg-mesh pointer-events-none -z-10" />
        {children}
        <Toaster position="top-right" toastOptions={{
          duration: 4000,
          style: { background:'#1e293b', color:'#f1f5f9', border:'1px solid rgba(148,163,184,0.12)', borderRadius:'12px', fontSize:'14px' },
          success: { iconTheme: { primary:'#10b981', secondary:'#f1f5f9' } },
          error:   { iconTheme: { primary:'#f43f5e', secondary:'#f1f5f9' } },
        }} />
      </body>
    </html>
  );
}
