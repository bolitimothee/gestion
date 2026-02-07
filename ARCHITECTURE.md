# 📚 Documentation Complète - Gestion de Commerce

## Vue d'Ensemble du Projet

Application web complète de gestion de commerce avec:
- ✅ Authentification sécurisée par Supabase
- ✅ Gestion des stocks en temps réel
- ✅ Suivi des ventes et clients
- ✅ Rapports financiers détaillés
- ✅ Dashboard analytique
- ✅ Interface responsive (mobile, tablette, desktop)

## 📦 Structure Complète du Projet

```
gestion commerce/
├── src/
│   ├── components/                 # Composants réutilisables
│   │   ├── Navbar.jsx             # Barre de navigation
│   │   ├── Navbar.css
│   │   ├── Sidebar.jsx            # Menu latéral
│   │   ├── Sidebar.css
│   │   ├── StatCard.jsx           # Cartes de statistiques
│   │   ├── StatCard.css
│   │   └── ProtectedRoute.jsx     # Route protégée
│   │
│   ├── pages/                      # Pages principales
│   │   ├── Login.jsx              # Page de connexion
│   │   ├── Register.jsx           # Page d'inscription
│   │   ├── Auth.css               # Styles authentification
│   │   ├── Dashboard.jsx          # Tableau de bord
│   │   ├── Dashboard.css
│   │   ├── Stock.jsx              # Gestion des stocks
│   │   ├── Stock.css
│   │   ├── Sales.jsx              # Gestion des ventes
│   │   ├── Sales.css
│   │   ├── Finances.jsx           # Rapports financiers
│   │   └── Finances.css
│   │
│   ├── services/                   # Services API Supabase
│   │   ├── supabaseClient.js      # Client Supabase
│   │   ├── authService.js         # Service d'authentification
│   │   ├── stockService.js        # Service de gestion stock
│   │   ├── salesService.js        # Service de gestion ventes
│   │   └── financeService.js      # Service finances
│   │
│   ├── context/
│   │   └── AuthContext.jsx        # Contexte authentification
│   │
│   ├── styles/                     # Styles globaux
│   │   ├── globals.css            # Variables et styles globaux
│   │   └── components.css         # Styles composants
│   │
│   ├── utils/
│   │   └── formatters.js          # Utilitaires de formatage
│   │
│   ├── App.jsx                    # Application principale
│   └── main.jsx                   # Point d'entrée
│
├── public/                         # Fichiers statiques
├── index.html                      # HTML principal
├── vite.config.js                 # Configuration Vite
├── package.json                   # Dépendances
├── .env.local                     # Variables d'environnement
├── .env.example                   # Template .env
├── .gitignore                     # Fichiers à ignorer
│
├── supabase-schema.sql            # Script SQL Supabase
├── README.md                      # Documentation principale
├── QUICKSTART.md                  # Démarrage rapide
├── GUIDE_UTILISATION.md           # Guide complet
├── SUPABASE_CONFIG.md             # Configuration Supabase
├── ARCHITECTURE.md                # Ce fichier
├── start.sh                       # Script de démarrage (Linux/Mac)
└── start.bat                      # Script de démarrage (Windows)
```

## 🔧 Stack Technologique

### Frontend
- **React 19**: Framework UI moderne
- **React Router v7**: Navigation SPA
- **Lucide React**: Icônes vectorielles
- **Vite**: Bundler haute performance
- **CSS3**: Styles modernes et responsive

### Backend
- **Supabase**: Backend as a Service
  - PostgreSQL: Base de données
  - Auth: Authentification
  - RLS: Sécurité ligne par ligne
  - Realtime: Mise à jour en temps réel

### Déploiement
- **Vercel**: Hébergement recommandé
- **Netlify**: Alternative
- **npm**: Gestionnaire de dépendances

## 🎯 Fonctionnalités Détaillées

### 1. Authentification
- Inscription avec email/mot de passe
- Validation d'email
- Dates de validité des comptes
- Gestion sécurisée des sessions
- Logout automatique si compte expiré

### 2. Gestion des Stocks
- Ajouter/modifier/supprimer produits
- Suivi des quantités
- Catégorisation
- Code SKU
- Calcul automatique de la valeur totale

### 3. Gestion des Ventes
- Enregistrement des ventes
- Suivi clients
- Historique complet
- Montants calculés automatiquement
- Dates flexibles

### 4. Rapports Financiers
- Suivi des dépenses
- Calcul CA - Dépenses = Profit
- Résumés en temps réel
- Historique des transactions

### 5. Tableau de Bord
- 4 KPIs principaux en cartes
- Graphiques et statistiques
- Dernières ventes
- Alertes de stock bas

## 🔐 Sécurité

### Authentification
- Supabase Auth gère les mots de passe
- Pas de mots de passe en plain text
- Sessions sécurisées

### Autorisation
- RLS (Row Level Security) sur toutes les tables
- Utilisateurs ne voient que leurs données
- Données partitionnées par user_id

### Données
- HTTPS forcé
- Chiffrement en transit
- Backups automatiques Supabase

## 📊 Modèle de Données

### Accounts (Comptes)
```
id (UUID) - Primary Key
user_id (UUID) - Foreign Key to auth.users
account_name (String) - Nom du commerce
email (String) - Email de l'utilisateur
validity_date (Date) - Expiration du compte
is_active (Boolean) - Statut actif/inactif
created_at (Timestamp)
updated_at (Timestamp)
```

### Products (Produits)
```
id (UUID) - Primary Key
user_id (UUID) - Foreign Key
name (String) - Nom du produit
description (Text) - Description
quantity (Integer) - Quantité en stock
unit_price (Decimal) - Prix unitaire
category (String) - Catégorie
sku (String) - Code SKU
created_at (Timestamp)
updated_at (Timestamp)
```

### Sales (Ventes)
```
id (UUID) - Primary Key
user_id (UUID) - Foreign Key
product_id (UUID) - Foreign Key à Products
quantity (Integer) - Quantité vendue
unit_price (Decimal) - Prix unitaire
total_amount (Decimal) - Montant total
customer_name (String) - Nom du client
sale_date (Date) - Date de la vente
notes (Text) - Remarques
created_at (Timestamp)
```

### Expenses (Dépenses)
```
id (UUID) - Primary Key
user_id (UUID) - Foreign Key
description (String) - Description
amount (Decimal) - Montant
category (String) - Catégorie
date (Date) - Date de la dépense
notes (Text) - Remarques
created_at (Timestamp)
```

## 🎨 Thème et Design

### Palette de Couleurs
```css
--primary-color: #5e72e4 (Bleu)
--primary-dark: #4c63d2
--secondary-color: #1e88e5
--success-color: #2dce89 (Vert)
--warning-color: #fb6340 (Orange)
--danger-color: #f5365c (Rouge)
--dark-bg: #343a40
--light-bg: #f8f9fa
--border-color: #dee2e6
```

### Responsive Breakpoints
```
Mobile: < 768px
Tablet: 768px - 1024px
Desktop: > 1024px
```

## 📱 Flux de Navigation

```
/ (Redirect to /dashboard)
├── /login (Page de connexion)
├── /register (Inscription)
├── /dashboard (Tableau de bord) [Protected]
├── /stock (Gestion stocks) [Protected]
├── /sales (Gestion ventes) [Protected]
└── /finances (Rapports) [Protected]
```

## 🔄 Flux de Données

```
React Component
    ↓
Service Layer (authService, stockService, etc)
    ↓
Supabase Client
    ↓
Supabase API
    ↓
PostgreSQL Database
```

## 🚀 Déploiement

### Préparation
```bash
npm run build
# Crée dist/ avec la version production
```

### Sur Vercel
```bash
vercel
# Déploie automatiquement
```

### Sur Netlify
```bash
# Connecter le repository Git
# Configure les variables d'environnement
# Deploy
```

## 📈 Performance

- Build size: ~425KB (gzip: ~123KB)
- Temps de chargement: < 2 secondes
- Optimisé pour mobile
- Lazy loading des composants

## 🧪 Testing

Tester manuellement:
1. Créer un compte
2. Ajouter un produit
3. Enregistrer une vente
4. Vérifier le Dashboard
5. Ajouter une dépense
6. Vérifier les finances

## 📝 Logging et Debug

### Console du Navigateur
```
F12 > Console
- Erreurs d'import
- Erreurs API
- Problèmes de rendu
```

### Supabase Logs
```
Supabase Dashboard > Logs
- Erreurs SQL
- Problèmes d'authentification
- Logs RLS
```

## 🔄 Mise à Jour et Maintenance

### Mise à jour des dépendances
```bash
npm update
npm run build  # Vérifier
```

### Backups
Supabase gère automatiquement:
- Backups quotidiens
- Rétention 30 jours

## 🆘 Dépannage

| Problème | Cause | Solution |
|----------|-------|----------|
| Connexion échouée | Credentials incorrects | Vérifier .env.local |
| Pas de données | RLS activé | Vérifier politiques RLS |
| 404 routes | Routes non définies | Vérifier App.jsx |
| Styles incorrect | CSS non importé | Vérifier imports CSS |

## 📚 Ressources

- [React Docs](https://react.dev)
- [Supabase Docs](https://supabase.com/docs)
- [Vite Guide](https://vitejs.dev)
- [React Router](https://reactrouter.com)

## 📄 Licence

Projet fourni à titre gratuit.

---

**Développé avec ❤️ pour les gestionnaires de commerce**
