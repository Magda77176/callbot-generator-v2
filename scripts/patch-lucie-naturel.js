import { config } from 'dotenv';

config({ path: '.env.local' });

const ASSISTANT_ID = '4e8f5144-1fe0-49b0-bc05-9129e0dd4005';
const VAPI_KEY = process.env.VAPI_API_KEY;

const LUCIE_VOICE_ID = 'YxrwjAKoUKULGd0g8K9Y';

const NEW_LUCIE = {
  provider: '11labs',
  voiceId: LUCIE_VOICE_ID,
  model: 'eleven_multilingual_v2',
  language: 'fr',
  stability: 0.45,
  similarityBoost: 0.80,
  style: 0.30,
  useSpeakerBoost: true,
  speed: 1.00,
};

console.log('=== STEP 1 : GET current assistant ===');
const aRes = await fetch(`https://api.vapi.ai/assistant/${ASSISTANT_ID}`, {
  headers: { Authorization: `Bearer ${VAPI_KEY}` },
});
if (!aRes.ok) {
  console.error('GET failed:', aRes.status, await aRes.text());
  process.exit(1);
}
const assistant = await aRes.json();
const currentVoice = assistant.voice || {};
console.log('  current voiceId:', currentVoice.voiceId);
console.log('  current model:', currentVoice.model);
console.log('  current stability:', currentVoice.stability);
console.log('  current style:', currentVoice.style);
console.log('  current speed:', currentVoice.speed);

if (currentVoice.voiceId !== LUCIE_VOICE_ID) {
  console.log(
    `\n  ⚠ Bot live actuellement sur une autre voix (voiceId=${currentVoice.voiceId}).`,
  );
  console.log(
    '    Skip du PATCH live. Le preset Lucie en code est mis à jour : il suffira de cliquer "Réinitialiser" puis "Lucie" dans le tuner pour appliquer les nouvelles valeurs.',
  );
  process.exit(0);
}

console.log('\n=== STEP 2 : PATCH live bot with new Lucie params ===');
const pRes = await fetch(`https://api.vapi.ai/assistant/${ASSISTANT_ID}`, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${VAPI_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ voice: NEW_LUCIE }),
});
if (!pRes.ok) {
  console.error('PATCH failed:', pRes.status, await pRes.text());
  process.exit(1);
}
const patched = await pRes.json();
console.log('  ✓ PATCH OK');
console.log('  new stability:', patched.voice?.stability);
console.log('  new similarityBoost:', patched.voice?.similarityBoost);
console.log('  new style:', patched.voice?.style);
console.log('  new useSpeakerBoost:', patched.voice?.useSpeakerBoost);
console.log('  new speed:', patched.voice?.speed);
