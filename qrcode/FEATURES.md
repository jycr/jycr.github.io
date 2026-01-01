# 🎯 Fonctionnalités de l'application

## ✅ Fonctionnalités implémentées

### Page Émetteur (sender.html)

#### Sélection et traitement du fichier
- ✅ Sélection d'un fichier via input file
- ✅ Calcul du hash SHA-256 du fichier
- ✅ Découpage automatique en chunks configurables
- ✅ Affichage des informations du fichier (nom, taille, hash, nombre de chunks)

#### Génération de QR codes
- ✅ Génération de QR codes avec la bibliothèque `qrcode`
- ✅ Affichage séquentiel des QR codes
- ✅ Chaque QR code contient :
  - Hash SHA-256 du fichier (identifiant unique)
  - Nom du fichier
  - Index du chunk
  - Nombre total de chunks
  - Données du chunk en base64

#### Paramètres configurables
- ✅ Vitesse de transmission (intervalle entre QR codes)
- ✅ Taille des chunks (500 à 2900 octets)
- ✅ Niveau de correction d'erreur (L, M, Q, H)
- ✅ Options de génération optimisées pour maximiser les données

#### Mécanisme de récupération
- ✅ Scanner de QR code de récupération
- ✅ Accès à la caméra pour scanner le QR du récepteur
- ✅ Décodage du QR de récupération
- ✅ Mode récupération pour retransmettre uniquement les chunks manquants
- ✅ Affichage du nombre de chunks à retransmettre

#### Contrôles
- ✅ Démarrer la transmission
- ✅ Arrêter la transmission
- ✅ Réinitialiser complètement
- ✅ Suivi de la progression

### Page Récepteur (receiver.html)

#### Scan des QR codes
- ✅ Accès à la caméra via MediaDevices API
- ✅ Scan en temps réel avec `jsQR`
- ✅ Décodage des QR codes
- ✅ Overlay visuel pour aider au cadrage
- ✅ Gestion de la qualité vidéo (1280x720)

#### Réception des données
- ✅ Stockage des chunks dans une Map
- ✅ Détection automatique des doublons
- ✅ Vérification de la cohérence des chunks (même fichier)
- ✅ Initialisation automatique des infos du fichier

#### Affichage de la progression
- ✅ Barre de progression visuelle
- ✅ Pourcentage de complétion
- ✅ Nombre de chunks reçus / total
- ✅ Statistiques détaillées :
  - Total scanné
  - Doublons
  - Erreurs

#### Assemblage du fichier
- ✅ Assemblage automatique quand tous les chunks sont reçus
- ✅ Décodage base64 des chunks
- ✅ Reconstruction du fichier original
- ✅ Vérification du hash SHA-256
- ✅ Génération d'un Blob téléchargeable

#### Mécanisme de récupération
- ✅ Détection des chunks manquants
- ✅ Génération d'un QR code de récupération
- ✅ Affichage de la liste des chunks manquants
- ✅ QR code optimisé avec le format :
  ```json
  {
    "type": "recovery",
    "fileHash": "...",
    "missingChunks": [1, 5, 12, ...]
  }
  ```

#### Téléchargement
- ✅ Bouton de téléchargement du fichier reconstitué
- ✅ Nom de fichier préservé
- ✅ Création d'URL objet temporaire
- ✅ Nettoyage des ressources

### Interface utilisateur

#### Design
- ✅ Interface moderne et responsive
- ✅ Cartes avec ombres et animations
- ✅ Code couleur cohérent
- ✅ Emojis pour une meilleure UX
- ✅ Messages d'état clairs

#### Navigation
- ✅ Page d'accueil avec liens vers les pages
- ✅ Guide d'utilisation complet
- ✅ Navigation facile entre les pages

#### Responsive
- ✅ Adapté aux mobiles
- ✅ Adapté aux tablettes
- ✅ Adapté aux ordinateurs

### Techniques et optimisations

#### APIs modernes utilisées
- ✅ **Web Crypto API** : Hash SHA-256
- ✅ **MediaDevices API** : Accès caméra
- ✅ **Canvas API** : Traitement d'image pour jsQR
- ✅ **File API** : Lecture de fichiers
- ✅ **Blob API** : Création de fichiers téléchargeables
- ✅ **URL API** : Création d'URLs objet

#### Optimisations QR code
- ✅ Options de génération optimales :
  - Marge minimale (1 pixel)
  - Taille adaptée (600px)
  - Contraste maximal (noir/blanc)
- ✅ Niveaux de correction configurables
- ✅ Taille des données maximisée

#### Gestion mémoire
- ✅ Nettoyage des streams vidéo
- ✅ Révocation des URLs objet
- ✅ Libération des ressources

#### Performance
- ✅ Scan optimisé avec `willReadFrequently`
- ✅ Traitement asynchrone
- ✅ Pas de blocage de l'UI

## 🚀 Améliorations possibles

### Fonctionnalités supplémentaires
- ⬜ Compression des données avant transmission (si non déjà compressées)
- ⬜ Chiffrement des données (chiffrement de bout en bout)
- ⬜ Support du drag & drop pour la sélection de fichier
- ⬜ Historique des transferts
- ⬜ Sauvegarde/reprise de transferts interrompus
- ⬜ Transmission de plusieurs fichiers simultanément
- ⬜ Mode plein écran pour l'affichage des QR codes
- ⬜ Son de notification à chaque chunk reçu

### Optimisations
- ⬜ Utilisation de WebWorkers pour le traitement
- ⬜ Streaming pour les très gros fichiers
- ⬜ Adaptation dynamique de la vitesse selon le taux de réussite
- ⬜ Prédiction des chunks manquants avant la fin
- ⬜ Cache IndexedDB pour les transferts interrompus

### Interface
- ⬜ Mode sombre
- ⬜ Thèmes personnalisables
- ⬜ Graphiques de statistiques avancés
- ⬜ Estimation du temps restant
- ⬜ Historique des erreurs détaillé
- ⬜ Export des logs

### Multi-plateforme
- ⬜ Progressive Web App (PWA)
- ⬜ Mode hors ligne
- ⬜ Installation sur l'écran d'accueil
- ⬜ Notifications push

### Protocole avancé
- ⬜ Détection automatique de fin de transmission
- ⬜ Accusé de réception pour chaque chunk
- ⬜ Retransmission automatique des chunks perdus
- ⬜ Négociation des paramètres entre émetteur et récepteur
- ⬜ Support de plusieurs récepteurs simultanés

## 🔧 Technologies utilisées

- **Framework** : Svelte 5
- **Build tool** : Vite 7
- **QR Code generation** : qrcode 1.5.4
- **QR Code reading** : jsQR 1.4.0
- **Crypto** : Web Crypto API (native)
- **Camera** : MediaDevices API (native)

## 📊 Capacités

- **Taille maximale par QR code** : ~2900 octets (données brutes)
- **Niveaux de correction** :
  - L : 7% (maximum de données)
  - M : 15% (recommandé)
  - Q : 25% (haute fiabilité)
  - H : 30% (maximum de fiabilité)
- **Types de fichiers** : Tous formats
- **Taille de fichier** : Illimitée (en théorie, limité par la patience)

## 🔒 Sécurité

- ✅ Aucune donnée envoyée sur Internet
- ✅ Traitement 100% local
- ✅ Vérification d'intégrité SHA-256
- ✅ Pas de stockage permanent des données
- ✅ Nettoyage automatique des ressources

## 🌐 Compatibilité

### Navigateurs testés
- ✅ Google Chrome (recommandé)
- ✅ Safari (iOS et macOS)
- ✅ Firefox
- ⚠️ Edge (non testé mais devrait fonctionner)

### Prérequis
- Navigateur avec support ES2020+
- Support de Web Crypto API
- Support de MediaDevices API
- Support de Canvas API
- JavaScript activé

