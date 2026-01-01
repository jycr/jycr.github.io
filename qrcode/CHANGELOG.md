# Changelog

## [1.0.0] - 2026-01-01

### 🎉 Version initiale

#### ✨ Fonctionnalités ajoutées

**Infrastructure**
- Initialisation du projet Svelte avec Vite
- Configuration multi-page (3 pages HTML)
- Installation des dépendances (qrcode, jsQR)
- Configuration du build pour production

**Page Émetteur (sender.html)**
- Sélection de fichier avec input file
- Calcul automatique du hash SHA-256
- Découpage du fichier en chunks configurables
- Génération de QR codes optimisés
- Affichage séquentiel des QR codes
- Paramètres configurables :
  - Vitesse de transmission (100-5000 ms)
  - Taille des chunks (500-2900 octets)
  - Niveau de correction d'erreur (L, M, Q, H)
- Scanner de QR code de récupération via caméra
- Mode récupération pour retransmettre chunks manquants
- Contrôles : start, stop, reset
- Interface utilisateur intuitive

**Page Récepteur (receiver.html)**
- Accès à la caméra pour scanner les QR codes
- Scan en temps réel avec jsQR
- Réception et stockage des chunks dans une Map
- Détection automatique des doublons
- Barre de progression visuelle
- Statistiques en temps réel :
  - Total scanné
  - Doublons détectés
  - Erreurs rencontrées
- Assemblage automatique du fichier
- Vérification d'intégrité SHA-256
- Génération de QR code de récupération
- Téléchargement du fichier reconstitué
- Interface utilisateur claire et informative

**Page d'accueil (index.html)**
- Présentation de l'application
- Navigation vers émetteur et récepteur
- Instructions rapides
- Lien vers le guide complet

**Guide d'utilisation (guide.html)**
- Instructions détaillées étape par étape
- Recommandations de paramètres
- Section dépannage
- Estimations de temps de transfert
- Astuces et bonnes pratiques
- Design moderne et lisible

**APIs et technologies**
- Utilisation de Web Crypto API pour SHA-256
- MediaDevices API pour accès caméra
- Canvas API pour traitement d'image
- File API, Blob API, URL API
- Svelte 5 avec réactivité moderne
- Vite 7 pour build rapide

**Documentation**
- README.md : Documentation principale
- FEATURES.md : Liste complète des fonctionnalités
- DEPLOY.md : Instructions de déploiement
- PROJECT_SUMMARY.md : Résumé du projet
- CHANGELOG.md : Historique des versions
- Script dev.sh pour faciliter le développement

#### 🎨 Interface utilisateur

- Design moderne et épuré
- Responsive (mobile, tablette, desktop)
- Cartes avec ombres et animations
- Code couleur cohérent
- Utilisation d'emojis pour meilleure UX
- Messages d'état clairs
- Feedback visuel instantané

#### 🔒 Sécurité

- Traitement 100% local
- Aucune donnée envoyée sur Internet
- Vérification d'intégrité SHA-256
- Pas de stockage permanent
- Nettoyage automatique des ressources

#### 📊 Mécanisme de récupération

- Génération de QR de récupération par le récepteur
- Liste des chunks manquants encodée dans le QR
- Scanner de QR sur l'émetteur
- Retransmission intelligente des chunks manquants
- Processus répétable jusqu'à réception complète

#### ⚙️ Optimisations

- QR codes avec options optimales :
  - Marge minimale (1 pixel)
  - Taille adaptée (600px)
  - Contraste maximal
- Scan optimisé avec willReadFrequently
- Traitement asynchrone
- Gestion mémoire efficace
- Nettoyage des streams vidéo
- Révocation des URLs objet

#### 📦 Build et déploiement

- Configuration Vite multi-page
- Build testé et fonctionnel
- Génération de 3 pages HTML
- Assets optimisés et minifiés
- Prêt pour déploiement

#### 🌐 Compatibilité

- Chrome (recommandé)
- Safari (iOS et macOS)
- Firefox
- Edge (probable)

### 📝 Notes techniques

**Capacités**
- Taille max par QR : ~2900 octets
- Formats supportés : Tous
- Taille fichier : Illimitée (théoriquement)

**Dépendances**
- svelte: ^5.43.8
- @sveltejs/vite-plugin-svelte: ^6.2.1
- vite: ^7.2.4
- qrcode: ^1.5.4
- jsqr: ^1.4.0

**Structure**
```
src/
├── lib/
│   ├── Sender.svelte    (composant émetteur)
│   ├── Receiver.svelte  (composant récepteur)
│   └── Counter.svelte   (exemple de base)
├── App.svelte           (page d'accueil)
├── main.js             (entry point accueil)
├── sender.js           (entry point émetteur)
├── receiver.js         (entry point récepteur)
└── app.css             (styles globaux)
```

### 🎯 Objectifs atteints

- ✅ Application Svelte fonctionnelle
- ✅ 2 pages HTML distinctes (sender/receiver)
- ✅ QR codes avec hash SHA-256 et index
- ✅ Paramètres configurables
- ✅ Mécanisme de récupération bidirectionnel
- ✅ Pas de recompression des fichiers
- ✅ Utilisation d'APIs modernes Chrome
- ✅ Options QR optimales pour max d'infos
- ✅ Documentation complète
- ✅ Interface utilisateur soignée
- ✅ Build production fonctionnel

### 🚀 Comment utiliser

```bash
# Installation
npm install

# Développement
npm run dev

# Build
npm run build

# Preview
npm run preview
```

### 📍 URLs

En développement (localhost:5173) :
- `/` - Page d'accueil
- `/sender.html` - Émetteur
- `/receiver.html` - Récepteur
- `/guide.html` - Guide complet

---

**Status** : ✅ Projet complet et fonctionnel
**Version** : 1.0.0
**Date** : 01 janvier 2026

