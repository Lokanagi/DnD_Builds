import { ABILITY_LABELS, ACTION_TYPE_RU, CREATURE_TYPE_RU, SIZE_RU, translateAlignment } from "@/lib/dndRu";
import type { SrdCreatureDetail } from "./bestiaryApi";

type Attack = { name?: string };
type Action = { name: string; desc: string; action_type?: string; attacks?: Attack[] };
type NamedThing = { name: string; key?: string };

function Row({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <p>
      <span className="font-semibold">{label} </span>
      {value}
    </p>
  );
}

function ActionGroup({ title, actions }: { title: string; actions: Action[] }) {
  if (actions.length === 0) return null;
  return (
    <div className="mt-2">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</p>
      <div className="flex flex-col gap-1.5">
        {actions.map((a, i) => (
          <p key={i} className="text-sm">
            <span className="font-semibold italic">{a.name}.</span> {a.desc}
          </p>
        ))}
      </div>
    </div>
  );
}

/** Renders an open5e creature's full statblock, dnd.su-style: Russian field
 * labels/ability abbreviations, English monster name and action/trait prose
 * (open5e has no Russian text — translating hundreds of monsters' combat
 * text isn't realistic by hand, so that part stays source-language). */
export function MonsterStatblock({ creature }: { creature: SrdCreatureDetail }) {
  const c = creature as Record<string, unknown>;
  const type = c.type as NamedThing | undefined;
  const size = c.size as NamedThing | undefined;
  const abilityScores = (c.ability_scores as Record<string, number> | undefined) ?? {};
  const modifiers = (c.modifiers as Record<string, number> | undefined) ?? {};
  const savingThrowsAll = (c.saving_throws_all as Record<string, number> | undefined) ?? {};
  const savingThrowsProf = (c.saving_throws as Record<string, unknown> | undefined) ?? {};
  const skillBonuses = (c.skill_bonuses as Record<string, number> | undefined) ?? {};
  const languages = (c.languages as { as_string?: string } | undefined)?.as_string;
  const resist = c.resistances_and_immunities as
    | {
        damage_resistances_display?: string;
        damage_immunities_display?: string;
        damage_vulnerabilities_display?: string;
        condition_immunities_display?: string;
      }
    | undefined;
  const speedAll = c.speed_all as Record<string, unknown> | undefined;
  const speedParts: string[] = [];
  if (speedAll) {
    if (speedAll.walk) speedParts.push(`${speedAll.walk} фт.`);
    if (speedAll.fly) speedParts.push(`летая ${speedAll.fly} фт.`);
    if (speedAll.swim) speedParts.push(`плавая ${speedAll.swim} фт.`);
    if (speedAll.climb) speedParts.push(`лазая ${speedAll.climb} фт.`);
    if (speedAll.burrow) speedParts.push(`копая ${speedAll.burrow} фт.`);
  }

  const actions = ((c.actions as Action[] | undefined) ?? []);
  const groupedActions = (kind: string) => actions.filter((a) => (a.action_type ?? "ACTION") === kind);
  const traits = (c.traits as Action[] | undefined) ?? [];

  const abilityKeys = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"];

  return (
    <div className="rounded border border-amber-200 bg-amber-50/40 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/10">
      <h4 className="text-base font-bold">{creature.name}</h4>
      <p className="text-xs italic text-slate-500 dark:text-slate-400">
        {size ? SIZE_RU[size.key ?? ""] ?? size.name : ""} {type ? CREATURE_TYPE_RU[type.key ?? ""] ?? type.name : ""}
        {c.alignment ? `, ${translateAlignment(c.alignment as string)}` : ""}
      </p>
      <div className="my-1.5 border-t border-amber-300/60 dark:border-amber-900" />
      <Row label="Класс Доспеха" value={`${c.armor_class ?? "?"}${c.armor_detail ? ` (${c.armor_detail})` : ""}`} />
      <Row label="Хиты" value={`${c.hit_points ?? "?"}${c.hit_dice ? ` (${c.hit_dice})` : ""}`} />
      <Row label="Скорость" value={speedParts.join(", ")} />
      <div className="my-1.5 border-t border-amber-300/60 dark:border-amber-900" />
      <div className="grid grid-cols-6 gap-1 text-center">
        {abilityKeys.map((k) => (
          <div key={k}>
            <p className="font-semibold">{ABILITY_LABELS[k]}</p>
            <p>
              {abilityScores[k] ?? "?"} ({modifiers[k] != null ? (modifiers[k] >= 0 ? `+${modifiers[k]}` : modifiers[k]) : "?"})
            </p>
          </div>
        ))}
      </div>
      <div className="my-1.5 border-t border-amber-300/60 dark:border-amber-900" />
      {Object.keys(savingThrowsProf).length > 0 && (
        <Row
          label="Спасброски"
          value={Object.entries(savingThrowsAll)
            .filter(([k]) => k in savingThrowsProf)
            .map(([k, v]) => `${ABILITY_LABELS[k] ?? k} ${v >= 0 ? `+${v}` : v}`)
            .join(", ")}
        />
      )}
      {Object.keys(skillBonuses).length > 0 && (
        <Row label="Навыки" value={Object.entries(skillBonuses).map(([k, v]) => `${k} ${v >= 0 ? `+${v}` : v}`).join(", ")} />
      )}
      {resist?.damage_resistances_display && <Row label="Сопротивление урону" value={resist.damage_resistances_display} />}
      {resist?.damage_immunities_display && <Row label="Иммунитет к урону" value={resist.damage_immunities_display} />}
      {resist?.damage_vulnerabilities_display && <Row label="Уязвимость к урону" value={resist.damage_vulnerabilities_display} />}
      {resist?.condition_immunities_display && <Row label="Иммунитет к состояниям" value={resist.condition_immunities_display} />}
      <Row label="Пассивное Восприятие" value={String(c.passive_perception ?? "")} />
      {languages && <Row label="Языки" value={languages} />}
      <Row
        label="Опасность"
        value={`${c.challenge_rating ?? "?"}${c.experience_points ? ` (${c.experience_points} опыта)` : ""}`}
      />
      {traits.length > 0 && (
        <div className="mt-2">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Особенности</p>
          <div className="flex flex-col gap-1.5">
            {traits.map((t, i) => (
              <p key={i} className="text-sm">
                <span className="font-semibold italic">{t.name}.</span> {t.desc}
              </p>
            ))}
          </div>
        </div>
      )}
      <ActionGroup title={ACTION_TYPE_RU.ACTION} actions={groupedActions("ACTION")} />
      <ActionGroup title={ACTION_TYPE_RU.BONUS_ACTION} actions={groupedActions("BONUS_ACTION")} />
      <ActionGroup title={ACTION_TYPE_RU.REACTION} actions={groupedActions("REACTION")} />
      <ActionGroup title={ACTION_TYPE_RU.LEGENDARY_ACTION} actions={groupedActions("LEGENDARY_ACTION")} />
    </div>
  );
}
