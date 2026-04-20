# 💾 Backup & Rollback Guide — CallBot Tom

## Backup créé le 16 Avril 2026

### Point de sauvegarde
- **Tag**: `backup-callbot-tom-20260416-084340`
- **Branche**: `backup-callbot-tom`
- **État**: Tous les fichiers CallBot Tom sur main

### Fichiers inclus dans le backup
✅ README.md
✅ INTEGRATION.md
✅ API.md
✅ TROUBLESHOOTING.md
✅ CONTRIBUTING.md
✅ system-prompt.txt (avec validation temporelle stricte)
✅ example-config.json
✅ TEMPORAL_VALIDATION_TEST.md

---

## 🔄 Comment restaurer en cas de régression

### Option 1: Restaurer depuis la branche backup (RECOMMANDÉ)

```bash
# Voir l'état du backup
git checkout backup-callbot-tom

# Si tout va bien, fusionner dans main
git checkout main
git merge backup-callbot-tom

# Pusher
git push origin main
```

### Option 2: Restaurer depuis le tag

```bash
# Créer une nouvelle branche depuis le tag
git checkout -b restore-from-backup backup-callbot-tom-20260416-084340

# Vérifier que tout est comme prévu
git diff main projects/callbot-tom/

# Si OK, fusionner dans main
git checkout main
git merge restore-from-backup
git push origin main
```

### Option 3: Reset hard (ATTENTION - déstructif)

```bash
# ⚠️ Cela supprime TOUS les changements après le backup
git reset --hard backup-callbot-tom-20260416-084340
git push origin main --force

# ⚠️ UTILISEZ SEULEMENT EN CAS D'URGENCE ABSOLUE
```

---

## ✅ Checklist avant restauration

- [ ] Vérifier que c'est vraiment nécessaire (régression confirmée)
- [ ] Sauvegarder les logs/données importantes
- [ ] Commiter tout travail en cours sur une autre branche
- [ ] Informer l'équipe de la restauration
- [ ] Vérifier les tests après restauration

---

## 📋 Comparaison backup vs main

```bash
# Voir les différences
git diff main backup-callbot-tom -- projects/callbot-tom/

# Voir les commits depuis le backup
git log backup-callbot-tom..main --oneline

# Voir les fichiers modifiés
git diff --name-only main backup-callbot-tom
```

---

## 🆘 En cas de problème majeur

**Contactez Sasha immédiatement avec:**
- Timestamp du problème
- Quel fichier a buggé
- Type de régression (dates, appels, données, etc.)

Restore depuis backup est toujours possible! 💪
