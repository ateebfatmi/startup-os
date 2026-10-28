"use client";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#173f2b", color: "#f5f0e4", padding: 24 }}>
          <section style={{ maxWidth: 480, textAlign: "center" }}>
            <h1 style={{ fontSize: 30, margin: 0 }}>Orbit could not start</h1>
            <p style={{ opacity: 0.75, lineHeight: 1.6 }}>Refresh the application or try again in a moment.</p>
            <button onClick={reset} style={{ border: 0, borderRadius: 12, background: "#c8f560", color: "#173f2b", fontWeight: 700, padding: "12px 18px", cursor: "pointer" }}>
              Try again
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
