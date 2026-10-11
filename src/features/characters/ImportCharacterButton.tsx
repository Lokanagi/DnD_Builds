import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { parseLssJson } from "./import/lssMapper";
import { upsertCharacterFromImport } from "./charactersApi";
import { useAuth } from "@/features/auth/useAuth";

export function ImportCharacterButton({ campaignId }: { campaignId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File) => {
    if (!user) return;
    setError(null);
    setBusy(true);
    try {
      const text = await file.text();
      const character = parseLssJson(text);
      await upsertCharacterFromImport(campaignId, user.id, character);
      await queryClient.invalidateQueries({ queryKey: ["characters", campaignId] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось разобрать файл");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        disabled={busy}
        className="rounded bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-700 disabled:opacity-50"
        onClick={() => inputRef.current?.click()}
      >
        {busy ? "Импортирую..." : "Импортировать лист (LSS JSON)"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
