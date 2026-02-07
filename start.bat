@echo off
REM Script de démarrage rapide pour Gestion de Commerce

echo ================================
echo Gestion de Commerce - Demarrage
echo ================================
echo.

REM Vérifier si Node.js est installé
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo X Node.js n'est pas installe. Visitez https://nodejs.org
    pause
    exit /b 1
)

echo O Node.js trouve
echo.

REM Vérifier si npm est installé
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo X npm n'est pas installe
    pause
    exit /b 1
)

echo O npm trouve
echo.

REM Installer les dépendances si nécessaire
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    echo O Dependencies installed
) else (
    echo O Dependencies already installed
)

echo.

REM Vérifier .env.local
if not exist ".env.local" (
    echo W Fichier .env.local non trouve
    echo   Creez un fichier .env.local avec:
    echo   VITE_SUPABASE_URL=votre_url
    echo   VITE_SUPABASE_ANON_KEY=votre_cle
    echo.
    echo   Consultez SUPABASE_CONFIG.md pour plus d'infos
)

echo.
echo O Demarrage du serveur de developpement...
echo   Application disponible a: http://localhost:5173
echo.
echo   Appuyez sur Ctrl+C pour arreter le serveur
echo.

call npm run dev
pause
