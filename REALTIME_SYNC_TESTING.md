# Guide de Test - Synchronisation en Temps Réel Multi-Session

## 🎯 Objectif

Vérifier que **TOUTES les informations enregistrées sur un compte sont synchronisées en temps réel sur TOUTES les sessions ouvertes** du même compte.

## 📋 Prérequis

1. ✅ Migration Supabase exécutée (`MIGRATION_DEVISE.sql`)
2. ✅ Base de données avec RLS active
3. ✅ Hooks de synchronisation en temps réel intégrés
4. ✅ Application React lancée et compilée sans erreurs

## 🔧 Configuration de Test

### Ouvrir Plusieurs Sessions

1. **Lancer l'application**
   ```bash
   npm run dev
   ```

2. **Ouvrir 3 onglets dans le navigateur**
   - Tab 1: http://localhost:5173
   - Tab 2: http://localhost:5173 (Ctrl+T)
   - Tab 3: http://localhost:5173 (Ctrl+T)

3. **Se connecter avec le même compte sur les 3 onglets**
   - Email: test@example.com
   - Mot de passe: [votre mot de passe]

### Vérifier les Connexions

```javascript
// Dans la console (F12), chaque onglet doit afficher:
// ✅ User ID: [identifiant unique]
// ✅ Account ID: [identifiant du compte]
// ✅ Currency: USD (ou autre)
```

---

## ✅ Test 1: Synchronisation des Produits (Stock)

### Test 1A: Ajouter un Produit

**Tab 1 (Créateur):**
1. Aller à `/stock`
2. Cliquer sur "Ajouter un produit"
3. Remplir le formulaire:
   - Nom: "Test Product 001"
   - Quantité: 10
   - Prix d'achat: 100
   - Prix de vente: 150
4. Cliquer "Enregistrer"
5. ✅ Produit visible dans Tab 1

**Tab 2 (Observateur):**
- ⏱️ Attendre 1-2 secondes
- ✅ Le produit "Test Product 001" doit **apparaître automatiquement**
- ❌ Pas besoin de rafraîchir (F5)

**Tab 3 (Observateur):**
- ✅ Le produit doit aussi être visible

### Test 1B: Modifier un Produit

**Tab 1:**
1. Cliquer sur "Éditer" du produit "Test Product 001"
2. Changer Quantité: 10 → 25
3. Cliquer "Enregistrer"

**Tab 2 & Tab 3:**
- ⏱️ Attendre 1-2 secondes
- ✅ Quantité passe de 10 à 25 **en temps réel**
- ❌ Pas de rafraîchissement manuel nécessaire

### Test 1C: Supprimer un Produit

**Tab 1:**
1. Cliquer sur l'icône Poubelle pour "Test Product 001"
2. Confirmer la suppression

**Tab 2 & Tab 3:**
- ⏱️ Attendre 1-2 secondes
- ✅ Le produit disparaît de la liste
- ✅ La liste se met à jour automatiquement

---

## ✅ Test 2: Synchronisation des Ventes (Sales)

### Test 2A: Enregistrer une Vente

**Tab 1:**
1. Aller à `/sales`
2. Cliquer sur "Nouvelle vente"
3. Remplir:
   - Produit: "Test Product 001"
   - Quantité: 2
   - Client: "Client Test A"
   - Date/Heure: Aujourd'hui
4. "Enregistrer"

**Tab 2 & Tab 3:**
- ✅ La vente apparaît dans la table
- ✅ Historique des ventes mis à jour

### Test 2B: Modifier une Vente

**Tab 1:**
1. Cliquer "Éditer" sur la vente
2. Changer Client: "Client Test A" → "Client Test B"
3. "Enregistrer"

**Tab 2 & Tab 3:**
- ✅ Nom du client mis à jour en temps réel

### Test 2C: Supprimer une Vente

**Tab 1:**
1. Cliquer Poubelle sur la vente
2. Confirmer

**Tab 2 & Tab 3:**
- ✅ La vente disparaît instantanément

---

## ✅ Test 3: Synchronisation des Finances (Expenses)

### Test 3A: Ajouter une Dépense

**Tab 1:**
1. Aller à `/finances`
2. Cliquer "Nouveau frais"
3. Remplir:
   - Description: "Frais de shipping"
   - Montant: 50
   - Catégorie: "Transport"
4. "Enregistrer"

**Tab 2 & Tab 3:**
- ✅ Dépense visible dans la liste
- ✅ Total dépenses mis à jour

### Test 3B: Modifier une Dépense

**Tab 1:**
1. Éditer la dépense
2. Changer Montant: 50 → 75
3. "Enregistrer"

**Tab 2 & Tab 3:**
- ✅ Montant mis à jour (50 → 75)

### Test 3C: Supprimer une Dépense

**Tab 1:** Supprimer la dépense

**Tab 2 & Tab 3:**
- ✅ Disparition instantanée

---

## ✅ Test 4: Synchronisation du Compte & Devise

### Test 4A: Changer la Devise

**Tab 1 (Dashboard):**
1. Aller à `/dashboard`
2. Sélectionner Devise: "EUR" (Euro)
3. Tous les montants convertibles en EUR

**Tab 2 (Observateur):**
- ✅ Sélecteur devise passe aussi à "EUR"
- ✅ SANS rafraîchir la page
- ✅ Tous les montants convertis

**Tab 3 (Autre Page):**
1. Aller à `/stock` ou `/sales`
2. ✅ Les prix sont affichés en EUR
3. ✅ Conversion automatique

### Test 4B: Vérifier la Persistence

**Tous les onglets:**
1. Fermer les 3 onglets
2. Rouvrir l'application
3. Se reconnecter

✅ Devise sauvegardée: "EUR" doit être sélectionnée par défaut

---

## ✅ Test 5: Scénario Complexe Multi-Session

### Simulation Réaliste d'Utilisateur

**Moment 1 - 3 onglets ouverts, connectés**

**Tab 1 (Gestion des stocks):**
- Ajouter 5 produits différents

**Tab 2 (Enregistrement ventes - en même temps):**
- Observer que les produits apparaissent
- Enregistrer 3 ventes de produits

**Tab 3 (Dashboard/Finances):**
- Observer que statistiques se mettent à jour
- Changer de devise (USD → XAF)

✅ **Résultat attendu:** Tous les onglets affichent:
- Tab 1: Les 5 produits
- Tab 2: Les 3 ventes + prix en XAF
- Tab 3: Stats mises à jour, devise = XAF

### Test de Latence

```javascript
// Mesurer le temps de synchronisation (F12 Console):
console.time('sync');
// Créer un produit dans Tab 1
// Attendre qu'il apparaisse dans Tab 2
console.timeEnd('sync');

// ✅ Acceptable: < 2 secondes
// ⚠️ Lent: 2-5 secondes
// ❌ Problème: > 5 secondes
```

---

## 🔍 Débogage - Vérification des Souscriptions

### Console Browser (F12)

Ajouter ce code dans chaque Tab pour vérifier les souscriptions actives:

```javascript
// Vérifier les souscriptions Supabase
const supabase = window.__supabase;
console.log('Souscriptions actives:', supabase?.subscriptions);

// Écouter les changements en temps réel
console.log('Logs de synchronisation activés');
```

### Vérifier les Erreurs

**Tab 1:**
1. F12 → Console
2. Chercher des erreurs rouges
3. ✅ Pas d'erreur =  Correctif

**Erreurs courantes:**
- `Auth token missing` → Se reconnecter
- `Row-level security violation` → Problema RLS Supabase
- `Subscription failed` → Vérifier internet

---

## 📊 Matrice de Test

| Fonctionnalité | Tab 1 | Tab 2 | Tab 3 | Résultat |
|---|---|---|---|---|
| Ajouter Produit | ✅ Source | Auto-maj | Auto-maj | 🟢 PASS |
| Éditer Produit | ✅ Source | Auto-maj | Auto-maj | 🟢 PASS |
| Supprimer Produit | ✅ Source | Auto-maj | Auto-maj | 🟢 PASS |
| Enregistrer Vente | ✅ Source | Auto-maj | Auto-maj | 🟢 PASS |
| Modif Vente | ✅ Source | Auto-maj | Auto-maj | 🟢 PASS |
| Supprimer Vente | ✅ Source | Auto-maj | Auto-maj | 🟢 PASS |
| Ajouter Dépense | ✅ Source | Auto-maj | Auto-maj | 🟢 PASS |
| Changer Devise | ✅ Source | Auto-maj | Auto-maj | 🟢 PASS |

---

## ✅ Checklist Finale

- [ ] **Test 1A:** Produit ajouté visible dans tous les onglets
- [ ] **Test 1B:** Modification produit synchronisée
- [ ] **Test 1C:** Suppression produit synchronisée
- [ ] **Test 2A:** Vente enregistrée dans tous les onglets
- [ ] **Test 2B:** Modification vente synchronisée
- [ ] **Test 2C:** Suppression vente synchronisée
- [ ] **Test 3A:** Dépense visible dans tous les onglets
- [ ] **Test 3B:** Modification dépense synchronisée
- [ ] **Test 3C:** Suppression dépense synchronisée
- [ ] **Test 4A:** Devise changée synchronisée
- [ ] **Test 4B:** Devise persistante après reconnexion
- [ ] **Test 5:** Scénario complexe multi-session réussi
- [ ] **Latence:** < 2 secondes en moyenne
- [ ] **Console:** Aucune erreur critique

---

## 📝 Rapport de Test

Créer un fichier `TEST_REPORT_[DATE].md`:

```markdown
# Rapport de Test Synchronisation Temps Réel

Date: 2024-01-XX
Testeur: [Votre nom]
Navigateur: [Chrome/Firefox/Safari]
Système: Windows/Mac/Linux

## Résumé
✅ 8/8 fonctionnalités testées avec succès

## Anomalies
Aucune

## Performance
- Latence moyenne: 1.2s
- Latence max: 1.8s

## Conclusion
✅ SYSTÈME OPÉRATIONNEL - Prêt pour production
```

---

## 🚀 Production Checklist

Avant de déployer sur Vercel:

- [ ] Tous les tests réussis
- [ ] Pas d'erreurs console
- [ ] MIGRATION_DEVISE.sql exécutée en production
- [ ] RLS correctement configurée
- [ ] Vercel environment variables mises à jour
- [ ] `npm run build` sans erreurs
- [ ] Aucune fuite de données entre utilisateurs

---

## Support

Si syncro ne fonctionne pas:

1. **Vérifier logs Supabase**
   - Dashboard Supabase → Logs
   - Chercher erreurs RLS

2. **Vérifier migration SQL**
   - Colonnes `preferred_currency` existent ?
   - Indices créés ?

3. **Tester sans cache**
   - Ctrl+Shift+Delete → Clear cache
   - Ctrl+Shift+R → Force refresh

4. **Vérifier connexion**
   - Tab 1 logout/login
   - Tab 2 logout/login
   - Retry test

5. **Consulter logs React**
   ```javascript
   localStorage.setItem('DEBUG', 'true');
   // Rafraîchir pour activer les logs détaillés
   ```
