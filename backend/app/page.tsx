// Landing page for Figcomment — design ported from Figma node 2:621.
// Fonts: Inter loaded globally via layout.tsx (next/font/google).
import type { CSSProperties } from "react";

const s = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    padding: "48px 24px",
  } satisfies CSSProperties,

  container: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    width: "465px",
  } satisfies CSSProperties,

  title: {
    margin: 0,
    fontSize: "40px",
    fontWeight: 800,
    lineHeight: "normal",
    color: "#000000",
  } satisfies CSSProperties,

  subtitle: {
    margin: 0,
    fontSize: "24px",
    fontWeight: 400,
    lineHeight: "normal",
    color: "#000000",
  } satisfies CSSProperties,

  cardImage: {
    display: "block",
    width: "100%",
    height: "auto",
  } satisfies CSSProperties,

  repoLink: {
    display: "inline-block",
    fontSize: "14px",
    fontWeight: 500,
    color: "#000000",
    textDecoration: "none",
    opacity: 0.4,
  } satisfies CSSProperties,
};

export default function HomePage() {
  return (
    <main style={s.page}>
      <div style={s.container}>
        <div>
          <h1 style={s.title}>Figcomment</h1>
          <p style={s.subtitle}>
            Analyse, sort, and create actions
            <br />
            for feedback.
          </p>
        </div>

        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/Frame 5408.png"
            alt="Figma sharing dialog showing comment pins on a design"
            style={s.cardImage}
          />
        </div>

        <a href="https://github.com/hferello/figcomment" style={s.repoLink}>
          View on GitHub →
        </a>
      </div>
    </main>
  );
}
