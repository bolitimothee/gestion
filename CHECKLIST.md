# ✅ CHECKLIST DE MISE EN PRODUCTION

## Phase 1: Configuration (À faire une fois)

### Supabase Setup
- [ ] Créer compte Supabase
- [ ] Créer nouveau projet
- [ ] Récupérer URL et clé anon
- [ ] Exécuter supabase-schema.sql
- [ ] Vérifier les tables créées
- [ ] Vérifier les politiques RLS

### Configuration Locale
- [ ] Créer .env.local
- [ ] Ajouter VITE_SUPABASE_URL
- [ ] Ajouter VITE_SUPABASE_ANON_KEY
- [ ] npm install (déjà fait)
- [ ] npm run dev fonctionne
- [ ] Aucune erreur dans la console

### Premier Test
- [ ] Créer un compte de test
- [ ] Se connecter avec le compte
- [ ] Ajouter 3 produits
- [ ] Enregistrer 2 ventes
- [ ] Ajouter 1 dépense
- [ ] Vérifier le Dashboard

---

## Phase 2: Validation Fonctionnelle

### Authentification
- [ ] Inscription fonctionne
- [ ] Validation email fonctionne
- [ ] Connexion fonctionne
- [ ] Date de validité vérifié
- [ ] Logout fonctionne
- [ ] Redirection login automatique si déconnecté

### Gestion des Stocks
- [ ] Ajouter produit fonctionne
- [ ] Modifier produit fonctionne
- [ ] Supprimer produit fonctionne
- [ ] Les quantités se mettent à jour
- [ ] Les prix se calculent
- [ ] SKU unique

### Gestion des Ventes
- [ ] Enregistrer vente fonctionne
- [ ] Quantités se déduisent du stock
- [ ] Montants calculés correctement
- [ ] Historique ventes visible
- [ ] Dernières ventes au dashboard

### Rapports Financiers
- [ ] Ajouter dépense fonctionne
- [ ] Montants affichés correctement
- [ ] CA - Dépenses = Profit calculé
- [ ] Historique dépenses visible
- [ ] Résumé financier à jour

### Dashboard
- [ ] 4 KPIs affichés
- [ ] Dernières ventes visibles
- [ ] Nombres mettent à jour
- [ ] Pas d'erreurs console
- [ ] Responsive sur mobile

---

## Phase 3: Tests de Sécurité

### Authentification
- [ ] Pas de plain text passwords
- [ ] Sessions expirées correctement
- [ ] Compte expiré = accès refusé
- [ ] Deux comptes isolés

### Autorisation (RLS)
- [ ] User A ne voit pas données User B
- [ ] Impossible accéder API d'autres users
- [ ] Impossible modifier données autres
- [ ] Politiques RLS en place

### Données
- [ ] Chiffrement en transit (HTTPS)
- [ ] Pas d'exposition de credentials
- [ ] .env.local dans .gitignore
- [ ] Pas de secrets dans code

---

## Phase 4: Performance

### Frontend
- [ ] Chargement < 3 secondes
- [ ] Mobile responsive
- [ ] Pas de lag UI
- [ ] Animations fluides
- [ ] Pas d'erreurs console

### Backend
- [ ] Requêtes < 1 seconde
- [ ] Pas de timeouts
- [ ] RLS performant
- [ ] DB optimisée

---

## Phase 5: Compatibilité Navigateurs

### Desktop
- [ ] Chrome ✓
- [ ] Firefox ✓
- [ ] Safari ✓
- [ ] Edge ✓

### Mobile
- [ ] iPhone/Safari
- [ ] Android/Chrome
- [ ] Responsive design
- [ ] Touch friendly

---

## Phase 6: Déploiement (Optional)

### Avant Déploiement
- [ ] npm run build réussi
- [ ] Pas d'erreurs build
- [ ] Dist folder généré
- [ ] Variables d'env configurées

### Sur Vercel
- [ ] Repository connecté
- [ ] Variables d'env ajoutées
- [ ] Build réussi
- [ ] Site accessible
- [ ] Fonctionnalités testées

---

## Phase 7: Maintenance

### Sauvegardes
- [ ] Backups Supabase activés
- [ ] Fréquence de backup: quotidienne
- [ ] Test restore backup

### Monitoring
- [ ] Erreurs Supabase vérifiées
- [ ] Logs consultés régulièrement
- [ ] Performance vérifiée
- [ ] Disponibilité confirmée

### Mises à Jour
- [ ] npm audit exécuté
- [ ] Dépendances à jour
- [ ] Pas de vulnérabilités
- [ ] Tests après update

---

## Checklist Rapide (Pour relancer après)

```bash
# À chaque démarrage
- [ ] npm install
- [ ] npm run dev
- [ ] Créer 1 vente
- [ ] Vérifier Dashboard
```

---

## Points Critiques à Vérifier

🔴 **CRITIQUE**
- [ ] Supabase configuré correctement
- [ ] .env.local existe
- [ ] RLS activé
- [ ] Authentification fonctionne

🟡 **IMPORTANT**
- [ ] Dashboard affiche les données
- [ ] Deux comptes isolés
- [ ] Performance acceptable
- [ ] Pas d'erreurs console

🟢 **BONUS**
- [ ] Export PDF
- [ ] Graphiques
- [ ] Email notifications
- [ ] Responsive tablet

---

## Troubleshooting Rapide

| Erreur | Solution |
|--------|----------|
| "URL is required" | Vérifier .env.local |
| "Permission denied" | Vérifier RLS Supabase |
| Pas de données | Vérifier user_id dans tables |
| Erreur build | npm install, npm run build |
| 404 routes | Vérifier App.jsx Routes |

---

## Sign-Off

- [ ] Développeur: Code fini et testé
- [ ] QA: Tous les tests passent
- [ ] Devops: Déploiement OK
- [ ] Product: Features validées
- [ ] Client: Satisfait

---

**Date de validation:** _______________
**Version:** 1.0.0
**Status:** ⬜ En cours / ⬜ Testé / ⬜ En prod

---

Une fois que tout est ✓, l'application est prête!
