# Gestion de Commerce - Application Complète

Une application web complète de gestion de commerce avec authentification, gestion des stocks, suivi des ventes et rapports financiers.

## 🌟 Fonctionnalités

### Authentification et Gestion des Comptes
- ✅ Inscription avec email et mot de passe
- ✅ Authentification sécurisée via Supabase
- ✅ Dates de validité des comptes
- ✅ Gestion des comptes utilisateurs

### Gestion des Stocks
- ✅ Ajouter, modifier et supprimer des produits
- ✅ Suivi des quantités en stock
- ✅ Catégorisation des produits
- ✅ Calcul automatique de la valeur totale du stock

### Gestion des Ventes
- ✅ Enregistrement des ventes
- ✅ Suivi des clients
- ✅ Historique des ventes
- ✅ Calcul automatique des montants

### Rapports Financiers
- ✅ Suivi des dépenses
- ✅ Calcul du chiffre d'affaires
- ✅ Calcul du bénéfice net
- ✅ Résumés financiers détaillés

### Tableau de Bord
- ✅ Vue d'ensemble des statistiques clés
- ✅ Dernières ventes
- ✅ Indicateurs financiers
- ✅ Valeur du stock en temps réel

## 🚀 Installation

### Prérequis
- Node.js (v14 ou supérieur)
- npm ou yarn
- Un compte Supabase

### Étapes d'installation

1. **Installer les dépendances**
```bash
npm install
```

2. **Configurer Supabase**
   - Créer un compte sur https://supabase.com
   - Créer un nouveau projet
   - Copier l'URL et la clé anon du projet
   - Exécuter le script SQL fourni (supabase-schema.sql) dans l'éditeur SQL de Supabase

3. **Configurer les variables d'environnement**
   - Créer un fichier .env.local à la racine du projet
   - Ajouter vos credentials Supabase:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

4. **Lancer l'application**
```bash
npm run dev
```

L'application sera accessible à http://localhost:5173

## 📁 Structure du Projet

```
src/
├── components/          # Composants réutilisables
│   ├── Navbar.jsx
│   ├── Sidebar.jsx
│   └── StatCard.jsx
├── pages/              # Pages principales
│   ├── Login.jsx
│   ├── Register.jsx
│   ├── Dashboard.jsx
│   ├── Stock.jsx
│   ├── Sales.jsx
│   └── Finances.jsx
├── services/           # Services API
│   ├── supabaseClient.js
│   ├── authService.js
│   ├── stockService.js
│   ├── salesService.js
│   └── financeService.js
├── context/            # Contexte React
│   └── AuthContext.jsx
├── styles/             # Styles CSS
│   └── globals.css
├── utils/              # Utilitaires
│   └── formatters.js
├── App.jsx
└── main.jsx
```

## 🎨 Thème et Design

L'application utilise une palette de couleurs moderne et professionnelle:
- Primaire: #5e72e4 (Bleu)
- Secondaire: #825ee4 (Violet)
- Succès: #2dce89 (Vert)
- Danger: #f5365c (Rouge)

L'interface est responsive et s'adapte à tous les appareils (mobile, tablette, desktop).

## 🔐 Sécurité

- Authentification sécurisée via Supabase
- Row Level Security (RLS) pour toutes les données
- Validation des données côté serveur
- Variables d'environnement pour les secrets

## 📝 Utilisation

### Créer un compte
1. Cliquer sur "S'inscrire"
2. Entrer les informations du commerce
3. Définir la date de validité du compte
4. Confirmer et se connecter

### Gérer les stocks
1. Aller à "Stock"
2. Cliquer sur "Ajouter un produit"
3. Remplir les informations du produit
4. Valider

### Enregistrer une vente
1. Aller à "Ventes"
2. Cliquer sur "Ajouter une vente"
3. Sélectionner le produit et le client
4. Enregistrer

### Consulter les finances
1. Aller à "Finances"
2. Voir le résumé financier
3. Ajouter des dépenses
4. Consulter l'historique

## 🛠️ Dépendances

- React 18: Framework UI
- React Router 6: Navigation
- Supabase: Backend et authentification
- Lucide React: Icônes
- Vite: Bundler et dev server

## 📦 Scripts disponibles

```bash
# Démarrer le serveur de développement
npm run dev

# Construire pour la production
npm run build

# Aperçu de la build de production
npm run preview
```

## 🚀 Déploiement

### Déployer sur Vercel
```bash
npm install -g vercel
vercel
```

### Déployer sur Netlify
1. Connecter le repository Git
2. Configurer les variables d'environnement
3. Déployer automatiquement

---

Développé pour la gestion efficace de votre commerce.
