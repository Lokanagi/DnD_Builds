import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "@/app/Layout";
import { CampaignGate } from "@/features/campaigns/CampaignGate";
import { CharactersPage } from "@/features/characters/CharactersPage";
import { MadnessPage } from "@/features/madness/MadnessPage";
import { MoonsPage } from "@/features/moons/MoonsPage";
import { XpPage } from "@/features/xp/XpPage";
import { BestiaryPage } from "@/features/bestiary/BestiaryPage";

export function App() {
  return (
    <CampaignGate>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/characters" replace />} />
          <Route path="/characters" element={<CharactersPage />} />
          <Route path="/madness" element={<MadnessPage />} />
          <Route path="/moons" element={<MoonsPage />} />
          <Route path="/xp" element={<XpPage />} />
          <Route path="/bestiary" element={<BestiaryPage />} />
        </Route>
      </Routes>
    </CampaignGate>
  );
}
