# 🚀 SETUP: Créer le schéma Supabase

## ⚠️ PROBLÈME ACTUEL
```
AbortError: signal is aborted without reason
```

**Cause identifiée:** Les tables Supabase n'ont pas encore été créées. Les services tentent d'accéder à des tables qui nexistent pas.

---

## ✅ SOLUTION (5 minutes)

### ÉTAPE 1: Vérifier votre Supabase (30 secondes)

1. Ouvrir: https://supabase.com/dashboard
2. Identifier votre projet: `uoglzseadmmwfsjxbmdl` (à partir de `.env.local`)
3. Cliquer sur **SQL Editor**

### ÉTAPE 2: Exécuter le schéma (2 minutes)

1. Cliquer: **New Query**
2. Ouvrir le fichier: `SUPABASE_FINAL_COMPLET.sql`
3. **Sélectionner tout** (Ctrl+A)
4. **Copier** (Ctrl+C)
5. **Coller** dans l'éditeur SQL Supabase
6. Cliquer: **Run** (bouton vert en bas à droite)

### ÉTAPE 3: Vérifier le succès (1 minute)

Vous devriez voir:
```
✓ CREATE TABLE accounts
✓ CREATE TABLE products
✓ CREATE TABLE sales
✓ CREATE TABLE expenses
✓ CREATE TABLE customers
✓ CREATE INDEX idx_accounts_user_id
... (plus d'indices et policies)
```

**Si vous voyez une erreur**, lire la section "Dépannage" ci-dessous.

### ÉTAPE 4: Activer Real-Time (1 minute)

1. Aller à: **Settings → Replication**
2. Cocher les cases pour:
   - ✅ accounts
   - ✅ products
   - ✅ sales
   - ✅ expenses
   - ✅ customers
3. Cliquer: **Save**

### ÉTAPE 5: Tester localement (1 minute)

```bash
npm run dev
```

Ouvrir: http://localhost:5173 et vérifier qu'il ny a plus d'erreur `AbortError`

---

## 🔧 DÉPANNAGE

### Erreur: "Permission denied"
**Solution:** Vérifier que vous êtes **connecté à Supabase** (en haut à droite du dashboard)

### Erreur: "syntax error"
**Solution:** Vérifier que vous avez copié **TOUTE** le contenu du fichier `SUPABASE_FINAL_COMPLET.sql`

### Erreur: "Token expired"
**Solution:** Se déconnecter et reconnecter sur https://supabase.com/dashboard

### AbortError persiste après execution du SQL
**Solution complète:**
1. Fermer le terminal (`Ctrl+C`)
2. Fermer le navigateur
3. Attendre 5 secondes
4. `npm run dev`
5. Recharger le navigateur (F5)
6. Essayer de créer un compte

---

## 📋 CE QUI EST CRÉÉ

Le fichier `SUPABASE_FINAL_COMPLET.sql` crée:

### 5 Tables
- **accounts**: Informations utilisateur + devise préférée
- **products**: Inventaire avec prix en plusieurs devises
- **sales**: Ventes avec montants en devise d'origine
- **expenses**: Dépenses en devise d'origine
- **customers**: Base clients

### 10 Index
Pour optimiser les requêtes (vitesse)

### 20 Policies (RLS)
Pour garantir que chaque utilisateur ne voit que ses données

### 5 Triggers
Pour mettre à jour automatiquement `updated_at`

---

## ✨ APRÈS LA CONFIGURATION

Tous les tests devraient passer:
- ✅ Créer un compte
- ✅ Ajouter des produits
- ✅ Enregistrer une vente
- ✅ Changer la devise → tous les montants se convertissent
- ✅ Ouvrir un autre onglet → les données se synchronisent

---

## 📞 AIDE SUPPLÉMENTAIRE

Si le problème persiste:
1. Vérifier `.env.local` a les bonnes valeurs:
   - `VITE_SUPABASE_URL` = https://uoglzseadmmwfsjxbmdl.supabase.co
   - `VITE_SUPABASE_ANON_KEY` = commence par `eyJ...`

2. Visiter: https://status.supabase.com/ pour vérifier que Supabase est opérationnel

3. Exécuter le diagnostic:
   ```bash
   npm run dev
   # Ouvrir le navigateur et aller à: /diagnostic
   ```

---

**Quand vous avez exécuté le SQL avec succès, répondez avec: "✅ Schéma créé!"**
