import { readFileSync } from "node:fs";
import { parseLssJson, suggestStarterResources } from "../src/features/characters/import/lssMapper";

const path = process.argv[2] ?? "Элиор Морок — Long Story Short.json";
const raw = readFileSync(path, "utf-8");

const character = parseLssJson(raw);
console.log("Распарсенный персонаж:");
console.log(JSON.stringify({ ...character, rawImport: "<omitted>" }, null, 2));

const suggested = suggestStarterResources(character);
console.log("\nПредложенные стартовые ресурсы:", suggested.length ? suggested : "(нет — не класс Егерь)");
