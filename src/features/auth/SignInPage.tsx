import { useState } from "react";
import { signInWithMagicLink } from "./useAuth";

export function SignInPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    try {
      await signInWithMagicLink(email);
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Не получилось отправить ссылку");
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-white dark:bg-slate-950">
      <form onSubmit={handleSubmit} className="flex w-80 flex-col gap-3">
        <h1 className="text-center text-lg font-semibold text-slate-900 dark:text-slate-100">Steinhart Campaign Companion</h1>
        {status === "sent" ? (
          <p className="text-center text-sm text-slate-600 dark:text-slate-400">
            Ссылка для входа отправлена на {email} — открой почту и перейди по ней.
          </p>
        ) : (
          <>
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="rounded bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-300"
            >
              {status === "sending" ? "Отправляю..." : "Прислать ссылку для входа"}
            </button>
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          </>
        )}
      </form>
    </div>
  );
}
