#!/bin/bash

# Script de développement pour l'application QR Code Transfer

echo "🚀 QR Code File Transfer - Dev Tools"
echo "===================================="
echo ""

# Fonction pour afficher le menu
show_menu() {
    echo "Choisissez une option :"
    echo "1) Démarrer le serveur de développement"
    echo "2) Construire pour la production"
    echo "3) Prévisualiser le build"
    echo "4) Installer les dépendances"
    echo "5) Nettoyer (supprimer node_modules et dist)"
    echo "6) Afficher les URLs"
    echo "7) Quitter"
    echo ""
}

# Fonction pour démarrer le dev server
start_dev() {
    echo "📡 Démarrage du serveur de développement..."
    npm run dev
}

# Fonction pour build
build_prod() {
    echo "🔨 Construction pour la production..."
    npm run build
    echo "✅ Build terminé ! Les fichiers sont dans le dossier 'dist/'"
}

# Fonction pour preview
preview_build() {
    echo "👀 Prévisualisation du build..."
    npm run preview
}

# Fonction pour installer
install_deps() {
    echo "📦 Installation des dépendances..."
    npm install
    echo "✅ Dépendances installées !"
}

# Fonction pour nettoyer
clean() {
    echo "🧹 Nettoyage..."
    rm -rf node_modules dist
    echo "✅ Nettoyage terminé !"
}

# Fonction pour afficher les URLs
show_urls() {
    echo ""
    echo "📍 URLs de l'application (dev) :"
    echo "   - Accueil    : http://localhost:5173/"
    echo "   - Émetteur   : http://localhost:5173/sender.html"
    echo "   - Récepteur  : http://localhost:5173/receiver.html"
    echo "   - Guide      : http://localhost:5173/guide.html"
    echo ""
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
            build_prod
            ;;
        3)
            preview_build
            ;;
        4)
            install_deps
            ;;
        5)
            clean
            ;;
        6)
            show_urls
            ;;
        7)
            echo "👋 Au revoir !"
            exit 0
            ;;
        *)
            echo "❌ Option invalide. Veuillez choisir entre 1 et 7."
            ;;
    esac

    echo ""
    read -p "Appuyez sur Entrée pour continuer..."
    clear
done

