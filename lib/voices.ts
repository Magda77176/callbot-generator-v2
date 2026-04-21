// TODO: valider d'autres voix FR via https://play.cartesia.ai/voices et les ajouter ici

export interface VoiceOption {
  id: string;
  name: string;
  gender: 'F' | 'M';
  description: string;
}

export const FRENCH_VOICES: VoiceOption[] = [
  {
    id: 'a8a1eb38-5f15-4c1d-8722-7ac0f329727d',
    name: 'Claire',
    gender: 'F',
    description: 'Voix féminine naturelle (sonic-multilingual)',
  },
];

export const DEFAULT_VOICE_ID = FRENCH_VOICES[0].id;
