# 🚀 Configuration Supabase - Guide d'Installation

## Problème Identifié
Les messages d'erreur "404 Not Acceptable" indiquent que **les tables Supabase n'existent pas ou ne sont pas accessibles**.

## ✅ Étapes de Configuration

### 1️⃣ Créer les Tables Supabase

**Allez dans:**
1. [Dashboard Supabase](https://app.supabase.com)
2. Sélectionnez votre projet: `uoglzseadmmwfsjxbmdl`
3. Allez à **SQL Editor** (éditeur SQL)
4. Cliquez sur **New Query**
5. Copiez-collez TOUT le contenu du fichier `supabase-schema.sql`
6. Cliquez sur **Run** (▶️)

### 2️⃣ Vérifier les Tables Créées

Après avoir exécuté le SQL, allez à **Table Editor** et vérifiez que ces 4 tables existent:
- ✅ `accounts` - Gestion des comptes utilisateur
- ✅ `products` - Inventaire des produits
- ✅ `sales` - Enregistrement des ventes
- ✅ `expenses` - Suivi des dépenses

### 3️⃣ Activer RLS (Row Level Security)

Les politiques de sécurité sont **déjà dans le fichier SQL**. Vérifiez que:

1. Chaque table a **RLS activé** (icône 🔒)
2. Les politiques existent:
   - `Users can view their own...`
   - `Users can insert their own...`
   - `Users can update their own...`
   - `Users can delete their own...`

### 4️⃣ Variables d'Environnement

Votre `.env.local` contient déjà les bonnes clés:
```
VITE_SUPABASE_URL=https://uoglzseadmmwfsjxbmdl.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

✅ Ces valeurs sont **correctes**.

## 🐛 Dépannage

### Si vous voyez "Erreur lors du chargement des données"

**Vérifiez dans la Console (F12):**

1. Ouvrez le navigateur
2. Appuyez sur `F12` pour ouvrir DevTools
3. Allez à l'onglet **Console**
4. Regardez les erreurs affichées

**Erreurs courantes:**

| Erreur | Solution |
|--------|----------|
| `relation "products" does not exist` | Exécutez le SQL complet (supabase-schema.sql) |
| `permission denied for schema "public"` | Vérifiez les politiques RLS dans Supabase |
| `invalid JWT token` | Vérifiez votre ANON_KEY dans .env.local |

### Si les tables existent mais les données ne s'affichent pas

1. Allez dans **Supabase Table Editor**
2. Vérifiez que vos tables **products**, **sales**, etc. ont des données
3. Si vides, c'est normal - ajoutez des données via l'interface

## 🔧 Configuration Vite HMR Fixée

Le WebSocket HMR est maintenant configuré correctement dans `vite.config.js`:
```javascript
server: {
  host: 'localhost',
  port: 5173,
  hmr: {
    host: 'localhost',
    port: 5173,
    protocol: 'ws',
  },
}
```

## ✨ Prochaines Étapes

1. ✅ Exécutez `supabase-schema.sql` dans Supabase SQL Editor
2. ✅ Vérifiez les 4 tables + RLS policies
3. ✅ Rechargez votre app (F5 ou `npm run dev`)
4. ✅ Les erreurs devraient disparaître!

## 📝 Ressources Utiles

- [Documentation Supabase](https://supabase.com/docs)
- [RLS Policies Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [REST API Guide](https://supabase.com/docs/guides/api)

---

**Questions?** Vérifiez d'abord la Console (F12) pour voir les erreurs exactes retournées par Supabase.
