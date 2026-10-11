import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCampaignStore } from "@/stores/campaignStore";
import { useThemeStore } from "@/stores/themeStore";
import { signOut } from "@/features/auth/useAuth";
import { deleteCampaign } from "./campaignApi";
import type { Campaign, MemberRole } from "@/types/campaign";

export function CampaignMenu({
  campaign,
  role,
  onClose,
}: {
  campaign: Campaign | null;
  role: MemberRole | null;
  onClose: () => void;
}) {
  const setActiveCampaignId = useCampaignStore((s) => s.setActiveCampaignId);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const navigate = useNavigate();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isGm = role === "gm";

  return (
    <>
      {/* click-outside catcher */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute left-3 right-3 top-14 z-50 flex flex-col gap-1 rounded-lg border border-slate-200 bg-white p-2 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-900">
        <button
          className="flex items-center justify-between rounded px-2 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
          onClick={toggleTheme}
        >
          <span>Тема</span>
          <span className="text-xs text-slate-400">{theme === "dark" ? "Тёмная" : "Светлая"}</span>
        </button>

        {isGm && campaign && (
          <div className="flex items-center justify-between rounded px-2 py-1.5 text-xs text-slate-500">
            <span>Код приглашения</span>
            <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{campaign.inviteCode}</span>
          </div>
        )}

        <button
          className="rounded px-2 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
          onClick={() => {
            setActiveCampaignId(null);
            onClose();
          }}
        >
          Сменить кампанию
        </button>

        <button
          className="rounded px-2 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
          onClick={() => {
            void signOut();
            onClose();
          }}
        >
          Выйти из аккаунта
        </button>

        {isGm && (
          <div className="mt-1 border-t border-slate-100 pt-1 dark:border-slate-800">
            {!confirmingDelete ? (
              <button
                className="w-full rounded px-2 py-1.5 text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                onClick={() => setConfirmingDelete(true)}
              >
                Удалить кампанию
              </button>
            ) : (
              <div className="flex flex-col gap-1 rounded bg-red-50 p-2 dark:bg-red-950">
                <p className="text-xs text-red-700 dark:text-red-300">
                  Удалит кампанию навсегда — всех персонажей, события безумия, луны, опыт. Отменить нельзя.
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={deleting}
                    className="rounded bg-red-700 px-2 py-1 text-xs text-white hover:bg-red-800 disabled:opacity-50"
                    onClick={async () => {
                      if (!campaign) return;
                      setDeleting(true);
                      try {
                        await deleteCampaign(campaign.id);
                        setActiveCampaignId(null);
                        navigate("/");
                      } finally {
                        setDeleting(false);
                      }
                    }}
                  >
                    {deleting ? "Удаляю..." : "Да, удалить навсегда"}
                  </button>
                  <button className="rounded border border-slate-300 px-2 py-1 text-xs" onClick={() => setConfirmingDelete(false)}>
                    Отмена
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
