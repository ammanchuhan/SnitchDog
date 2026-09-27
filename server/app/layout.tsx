export const metadata = { title: 'SnitchDog', description: 'Somebody finds out.' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#121211', color: '#F6F4EF', fontFamily: 'system-ui' }}>
        {children}
      </body>
    </html>
  );
}
