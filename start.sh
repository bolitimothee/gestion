#!/bin/bash

# Script de démarrage rapide pour Gestion de Commerce

echo "================================"
echo "Gestion de Commerce - Démarrage"
echo "================================"
echo ""

# Vérifier si Node.js est installé
if ! command -v node &> /dev/null
then
    echo "❌ Node.js n'est pas installé. Veuillez l'installer depuis https://nodejs.org"
    exit 1
fi

echo "✅ Node.js trouvé: $(node --version)"
echo ""

# Vérifier si npm est installé
if ! command -v npm &> /dev/null
then
    echo "❌ npm n'est pas installé"
    exit 1
fi

echo "✅ npm trouvé: $(npm --version)"
echo ""

# Installer les dépendances
if [ ! -d "node_modules" ]; then
    echo "📦 Installation des dépendances..."
    npm install
    echo "✅ Dépendances installées"
else
    echo "✅ Dépendances déjà installées"
fi

echo ""

# Vérifier .env.local
if [ ! -f ".env.local" ]; then
    echo "⚠️  Fichier .env.local non trouvé"
    echo "📝 Créez un fichier .env.local avec:"
    echo "   VITE_SUPABASE_URL=votre_url"
    echo "   VITE_SUPABASE_ANON_KEY=votre_clé"
    echo ""
    echo "Consultez SUPABASE_CONFIG.md pour plus d'informations"
fi

echo ""
echo "🚀 Démarrage du serveur de développement..."
echo "📱 Application disponible à: http://localhost:5173"
echo ""
echo "Appuyez sur Ctrl+C pour arrêter le serveur"
echo ""

npm run dev
