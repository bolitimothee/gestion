# 🚀 GUIDE DÉPLOIEMENT VERCEL

## ✅ Prérequis
- ✅ Code poussé sur GitHub (https://github.com/bolitimothee/gestion)
- ✅ Compte Vercel créé
- ✅ Vercel.json configuré
- ✅ Variables d'environnement Supabase

---

## 📍 Étape 1: Accéder à Vercel

1. Allez sur **https://vercel.com**
2. Cliquez sur **"Sign in"** 
3. Connectez-vous avec **GitHub**

---

## 📍 Étape 2: Créer un Nouveau Projet

1. Cliquez sur **"Add new..."** → **"Project"**
2. Trouvez le dépôt `bolitimothee/gestion`
3. Cliquez sur **"Import"**

---

## 📍 Étape 3: Configurer le Projet

### Variables d'Environnement
Ajouter dans **"Environment Variables"**:

```
VITE_SUPABASE_URL = https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY = your-anon-key
```

*(Récupérer depuis Supabase Settings → API)*

### Paramètres de Build
- **Framework Preset**: Vite (détecté automatiquement)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Node.js Version**: 18.x ou 20.x

---

## 📍 Étape 4: Déployer

1. Cliquez sur **"Deploy"**
2. Attendez le build (2-5 minutes)
3. Votre app est en ligne** 🎉

**URL**: https://gestion-bolitimothee.vercel.app

---

## 📍 Déploiements Futurs

- **Automatique**: Chaque push sur `main` redéploie
- **Manuel**: Via le dashboard Vercel
- **CLI**: `vercel` ou `vercel --prod`

---

## 🔧 Dépannage

### Erreur: "Build failed"
```bash
# Vérifier localement
npm run build
npm run build

# Vérifier package.json et vite.config.js
```

### Erreur: "Cannot find module"
```bash
# Vérifier que toutes les dépendances sont dans package.json
npm install

# Pousser sur GitHub
git add package-lock.json
git commit -m "Update dependencies"
git push
```

### Variables d'environ non reconnues
- Vérifier que `VITE_` est le préfixe
- Redéployer après modifications: **"Redeploy"** dans Vercel

---

## 📊 Monitoring

1. Dashboard Vercel → Projet
2. **Analytics**: Traffic, Performance
3. **Deployments**: Historique des déploiements
4. **Logs**: Erreurs et messages

---

## ✅ Checklist Avant Déploiement

- [ ] Code poussé sur GitHub
- [ ] Variables d'env dans Vercel
- [ ] Build local réussit (`npm run build`)
- [ ] Pas d'erreurs ESLint
- [ ] Index.html bien configuré
- [ ] Routes React Router fonctionnent
- [ ] Connexion Supabase testée

---

## 🎯 URL de Production

```
https://gestion-bolitimothee.vercel.app
```

Mettre à jour dans vos favoris et partager! 🚀
