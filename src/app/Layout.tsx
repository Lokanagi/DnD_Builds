import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useCampaignStore } from "@/stores/campaignStore";
import { useActiveCampaign } from "@/features/campaigns/useActiveCampaign";
import { useCampaignChannel } from "@/lib/realtime/campaignChannel";
import { CampaignMenu } from "@/features/campaigns/CampaignMenu";
import { useAuth } from "@/features/auth/useAuth";
import { isSuperuserEmail } from "@/lib/superuser";
import { useViewModeStore } from "@/stores/viewModeStore";

const tabs = [
  { to: "/characters", label: "Персонажи" },
  { to: "/madness", label: "Таймлайн безумия" },
  { to: "/moons", label: "Луны" },
  { to: "/xp", label: "Опыт" },
  { to: "/bestiary", label: "Бестиарий" },
  { to: "/items", label: "Предметы" },
];

export function Layout() {
  const activeCampaignId = useCampaignStore((s) => s.activeCampaignId);
  const { campaign, role } = useActiveCampaign(activeCampaignId);
  const { user } = useAuth();
  const isSuperuser = isSuperuserEmail(user?.email);
  const previewAsPlayer = useViewModeStore((s) => s.previewAsPlayer);
  const togglePreviewAsPlayer = useViewModeStore((s) => s.togglePreviewAsPlayer);
  const queryClient = useQueryClient();
  useCampaignChannel(activeCampaignId ?? undefined, queryClient);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <nav className="relative flex w-56 flex-col gap-1 border-r border-slate-200 p-3 dark:border-slate-800">
        <button
          className="mb-2 flex flex-col items-start rounded px-2 py-1 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <h1 className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">{campaign?.name ?? "Steinhart"}</h1>
          {role && <span className="text-xs text-slate-400 dark:text-slate-500">{role === "gm" ? "Мастер" : "Игрок"}</span>}
        </button>

        {isSuperuser && (
          <button
            className={`mb-1 rounded px-2 py-1 text-left text-xs ${
              previewAsPlayer
                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                : "text-slate-400 hover:bg-slate-100 dark:text-slate-500 dark:hover:bg-slate-800"
            }`}
            onClick={togglePreviewAsPlayer}
            title="Переключает только видимые элементы интерфейса — данные, скрытые от игроков (RLS), суперюзеру всё равно видны."
          >
            {previewAsPlayer ? "👁 Смотришь как игрок — вернуться к мастеру" : "Посмотреть как игрок"}
          </button>
        )}

        {menuOpen && <CampaignMenu campaign={campaign} role={role} onClose={() => setMenuOpen(false)} />}

        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `rounded px-2 py-1.5 text-sm ${
                isActive
                  ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900"
                  : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
