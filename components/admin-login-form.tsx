"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { PasswordField } from "@/components/password-field";

export function AdminLoginForm() {
  const router = useRouter();
  const usernameId = useId();
  const passwordId = useId();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <form
      className="glass mx-auto w-full max-w-md px-5 py-6"
      onSubmit={(event) => {
        event.preventDefault();
        setError("");
        setPending(true);
        void (async () => {
          try {
            const response = await fetch("/api/admin/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ username, password }),
            });
            const data = (await response.json()) as { error?: string };
            if (!response.ok) {
              setError(data.error ?? "Đăng nhập thất bại.");
              return;
            }
            router.refresh();
          } catch {
            setError("Mất kết nối. Thử lại.");
          } finally {
            setPending(false);
          }
        })();
      }}
    >
      <p className="eyebrow">Admin</p>
      <h1 className="mt-2 text-2xl font-semibold text-[var(--color-gold)]">
        Đăng nhập
      </h1>
      <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
        Khu vực quản trị nội bộ.
      </p>

      <label htmlFor={usernameId} className="label mt-5">
        Tài khoản
      </label>
      <input
        id={usernameId}
        className="field"
        name="username"
        autoComplete="username"
        value={username}
        onChange={(event) => setUsername(event.target.value)}
        required
      />

      <label htmlFor={passwordId} className="label mt-4">
        Mật khẩu
      </label>
      <PasswordField
        id={passwordId}
        name="password"
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
      />

      {error ? (
        <p className="mt-3 text-sm text-[var(--color-destructive)]">{error}</p>
      ) : null}

      <button
        type="submit"
        className="btn-primary mt-5 w-full justify-center"
        disabled={pending}
      >
        {pending ? "Đang vào…" : "Đăng nhập"}
      </button>
    </form>
  );
}
