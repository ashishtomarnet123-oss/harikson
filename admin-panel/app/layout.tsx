import React from 'react';
import './globals.css';
import ClientInitializer from '../components/ClientInitializer';

export const metadata = {
  title: 'Harikson AI Platform - Admin Control Plane',
  description:
    'Control panel for managing multi-tenant LLM instances and VM workloads.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css"
        />
      </head>
      <body>
        <ClientInitializer />
        {children}
      </body>
    </html>
  );
}
