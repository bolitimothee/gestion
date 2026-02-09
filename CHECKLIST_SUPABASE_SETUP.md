# ✅ CHECKLIST: Corriger le "AbortError"

## 🎯 PROBLÈME
```
AbortError: signal is aborted without reason
```
**Cause:** Les tables Supabase n'existent pas - le SQL d'initialisation n'a jamais été exécuté.

---

## 🚀 SOLUTION RAPIDE (6 minutes)

### [ ] Étape 1: Ouvrir Supabase (1 minute)
- [ ] Aller sur: https://supabase.com/dashboard
- [ ] Sélectionner votre projet
- [ ] Cliquer: **SQL Editor**

### [ ] Étape 2: Créer les tables (3 minutes)
- [ ] Cliquer: **New Query**
- [ ] Ouvrir: `SUPABASE_FINAL_COMPLET.sql` (dans la racine du projet)
- [ ] Sélectionner TOUT (`Ctrl+A`)
- [ ] Copier (`Ctrl+C`)
- [ ] Aller dans Supabase SQL Editor
- [ ] Coller (`Ctrl+V`)
- [ ] Cliquer: **Run** (button vert)

### [ ] Étape 3: Attendre la confirmation
- [ ] Vérifier que les messages disent: `✓ successful`
- [ ] **NE PAS** ignorer les messages d'erreur en rouge

### [ ] Étape 4: Activer Real-Time (1 minute)
- [ ] Aller à: **Settings → Replication**
- [ ] Cocher:
  - [ ] accounts
  - [ ] products
  - [ ] sales
  - [ ] expenses
  - [ ] customers
- [ ] Cliquer: **Save**

### [ ] Étape 5: Tester sur votre machine (1 minute)
```bash
# Fermer le serveur si actif (Ctrl+C)
npm run dev
```

- [ ] Ouvrir: http://localhost:5173
- [ ] Essayer de créer un compte
- [ ] Aucune erreur AbortError? ✅ **Succès!**

---

## 📊 VÉRIFICATION

### Option A: Via couleur des pages
- Allez à: `/stock` → Si les produits s'affichent = **OK** ✅
- Allez à: `/sales` → Si les ventes s'affichent = **OK** ✅
- Allez à: `/finances` → Si les dépenses s'affichent = **OK** ✅

### Option B: Via page diagnostic (avancé)
```bash
npm run dev
# Ouvrir: http://localhost:5173/diagnostic
```

Tous les tests doivent être **verts** (✅)

---

## ⚠️ SI CELA NE FONCTIONNE TOUJOURS PAS

### Problème: Erreur SQL "syntax error"
- **Solution:** Copier-coller **TOUT** le fichier `SUPABASE_FINAL_COMPLET.sql`
- Certaines parties ne doivent pas être exécutées partiellement

### Problème: Erreur "Permission denied"
- **Solution:** Se déconnecter/reconnecter sur supabase.com/dashboard
- Refresh de la page (F5)

### Problème: Fermer le terminal et redémarrer
```bash
Ctrl+C                    # Arrêter le serveur
npm run dev              # Redémarrer
```

### Problème: Vider le cache
```bash
# Sur Windows:
del node_modules\.vite
# Puis:
npm run dev
```

---

## 🎉 QUAND C'EST FAIT

Tous les systèmes doivent fonctionner:

✅ Créer un nouveau compte
✅ Ajouter des produits
✅ Enregistrer une vente
✅ Ajouter une dépense
✅ Changer la devise → tous les montants se convertissent
✅ Ouvrir un autre onglet → synchronisation en temps réel

---

**👉 Dès que le SQL est exécuté avec succès, répondez: "✅ Schéma Supabase créé et testé!"**
