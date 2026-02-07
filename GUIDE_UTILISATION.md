# Guide Complet d'Utilisation - Gestion de Commerce

## 📋 Table des Matières
1. [Démarrage](#démarrage)
2. [Configuration Supabase](#configuration-supabase)
3. [Utilisateur l'Application](#utilisation-de-lapplication)
4. [Gestion des Données](#gestion-des-données)
5. [FAQ](#faq)

## 🚀 Démarrage

### Installation Initiale
```bash
# 1. Naviguer au dossier du projet
cd "c:\Users\Boli\Desktop\gestion commerce"

# 2. Installer les dépendances
npm install

# 3. Démarrer le serveur de développement
npm run dev
```

L'application sera disponible sur `http://localhost:5173`

## ⚙️ Configuration Supabase

### Étape 1: Créer un Projet Supabase
1. Allez sur https://supabase.com
2. Cliquez sur "New Project"
3. Entrez le nom de votre projet
4. Choisissez un mot de passe fort
5. Sélectionnez votre région
6. Cliquez sur "Create new project"

### Étape 2: Récupérer les Credentials
1. Allez à Settings > API
2. Copiez:
   - **Project URL**: Collez-le dans VITE_SUPABASE_URL
   - **anon public**: Collez-le dans VITE_SUPABASE_ANON_KEY

### Étape 3: Créer la Structure de Base de Données
1. Allez à SQL Editor
2. Créez une nouvelle requête
3. Copiez-collez tout le contenu du fichier `supabase-schema.sql`
4. Cliquez sur "Run"
5. Attendez la fin de l'exécution

### Étape 4: Vérifier les Tables
1. Allez à Database > Tables
2. Vérifiez que vous avez:
   - accounts
   - products
   - sales
   - expenses

## 💻 Utilisation de l'Application

### 1. Créer un Compte
1. Allez sur http://localhost:5173/register
2. Remplissez:
   - **Nom du Commerce**: Votre nom d'entreprise
   - **Email**: Email valide
   - **Mot de passe**: Minimum 6 caractères
   - **Date de validité**: La date jusqu'à laquelle le compte est actif
3. Cliquez sur "S'inscrire"
4. Vous serez redirigé vers le Dashboard

### 2. Se Connecter
1. Allez sur http://localhost:5173/login
2. Entrez votre email et mot de passe
3. Cliquez sur "Se connecter"

### 3. Tableau de Bord
Le Dashboard affiche:
- **Chiffre d'Affaires (FCFA)**: Total de vos ventes
- **Bénéfice Net (FCFA)**: Revenus - Dépenses
- **Valeur du Stock (FCFA)**: Valeur totale de vos produits
- **Ventes Totales**: Nombre de transactions
- **Dernières Ventes**: Tableau des 5 dernières ventes

### 4. Gestion des Stocks

#### Ajouter un Produit
1. Allez à "Stock"
2. Cliquez sur "Ajouter un produit"
3. Remplissez:
   - **Nom**: Nom du produit
   - **SKU**: Code unique (ex: PROD001)
   - **Catégorie**: Catégorie du produit
   - **Quantité**: Nombre d'unités
   - **Prix unitaire**: Prix par unité
   - **Description**: Détails du produit
4. Cliquez sur "Ajouter"

#### Modifier un Produit
1. Allez à "Stock"
2. Cliquez sur le bouton d'édition (✏️) de la carte
3. Modifiez les informations
4. Cliquez sur "Mettre à jour"

#### Supprimer un Produit
1. Allez à "Stock"
2. Cliquez sur le bouton supprimer (🗑️)
3. Confirmez la suppression

### 5. Gestion des Ventes

#### Enregistrer une Vente
1. Allez à "Ventes"
2. Cliquez sur "Ajouter une vente"
3. Sélectionnez:
   - **Produit**: Choisissez le produit vendu
   - **Quantité**: Nombre d'unités vendues
   - **Client**: Nom du client
   - **Date**: Date de la vente
4. Ajoutez optionnellement des remarques
5. Cliquez sur "Enregistrer la vente"

### 6. Rapports Financiers

#### Ajouter une Dépense
1. Allez à "Finances"
2. Cliquez sur "Ajouter une dépense"
3. Remplissez:
   - **Description**: Description de la dépense
   - **Catégorie**: Type de dépense (Loyer, Salaires, etc.)
   - **Montant**: Montant de la dépense
   - **Date**: Date de la dépense
4. Ajoutez optionnellement des notes
5. Cliquez sur "Enregistrer la dépense"

#### Consulter les Finances
Le résumé financier affiche:
- **Chiffre d'Affaires**: Total des ventes
- **Dépenses Totales**: Total des dépenses
- **Bénéfice Net**: CA - Dépenses

## 📊 Gestion des Données

### Données Propres à Chaque Compte
- Chaque utilisateur ne peut voir que ses données
- Les données sont sécurisées par Row Level Security (RLS)
- Impossible pour un utilisateur d'accéder aux données d'un autre

### Sauvegarde des Données
Les données sont automatiquement sauvegardées dans Supabase:
- Aucune action requise de votre part
- Accessible 24h/24 depuis n'importe quel appareil

### Exportation des Données
Pour exporter vos données:
1. Dans Supabase > Database
2. Sélectionnez la table
3. Cliquez sur "Export" ou "Download"

## ❓ FAQ

### Q: Que se passe-t-il après la date de validité du compte?
R: Le compte est automatiquement désactivé. L'utilisateur ne peut plus se connecter jusqu'à ce que l'administrateur réactive ou prolonge le compte.

### Q: Où sont stockées mes données?
R: Vos données sont stockées sur les serveurs sécurisés de Supabase dans le cloud.

### Q: Puis-je modifier un mot de passe?
R: Oui, dans Supabase > Auth > Users, en cliquant sur l'utilisateur.

### Q: Comment sauvegarde-t-on les données?
R: Les données sont automatiquement sauvegardées. Supabase gère les backups.

### Q: Puis-je importer des données existantes?
R: Oui, via SQL ou via l'interface Supabase. Contactez le support pour l'aide.

### Q: Comment activer les connexions Google/GitHub?
R: Dans Supabase > Auth > Providers, activez les fournisseurs souhaités.

### Q: Quelle est la limite de produits/ventes?
R: Aucune limite technique. Supabase scale automatiquement.

### Q: Comment changer la devise (XAF)?
R: Modifiez le fichier `src/utils/formatters.js`, ligne 1.

## 🔒 Conseils de Sécurité

1. **Ne partagez jamais vos credentials Supabase** publiquement
2. **Utilisez des mots de passe forts** (minuscules, majuscules, chiffres, caractères spéciaux)
3. **Gardez votre `.env.local` secret** (ne pas commiter sur Git)
4. **Changez régulièrement votre mot de passe** Supabase
5. **Vérifiez régulièrement** vos transactions dans Supabase

## 📞 Support

Pour l'aide:
1. Vérifiez la [configuration Supabase](./SUPABASE_CONFIG.md)
2. Consultez le [README](./README.md)
3. Vérifiez les logs de votre navigateur (F12 > Console)
4. Vérifiez les logs Supabase (Supabase > Logs)

## 🚀 Prochaines Étapes

1. Testez en créant un compte de test
2. Ajoutez quelques produits
3. Enregistrez des ventes
4. Vérifiez que les chiffres du Dashboard se mettent à jour
5. Déployez sur Vercel/Netlify quand prêt

---

Bon usage de votre application de gestion de commerce! 📈
