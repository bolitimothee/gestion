# 🚀 DÉMARRAGE RAPIDE - 5 MINUTES

## Étape 1: Préparer Supabase (5 min)
```
1. Aller sur https://supabase.com et créer un compte
2. Créer un nouveau projet
3. Aller à Settings > API
4. Copier Project URL et anon key
```

## Étape 2: Configurer le Projet (2 min)
```
1. Créer un fichier .env.local
2. Ajouter:
   VITE_SUPABASE_URL=votre_url
   VITE_SUPABASE_ANON_KEY=votre_clé
```

## Étape 3: Exécuter le Script SQL (2 min)
```
1. Dans Supabase > SQL Editor > New Query
2. Copier-coller: supabase-schema.sql
3. Cliquer sur Run
```

## Étape 4: Lancer l'App (1 min)
```bash
npm install
npm run dev
```

## Étape 5: Tester (1 min)
```
1. Aller à http://localhost:5173/register
2. Créer un compte test
3. Ajouter un produit et une vente
4. Vérifier le Dashboard
```

✅ Terminé! Votre application est prête à l'emploi.

---

## 📁 Fichiers Importants

- **SUPABASE_CONFIG.md**: Configuration détaillée de Supabase
- **GUIDE_UTILISATION.md**: Guide complet d'utilisation
- **supabase-schema.sql**: Script de création des tables
- **README.md**: Documentation du projet

## 🆘 Problèmes Courants

### "Supabase URL is required"
→ Vérifier .env.local et redémarrer (npm run dev)

### "Permission denied"
→ Vérifier les politiques RLS dans Supabase

### Pas de données affichées
→ Vérifier que les tables existent dans Supabase

---

Pour l'aide complète, consultez GUIDE_UTILISATION.md
