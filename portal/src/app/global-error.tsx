'use client';

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: '"Public Sans", system-ui, sans-serif', backgroundColor: '#F6F3EF', color: '#1F1A16' }}>
        <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontFamily: '"Fraunces", Georgia, serif', fontSize: '2rem', fontWeight: 700 }}>
              Something went wrong
            </h1>
            <p style={{ marginTop: '0.5rem', color: '#7A726B' }}>
              An unexpected error occurred.
            </p>
            <button
              onClick={reset}
              style={{
                marginTop: '1.5rem',
                padding: '0.625rem 1.25rem',
                backgroundColor: '#3B2F27',
                color: '#F6F3EF',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
