# 🔐 Guide de Dépannage - Erreur 401 (Unauthorized)

## 🚨 Le Problème

```
Failed to load resource: the server responded with a status of 401 ()
```

Cela signifie **Supabase rejette votre authentification**.

## ✅ Checklist de Dépannage

### 1️⃣ Vérifier la Clé ANON_KEY

**Étape 1: Aller dans Supabase Dashboard**
1. Allez sur [https://app.supabase.com](https://app.supabase.com)
2. Sélectionnez votre projet
3. Allez à **Project Settings** > **API**

**Étape 2: Copier la bonne clé**
- Cherchez **"anon (public)"**
- Copiez cette clé (pas "service_role"!)

**Étape 3: Mettre à jour .env.local**
```env
VITE_SUPABASE_URL=https://uoglzseadmmwfsjxbmdl.supabase.co
VITE_SUPABASE_ANON_KEY=votre_cle_copiee_ici
```

**Étape 4: Redémarrer le serveur**
```bash
# Arrêtez npm run dev (Ctrl+C)
# Puis relancez:
npm run dev
```

### 2️⃣ Vérifier que les Tables Existent

**Console Supabase:**
1. Allez à **Table Editor**
2. Vérifiez ces 4 tables:
   - ✅ `accounts`
   - ✅ `products`
   - ✅ `sales`
   - ✅ `expenses`

**Si manquantes:**
- Allez à **SQL Editor**
- Exécutez le contenu du fichier `supabase-schema.sql`

### 3️⃣ Vérifier les Politiques RLS (Row Level Security)

Pour **chaque table**, vérifiez:

1. La table a **🔒 RLS activé** (icône de cadenas)
2. Les politiques existent pour SELECT, INSERT, UPDATE, DELETE

**Les politiques doivent inclure:**
```sql
-- Pour SELECT
FOR SELECT USING (auth.uid() = user_id)

-- Pour INSERT
FOR INSERT WITH CHECK (auth.uid() = user_id)

-- Pour UPDATE
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)

-- Pour DELETE
FOR DELETE USING (auth.uid() = user_id)
```

### 4️⃣ Problème Courant: Politiques RLS Trop Restrictives

Si une table a RLS mais **pas de politique SELECT**, Supabase retourne **401** même avec un token valide.

**Solution:**
- Allez sur la table
- Cliquez sur **RLS Policies**
- Vérifiez que les politiques existent
- Si manquantes, créez-les via **SQL Editor**

### 5️⃣ Tester avec curl

Pour vérifier si le problème vient du client:

```bash
# Remplacez les valeurs
curl -X GET \
  "https://uoglzseadmmwfsjxbmdl.supabase.co/rest/v1/products?select=*&user_id=eq.YOUR_USER_ID" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Accept: application/json"
```

**Résultat:**
- ✅ 200 = OK, les données retournent
- ❌ 401 = Problème d'authentification
- ❌ 403 = Problème de RLS

## 🔍 Analyse Rapide

| Erreur | Cause | Solution |
|--------|-------|----------|
| 401 | Token invalide/expiré | Copier nouvelle clé anon_key |
| 401 | Clé incorrecte | Vérifier .env.local |
| 401 + tables existent | RLS trop restrictive | Ajouter politiques RLS |
| 401 + pas de données | Tables n'existent pas | Exécuter SQL schema |

## 🧪 Debug en Navigateur

**Console du Navigateur (F12):**

```javascript
// Importer depuis la console
import { supabase } from './src/services/supabaseClient.js';

// Test 1: Vérifier l'authentification
const { data: { user } } = await supabase.auth.getUser();
console.log(user); // Doit afficher vos infos

// Test 2: Tester une requête simple
const { data, error } = await supabase
  .from('products')
  .select('*')
  .limit(1);

console.log('Données:', data);
console.log('Erreur:', error); // Affichera le problème exact
```

## 📋 Checklist Finale

- [ ] ANON_KEY copiée depuis Supabase Dashboard
- [ ] `.env.local` mise à jour avec bonne clé
- [ ] Serveur dev redémarré (`npm run dev`)
- [ ] 4 tables existent dans Supabase
- [ ] Chaque table a RLS activé (🔒)
- [ ] Politiques RLS créées pour SELECT, INSERT, UPDATE, DELETE
- [ ] JWT token décroissant (expiré 2085)

## 🆘 Si ça Ne Fonctionne Toujours Pas

1. Ouvrez la console (F12)
2. Exécutez:
```javascript
const { data, error } = await supabase
  .from('products')
  .select('*')
  .limit(1);
console.log(JSON.stringify(error, null, 2));
```
3. L'erreur vous donnera le message exact ✓

---

**Questions?** Le message d'erreur exact dans la console (F12) dira exactement quel est le problème.
