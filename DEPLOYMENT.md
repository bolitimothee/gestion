# 🚀 GUIDE DE DÉPLOIEMENT

## 📋 Table des Matières
1. [Vercel](#vercel)
2. [Netlify](#netlify)
3. [VPS/Serveur](#vpsserveur)
4. [Checklist Pré-Déploiement](#checklist-pré-déploiement)

---

## ☁️ Vercel (Recommandé)

### Avantages
- Intégration GitHub/GitLab
- Déploiement automatique
- Gratuitement jusqu'à 100GB/mois
- Support React Vite
- CDN global
- Analytics inclus

### Étapes

1. **Préparer le code**
```bash
git init
git add .
git commit -m "Initial commit"
```

2. **Créer le repository GitHub**
```bash
# Sur github.com:
- New repository
- Copier les commandes
- Pousser le code
```

3. **Se connecter à Vercel**
```bash
# Option 1: Via website
- Aller sur https://vercel.com
- Sign in avec GitHub
- Import project

# Option 2: CLI
npm i -g vercel
vercel
```

4. **Configurer les variables**
Dans Vercel Dashboard > Settings > Environment Variables:
```
VITE_SUPABASE_URL = your_url
VITE_SUPABASE_ANON_KEY = your_key
```

5. **Déployer**
```
vercel --prod
```

6. **Vérifier**
```
https://your-project.vercel.app
```

---

## 🎨 Netlify

### Avantages
- Simple et rapide
- Formulaires intégrés
- Webhooks
- Gratuitement
- Support Vite

### Étapes

1. **Créer build**
```bash
npm run build
```

2. **Se connecter à Netlify**
```bash
npm i -g netlify-cli
netlify login
```

3. **Initialiser projet**
```bash
netlify init
# Ou deploy manuellement
netlify deploy --prod --dir=dist
```

4. **Configurer variables**
```
Dans Netlify:
- Site settings > Build & deploy > Environment
- Ajouter VITE_SUPABASE_URL
- Ajouter VITE_SUPABASE_ANON_KEY
```

5. **Redéployer**
```bash
npm run build
netlify deploy --prod --dir=dist
```

---

## 💻 VPS/Serveur Perso

### Prérequis
- Ubuntu 20.04+
- Node.js 16+
- nginx ou Apache
- Domain name

### Installation

1. **Se connecter au serveur**
```bash
ssh user@ip
```

2. **Installer dépendances**
```bash
sudo apt update
sudo apt install nodejs npm nginx git
```

3. **Cloner le projet**
```bash
cd /var/www
git clone https://github.com/user/gestion-commerce.git
cd gestion-commerce
```

4. **Installer et builder**
```bash
npm install --production
npm run build
```

5. **Configurer nginx**
```nginx
# /etc/nginx/sites-available/default

server {
    listen 80;
    server_name your-domain.com;

    location / {
        alias /var/www/gestion-commerce/dist/;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass https://your-project.supabase.co;
    }
}
```

6. **Redémarrer nginx**
```bash
sudo systemctl restart nginx
```

7. **Configurer SSL (HTTPS)**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d your-domain.com
```

---

## 🔐 HTTPS et Certificats SSL

### Vercel
- ✅ Automatique gratuit (Let's Encrypt)

### Netlify
- ✅ Automatique gratuit (Let's Encrypt)

### VPS Perso
```bash
sudo certbot certonly --nginx -d your-domain.com
sudo nginx -t
sudo systemctl reload nginx
```

---

## 📦 Build Optimization

```bash
# Build production
npm run build

# Vérifier taille
npm run preview

# Checker
du -sh dist/
```

Taille attendue:
- HTML: 0.5KB
- CSS: 11KB
- JS: 425KB
- Gzip total: ~124KB

---

## 🔄 CI/CD Pipeline

### GitHub Actions (Gratuit)

Créer `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel

on:
  push:
    branches:
      - main

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
      
      - name: Install dependencies
        run: npm install
      
      - name: Build
        run: npm run build
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### GitLab CI

Créer `.gitlab-ci.yml`:

```yaml
stages:
  - build
  - deploy

build:
  stage: build
  image: node:16
  script:
    - npm install
    - npm run build
  artifacts:
    paths:
      - dist/

deploy:
  stage: deploy
  image: node:16
  script:
    - npm install -g vercel
    - vercel --prod --token=$VERCEL_TOKEN
```

---

## ✅ Checklist Pré-Déploiement

### Code
- [ ] Pas d'erreurs build
- [ ] `npm run build` passe
- [ ] Pas de console.log() inutiles
- [ ] Imports corrects
- [ ] Routes définies

### Environnement
- [ ] .env.local ne pas commiter
- [ ] Variables d'env configurées
- [ ] Supabase ready
- [ ] API URL correcte
- [ ] RLS activé

### Tests
- [ ] Créer compte fonctionne
- [ ] Login fonctionne
- [ ] Dashboard s'affiche
- [ ] Stock operations OK
- [ ] Ventes fonctionnent
- [ ] Finances OK
- [ ] Responsive testé

### Performance
- [ ] Temps chargement < 3s
- [ ] Size < 500KB
- [ ] Core Web Vitals OK
- [ ] Pas d'erreurs console

### Sécurité
- [ ] HTTPS activé
- [ ] Credentials sécurisés
- [ ] CORS configuré
- [ ] CSP headers
- [ ] RLS vérifié

### Documentation
- [ ] README mis à jour
- [ ] Credentials documentés
- [ ] Guide d'accès fourni
- [ ] Support contact clair

---

## 🔧 Commandes Utiles

```bash
# Build
npm run build

# Preview
npm run preview

# Lint
npm run lint

# Vérifier deps outdated
npm outdated

# Audit sécurité
npm audit

# Update dépendances
npm update

# Clean install
rm -rf node_modules package-lock.json
npm install
```

---

## 📊 Monitoring

### Vercel Analytics
- Accès automatique dans dashboard
- Metrics temps réel
- Core Web Vitals

### Netlify Analytics
- Accès dans Site analytics
- Traffic monitoring
- Performance metrics

### Supabase Monitoring
- Supabase Dashboard > Logs
- Auth logs
- Database activity
- API usage

---

## 🆘 Troubleshooting Post-Deploy

| Problème | Solution |
|----------|----------|
| Blank page | Vérifier dist/ généré |
| 404 routes | Vérifier rewrites config |
| Variables undefined | Vérifier env variables |
| API erreur | Vérifier CORS Supabase |
| Erreurs console | Vérifier imports |

---

## 📈 Croissance Future

### Scaling horizontal
```
Vercel: Automatique
Netlify: Automatique
VPS: Load balancer + multiple nodes
```

### Database scaling
```
Supabase: Auto scale
Alternative: AWS RDS, Managed PostgreSQL
```

### CDN
```
Vercel: Inclus
Netlify: Inclus
VPS: CloudFlare free tier
```

---

## 💰 Coûts Estimés

### Vercel
- Free tier: 0€/mois
- Pro: 20$/mois
- Enterprise: Custom

### Netlify
- Free tier: 0€/mois
- Pro: 19$/mois
- Business: Custom

### Supabase
- Free tier: 0€/mois (500MB DB)
- Pro: 25$/mois (8GB DB)

### VPS Perso
- DigitalOcean: 5-50$/mois
- Linode: 5-50$/mois
- Hetzner: 3-20$/mois

---

## 🎯 Recommandations

**Pour commencer**: Vercel (Gratuit, simple, performant)

**Pour scalabilité**: VPS + Supabase Pro

**Pour flexibilité**: Netlify + custom domain

---

**Prêt à déployer!** 🚀
