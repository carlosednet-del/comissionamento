import Link from "next/link";

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.75rem",
        textAlign: "center",
        padding: "2rem",
      }}
    >
      <h1 style={{ fontSize: "2rem", fontWeight: 700 }}>404</h1>
      <p style={{ opacity: 0.7 }}>Página não encontrada.</p>
      <Link href="/" style={{ textDecoration: "underline" }}>
        Voltar ao início
      </Link>
    </main>
  );
}
