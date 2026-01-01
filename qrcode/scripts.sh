#!/bin/bash

# Script utilitaire pour l'application QR Code Transfer

set -e  # Arrêter en cas d'erreur

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher le menu
show_menu() {
    clear
    echo -e "
${BLUE}🚀 QR Code File Transfer - Utilitaires${NC}
========================================

Choisissez une option :

  ${GREEN}Développement${NC}
    1) Démarrer le serveur de développement
    2) Lancer les tests
    3) Tests en mode watch
    4) Tests avec couverture

  ${YELLOW}Production${NC}
    5) Construire pour la production
    6) Prévisualiser le build (Vite)

  ${BLUE}Maintenance${NC}
    8) Installer les dépendances
    9) Nettoyer (node_modules + dist)
   10) Vérifier le projet (tests + build)

  ${RED}Informations${NC}
   11) Afficher les URLs
   12) Afficher les statistiques

    0) Quitter
"
}

# Fonction pour démarrer le dev server
start_dev() {
    echo -e "${GREEN}📡 Démarrage du serveur de développement...${NC}"
    npm run dev
}

# Fonction pour lancer les tests
run_tests() {
    echo -e "${GREEN}🧪 Lancement des tests...${NC}"
    npm test
}

# Fonction pour tests en mode watch
run_tests_watch() {
    echo -e "${GREEN}🧪 Tests en mode watch...${NC}"
    npm run test:watch
}

# Fonction pour tests avec couverture
run_tests_coverage() {
    echo -e "${GREEN}🧪 Tests avec couverture...${NC}"
    npm run test:coverage
}

# Fonction pour build
build_prod() {
    echo -e "${YELLOW}🔨 Construction pour la production...${NC}"
    npm run build
    echo -e "${GREEN}✅ Build terminé ! Les fichiers sont dans le dossier 'dist/'${NC}"
    echo ""
    read -p "Appuyez sur Entrée pour continuer..."
}

# Fonction pour preview
preview_build() {
    echo -e "${YELLOW}👀 Prévisualisation du build avec Vite...${NC}"
    npm run preview
}

# Fonction pour installer
install_deps() {
    echo -e "${BLUE}📦 Installation des dépendances...${NC}"
    npm install
    echo -e "${GREEN}✅ Dépendances installées !${NC}"
    echo ""
    read -p "Appuyez sur Entrée pour continuer..."
}

# Fonction pour nettoyer
clean() {
    echo -e "${RED}🧹 Nettoyage...${NC}"
    rm -rf node_modules dist coverage
    echo -e "${GREEN}✅ Nettoyage terminé !${NC}"
    echo ""
    read -p "Appuyez sur Entrée pour continuer..."
}

# Fonction pour vérifier le projet
verify_project() {
    echo -e "${BLUE}🔍 Vérification du projet${NC}"
    echo "================================================"
    echo ""

    # Vérifier les dépendances
    echo -e "${BLUE}📦 Vérification des dépendances...${NC}"
    if [ ! -d "node_modules" ]; then
        echo -e "${RED}❌ node_modules manquant. Installation...${NC}"
        npm install
    else
        echo -e "${GREEN}✅ Dépendances installées${NC}"
    fi
    echo ""

    # Lancer les tests
    echo -e "${BLUE}🧪 Lancement des tests...${NC}"
    npm test
    TEST_EXIT=$?
    echo ""

    # Vérifier le build
    echo -e "${BLUE}🔨 Vérification du build...${NC}"
    npm run build > /dev/null 2>&1
    BUILD_EXIT=$?

    if [ $BUILD_EXIT -eq 0 ]; then
        echo -e "${GREEN}✅ Build réussi${NC}"
    else
        echo -e "${RED}❌ Build échoué${NC}"
    fi
    echo ""

    # Résumé
    echo "📊 Résumé"
    echo "================================================"
    if [ $TEST_EXIT -eq 0 ]; then
        echo -e "${GREEN}✅ Tests : PASS${NC}"
    else
        echo -e "${RED}❌ Tests : FAIL${NC}"
    fi

    if [ $BUILD_EXIT -eq 0 ]; then
        echo -e "${GREEN}✅ Build : PASS${NC}"
    else
        echo -e "${RED}❌ Build : FAIL${NC}"
    fi
    echo ""

    if [ $TEST_EXIT -eq 0 ] && [ $BUILD_EXIT -eq 0 ]; then
        echo -e "${GREEN}🎉 Projet prêt à l'emploi !${NC}"
    else
        echo -e "${RED}⚠️  Certaines vérifications ont échoué${NC}"
    fi
    echo ""
    read -p "Appuyez sur Entrée pour continuer..."
}

# Fonction pour afficher les URLs
show_urls() {
    echo -e "${BLUE}📍 URLs de l'application${NC}"
    echo "================================================"
    echo ""
    echo "Développement (npm run dev):"
    echo "  - Accueil    : http://localhost:5173/"
    echo "  - Émetteur   : http://localhost:5173/sender.html"
    echo "  - Récepteur  : http://localhost:5173/receiver.html"
    echo "  - Guide      : http://localhost:5173/guide.html"
    echo ""
    echo "Production (npm run preview):"
    echo "  - Accueil    : http://localhost:4173/"
    echo ""
    echo "Production (npm run serve:dist):"
    echo "  - Accueil    : http://localhost:8080/"
    echo ""
    read -p "Appuyez sur Entrée pour continuer..."
}

# Fonction pour afficher les statistiques
show_stats() {
    echo -e "${BLUE}📈 Statistiques du projet${NC}"
    echo "================================================"
    echo ""
    echo "📁 Fichiers de documentation : $(ls -1 *.md 2>/dev/null | wc -l | xargs)"
    echo "🧪 Fichiers de test : $(find src -name "*.test.js" 2>/dev/null | wc -l | xargs)"
    echo "⚛️  Composants Svelte : $(find src -name "*.svelte" 2>/dev/null | wc -l | xargs)"
    echo "📄 Pages HTML : $(ls -1 *.html 2>/dev/null | wc -l | xargs)"
    echo ""

    if [ -d "node_modules" ]; then
        echo -e "${GREEN}✅ Dépendances installées${NC}"
    else
        echo -e "${RED}❌ Dépendances non installées${NC}"
    fi

    if [ -d "dist" ]; then
        echo -e "${GREEN}✅ Build présent${NC}"
    else
        echo -e "${YELLOW}⚠️  Build absent${NC}"
    fi
    echo ""
    read -p "Appuyez sur Entrée pour continuer..."
}

# Boucle principale
while true; do
    show_menu
    read -p "Votre choix : " choice
    echo ""

    case $choice in
        1)
            start_dev
            ;;
        2)
            run_tests
            read -p "Appuyez sur Entrée pour continuer..."
            ;;
        3)
            run_tests_watch
            ;;
        4)
            run_tests_coverage
            read -p "Appuyez sur Entrée pour continuer..."
            ;;
        5)
            build_prod
            ;;
        6)
            preview_build
            ;;
        8)
            install_deps
            ;;
        9)
            clean
            ;;
        10)
            verify_project
            ;;
        11)
            show_urls
            ;;
        12)
            show_stats
            ;;
        0)
            echo -e "${GREEN}👋 Au revoir !${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Option invalide. Veuillez choisir entre 0 et 12.${NC}"
            read -p "Appuyez sur Entrée pour continuer..."
            ;;
    esac
done

