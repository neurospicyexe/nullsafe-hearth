import { Suspense } from "react";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <div style={{
      minHeight: "100dvh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "1.25rem",
    }}>
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "2rem",
        width: "100%",
        maxWidth: "340px",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
      }}>
        <div>
          <h1 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.3rem" }}>Hearth</h1>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Enter your passphrase to continue.</p>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
