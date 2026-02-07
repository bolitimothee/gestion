## Guide Complet de Configuration Supabase

### 1. Créer un compte Supabase
- Allez sur https://supabase.com
- Créez un nouveau compte avec email/Google
- Créez un nouveau projet

### 2. Obtenir vos credentials
Dans votre projet Supabase:
- Allez dans Settings > API
- Copiez:
  - Project URL → VITE_SUPABASE_URL
  - anon public → VITE_SUPABASE_ANON_KEY

### 3. Exécuter le Script SQL
1. Dans Supabase, allez à SQL Editor
2. Créez une nouvelle requête
3. Copiez tout le contenu de `supabase-schema.sql`
4. Collez-le dans l'éditeur SQL
5. Cliquez sur "Run"

### 4. Configurer l'Authentification
Dans Supabase > Auth > Providers:
- Email est déjà activé par défaut
- Vous pouvez activer Google, GitHub, etc.

### 5. Configurer RLS (Row Level Security)
Le script SQL crée déjà les politiques RLS. Vérifiez:
1. Dans Supabase > SQL Editor
2. Vérifiez que les polices de sécurité sont bien appliquées

### 6. Variables d'Environnement
Créez `.env.local`:
```
VITE_SUPABASE_URL=https://xxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 7. Tester la Connexion
```bash
npm run dev
```

Allez à http://localhost:5173/register et testez la création de compte.

## Troubleshooting

### Erreur: "Supabase URL is required"
- Vérifiez que `.env.local` existe
- Vérifiez les variables d'environnement
- Redémarrez le serveur dev (npm run dev)

### Erreur: "Invalid login credentials"
- Vérifiez que l'utilisateur existe dans Supabase > Auth > Users
- Vérifiez la syntaxe du mot de passe

### Les données ne s'affichent pas
- Allez dans Supabase > SQL Editor
- Vérifiez que les tables existent
- Vérifiez les politiques RLS

### Accès refusé à une table
- Vérifiez dans Supabase > Database > Tables
- Cliquez sur la table > RLS
- Vérifiez que les politiques sont correctes

## Structure des Bases de Données

### Accounts Table
```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key to auth.users)
- account_name: String
- email: String
- validity_date: Date
- is_active: Boolean
- created_at: Timestamp
```

### Products Table
```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key)
- name: String
- description: Text
- quantity: Integer
- unit_price: Decimal
- category: String
- sku: String
- created_at: Timestamp
```

### Sales Table
```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key)
- product_id: UUID (Foreign Key)
- quantity: Integer
- unit_price: Decimal
- total_amount: Decimal
- customer_name: String
- sale_date: Date
- notes: Text
- created_at: Timestamp
```

### Expenses Table
```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key)
- description: String
- amount: Decimal
- category: String
- date: Date
- notes: Text
- created_at: Timestamp
```

## Sécurité

- RLS est activé sur toutes les tables
- Les utilisateurs ne voient que leurs données
- Les données sont partitionnées par user_id
- Les mots de passe sont sécurisés via Supabase Auth

## Déploiement en Production

1. Créez un nouveau projet Supabase pour la prod
2. Exécutez le script SQL sur le projet de prod
3. Mettez à jour `.env.local` avec les credentials de prod
4. Déployez sur Vercel/Netlify
