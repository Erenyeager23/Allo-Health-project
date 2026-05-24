import "./globals.css"

export const metadata = {
  title: "Allo Reservations"
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div style={{ padding: 20, fontFamily: 'Inter, system-ui, sans-serif' }}>
          <h1>Allo Reservations</h1>
          {children}
        </div>
      </body>
    </html>
  )
}
