import { useState } from "react";
import { requestLoginCode, verifyLoginCode } from "./useAuth";

export function SignInPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "verifying">("idle");
  const [error, setError] = useState<string | null>(null);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    try {
      await requestLoginCode(email);
      setStatus("sent");
    } catch (err) {
      setStatus("idle");
      setError(err instanceof Error ? err.message : "Не получилось отправить код");
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("verifying");
    setError(null);
    try {
      await verifyLoginCode(email, code);
      // onAuthStateChange in useAuth picks up the new session automatically.
    } catch (err) {
      setStatus("sent");
      setError(err instanceof Error ? err.message : "Неверный или просроченный код");
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-white dark:bg-slate-950">
      <div className="flex w-80 flex-col gap-3">
        <h1 className="text-center text-lg font-semibold text-slate-900 dark:text-slate-100">Steinhart Campaign Companion</h1>

        {status !== "sent" && status !== "verifying" ? (
          <form onSubmit={handleSendCode} className="flex flex-col gap-3">
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
              {status === "sending" ? "Отправляю..." : "Прислать код для входа"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="flex flex-col gap-3">
            <p className="text-center text-sm text-slate-600 dark:text-slate-400">
              Код отправлен на {email} — открой почту и впиши сюда 6 цифр.
            </p>
            <input
              type="text"
              inputMode="numeric"
              required
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="rounded border border-slate-300 bg-white px-3 py-2 text-center text-lg tracking-widest dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
            <button
              type="submit"
              disabled={status === "verifying"}
              className="rounded bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-300"
            >
              {status === "verifying" ? "Проверяю..." : "Войти"}
            </button>
            <button
              type="button"
              className="text-sm text-slate-500 dark:text-slate-400"
              onClick={() => {
                setStatus("idle");
                setCode("");
                setError(null);
              }}
            >
              Другая почта / прислать код заново
            </button>
          </form>
        )}

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </div>
  );
}
