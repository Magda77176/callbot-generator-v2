// Catalogue Cartesia FR sélectionné pour accueil téléphonique.
// Source : scripts/list-cartesia-voices.js (API Cartesia, language=fr).
// Critères de tri : chaleureux, fluide, conversationnel, non-corporate.

import type { Sector } from './callbot-configs';

export type VoiceGender = 'male' | 'female';

export interface CartesiaVoice {
  id: string;
  name: string;
  gender: VoiceGender;
  description: string;
}

export const CARTESIA_VOICES: CartesiaVoice[] = [
  {
    id: 'ab7c61f5-3daa-47dd-a23b-4ac0aac5f5c3',
    name: 'Friendly French Man',
    gender: 'male',
    description: 'Chaleureux et calme — profil parfait pour accueil support client',
  },
  {
    id: '80e11491-2d8a-4361-ac61-c4f3e0a4f7e7',
    name: 'Vincent',
    gender: 'male',
    description: 'Énergique et engageant — idéal pour conversations dynamiques',
  },
  {
    id: 'ce74c4da-4aee-435d-bc6d-81d1a9367e12',
    name: 'Marc — Conversational Buddy',
    gender: 'male',
    description: 'Amical et détendu — registre conversationnel naturel',
  },
  {
    id: 'cc4276e6-1ebc-429a-8c7d-930993d51abc',
    name: 'Julien — Polished Partner',
    gender: 'male',
    description: 'Professionnel et chaleureux — assistance fiable',
  },
  {
    id: '65b25c5d-ff07-4687-a04c-da2f43ef6fa9',
    name: 'Helpful French Lady',
    gender: 'female',
    description: 'Serviable et enjouée — comme parler à une amie',
  },
  {
    id: '6c64b57a-bc65-48e4-bff4-12dbe85606cd',
    name: 'Eloise — Dialogue Anchor',
    gender: 'female',
    description: 'Claire, posée, ton chaleureux — service client impeccable',
  },
  {
    id: '735287ee-ce91-4b08-8de4-63315c5ba1fb',
    name: 'Emmanuelle',
    gender: 'female',
    description: 'Jeune, dynamique, amicale — parfait pour conversations légères',
  },
  {
    id: '187d1cc5-a771-4ccd-9110-9df8c4e39499',
    name: 'Mika — Empathetic Friend',
    gender: 'female',
    description: 'Amicale et empathique — ton rassurant',
  },
];

export const DEFAULT_VOICE_BY_PERSONA: Record<Sector, string> = {
  restaurant: 'ab7c61f5-3daa-47dd-a23b-4ac0aac5f5c3', // Marco → Friendly French Man
  coiffeur: '65b25c5d-ff07-4687-a04c-da2f43ef6fa9', // Léa → Helpful French Lady
  dentaire: 'cc4276e6-1ebc-429a-8c7d-930993d51abc', // Tom → Julien (professionnel + chaleureux)
  immobilier: '80e11491-2d8a-4361-ac61-c4f3e0a4f7e7', // Alex → Vincent (énergie commerciale)
  ecommerce: '6c64b57a-bc65-48e4-bff4-12dbe85606cd', // Sophie → Eloise (service client)
};

export const DEFAULT_VOICE_ID = DEFAULT_VOICE_BY_PERSONA.restaurant;

export function getVoiceById(id: string): CartesiaVoice | undefined {
  return CARTESIA_VOICES.find((v) => v.id === id);
}

export function getVoicesByGender(gender: VoiceGender): CartesiaVoice[] {
  return CARTESIA_VOICES.filter((v) => v.gender === gender);
}
