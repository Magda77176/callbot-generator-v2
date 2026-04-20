# Test de Validation Temporelle — CallBot Tom

## Objectif
Vérifier que Tom rejette JAMAIS les dates/heures dans le passé.

## Cas de Test

### Test 1: Heure passée aujourd'hui
**Scénario**: On appelle à 14h30, patient propose "aujourd'hui à 13h"
**Résultat attendu**: ❌ REJETER
```
Patient: "Aujourd'hui à 13h"
Tom: "Vous proposez 13h, mais il est déjà 14h30. 
     Pouvez-vous proposer une heure APRÈS 14h30?"
```

### Test 2: Hier
**Scénario**: Patient propose "hier"
**Résultat attendu**: ❌ REJETER IMMÉDIATEMENT
```
Patient: "Hier à 15h"
Tom: "Hier, c'est dans le passé. Je peux seulement proposer 
     des rendez-vous à partir de MAINTENANT ou PLUS TARD."
```

### Test 3: Heure valide (après maintenant)
**Scénario**: On appelle à 14h30, patient propose "aujourd'hui à 16h"
**Résultat attendu**: ✅ ACCEPTER
```
Patient: "Aujourd'hui à 16h"
Tom: "D'accord, rendez-vous aujourd'hui à 16h. C'est confirmé?"
```

### Test 4: Demain
**Scénario**: Patient propose "demain à 10h"
**Résultat attendu**: ✅ ACCEPTER
```
Patient: "Demain à 10h"
Tom: "D'accord, rendez-vous demain à 10h. C'est confirmé?"
```

### Test 5: Heure ambiguë (trop tôt)
**Scénario**: On appelle à 14h30, patient dit "8h du matin"
**Résultat attendu**: ❌ REJETER si même jour, ✅ ACCEPTER si jour futur
```
Si patient dit "8h" sans spécifier jour:
Tom: "Vous voulez dire 8h demain matin? Ou à une autre date?"
```

## Algorithme (strictement validé)

```javascript
function validateDateTime(proposedDateTime, currentDateTime) {
  // JAMAIS accepter si proposedDateTime ≤ currentDateTime
  if (proposedDateTime <= currentDateTime) {
    return {
      valid: false,
      reason: "PAST_DATE_TIME",
      message: "Cette date/heure est dans le passé. Proposez une date FUTURE."
    };
  }
  
  // Accepter seulement si proposedDateTime > currentDateTime
  return {
    valid: true,
    reason: "FUTURE_DATE_TIME"
  };
}
```

## Fréquence des tests

- ✅ Avant chaque appel de test
- ✅ Après chaque modification du system-prompt
- ✅ En production (vérifier les logs)
- ✅ Hebdomadairement sur des appels réels

## Logs à vérifier

Chercher dans les logs Vapi:
```
[VALIDATION] Timestamp comparison: proposed=2026-04-17T14:00:00Z current=2026-04-16T14:30:00Z
[ACCEPTED] Future date/time validated
```

Si vous voyez:
```
[VALIDATION] Timestamp comparison: proposed=2026-04-16T13:00:00Z current=2026-04-16T14:30:00Z
[ERROR] PAST DATE PROPOSED - REJECTING
```

C'est que la validation fonctionne ✅

## Alertes à configurer

Sur le dashboard Vapi, créer une alerte:
- **Type**: Error
- **Condition**: Message contains "PAST_DATE" ou "timestamp ≤"
- **Action**: Notifier équipe Mindy
