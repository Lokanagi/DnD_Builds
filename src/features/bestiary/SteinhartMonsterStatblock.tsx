import { ABILITY_LABELS } from "@/lib/dndRu";
import { AttackRoller } from "./AttackRoller";
import type { SteinhartAbility, SteinhartMonster } from "./bestiaryApi";

function AbilityGroup({ title, items }: { title: string; items: SteinhartAbility[] | null }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="mt-2">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</p>
      <div className="flex flex-col gap-1">
        {items.map((a, i) => (
          <p key={i} className="text-sm">
            <span className="font-semibold italic">{a.name}.</span> {a.desc}
            {(a.toHit != null || (a.damage && a.damage.length > 0)) && (
              <AttackRoller attack={{ toHit: a.toHit, damage: a.damage }} />
            )}
          </p>
        ))}
      </div>
    </div>
  );
}

const ABILITY_ORDER = ["str", "dex", "con", "int", "wis", "cha"];

/** Full statblock built from the Steinhardt sourcebook — original paraphrase
 * per trait/action (never the book's own ability text), mechanical fields
 * (AC/HP/scores/CR) kept exact since numbers aren't protected expression. */
export function SteinhartMonsterStatblock({ monster }: { monster: SteinhartMonster }) {
  return (
    <div className="rounded border border-violet-200 bg-violet-50/40 p-3 text-sm dark:border-violet-900 dark:bg-violet-950/10">
      <div className="mb-1 flex items-center justify-between">
        <h4 className="text-base font-bold">{monster.name}</h4>
        <span className="text-[10px] uppercase tracking-wide text-violet-700 dark:text-violet-400">Штейнхард, стр. {monster.bookPage}</span>
      </div>
      <p className="text-xs italic text-slate-500 dark:text-slate-400">{monster.creatureType}</p>
      <div className="my-1.5 border-t border-violet-300/60 dark:border-violet-900" />
      {monster.armorClass && (
        <p>
          <span className="font-semibold">Класс Доспеха </span>
          {monster.armorClass}
        </p>
      )}
      {monster.hitPoints && (
        <p>
          <span className="font-semibold">Хиты </span>
          {monster.hitPoints}
        </p>
      )}
      {monster.speed && (
        <p>
          <span className="font-semibold">Скорость </span>
          {monster.speed}
        </p>
      )}
      {monster.abilityScores && (
        <div className="my-1.5 grid grid-cols-6 gap-1 border-t border-violet-300/60 pt-1.5 text-center dark:border-violet-900">
          {ABILITY_ORDER.filter((k) => monster.abilityScores?.[k] != null).map((k) => (
            <div key={k}>
              <p className="font-semibold">{ABILITY_LABELS[k]}</p>
              <p>{monster.abilityScores![k]}</p>
            </div>
          ))}
        </div>
      )}
      {monster.saves && Object.keys(monster.saves).length > 0 && (
        <p>
          <span className="font-semibold">Спасброски </span>
          {Object.entries(monster.saves).map(([k, v]) => `${ABILITY_LABELS[k] ?? k} ${v}`).join(", ")}
        </p>
      )}
      {monster.skills && Object.keys(monster.skills).length > 0 && (
        <p>
          <span className="font-semibold">Навыки </span>
          {Object.entries(monster.skills).map(([k, v]) => `${k} ${v}`).join(", ")}
        </p>
      )}
      {monster.senses && (
        <p>
          <span className="font-semibold">Чувства </span>
          {monster.senses}
        </p>
      )}
      {monster.languages && (
        <p>
          <span className="font-semibold">Языки </span>
          {monster.languages}
        </p>
      )}
      <p>
        <span className="font-semibold">Опасность </span>
        {monster.challengeRating}
        {monster.experiencePoints != null ? ` (${monster.experiencePoints} опыта)` : ""}
        {monster.proficiencyBonus ? ` · Бонус мастерства ${monster.proficiencyBonus}` : ""}
      </p>
      <AbilityGroup title="Особенности" items={monster.traits} />
      <AbilityGroup title="Действия" items={monster.actions} />
      <AbilityGroup title="Легендарные действия" items={monster.legendaryActions} />
      {!monster.armorClass && monster.summary && (
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{monster.summary}</p>
      )}
    </div>
  );
}
