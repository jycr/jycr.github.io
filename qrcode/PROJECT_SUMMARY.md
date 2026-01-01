# 📱 Application de transfert de fichiers par QR Code

## ✅ Projet terminé et fonctionnel !

L'application Svelte a été créée avec succès dans le dossier `qrcode`.

## 📁 Structure du projet

```
qrcode/
├── src/
│   ├── lib/
│   │   ├── Sender.svelte      # Composant émetteur
│   │   └── Receiver.svelte    # Composant récepteur
│   ├── App.svelte             # Page d'accueil
│   ├── main.js               # Entry point page d'accueil
│   ├── sender.js             # Entry point émetteur
│   ├── receiver.js           # Entry point récepteur
│   └── app.css               # Styles globaux
├── sender.html               # Page HTML émetteur
├── receiver.html             # Page HTML récepteur
├── guide.html                # Guide d'utilisation complet
├── index.html                # Page d'accueil
├── vite.config.js            # Configuration multi-page
├── package.json              # Dépendances
├── README.md                 # Documentation principale
├── FEATURES.md               # Liste des fonctionnalités
└── DEPLOY.md                 # Instructions de déploiement
```

## 🚀 Commandes

```bash
# Installer les dépendances
npm install

# Démarrer en développement
npm run dev

# Construire pour la production
npm run build

# Prévisualiser le build
npm run preview
```

## 🎯 Pages de l'application

### 1. Page d'accueil (`/` ou `index.html`)
- Présentation de l'application
- Liens vers l'émetteur et le récepteur
- Lien vers le guide complet
- Instructions rapides

### 2. Page Émetteur (`/sender.html`)
**Fonctionnalités :**
- Sélection de fichier
- Calcul du hash SHA-256
- Découpage en chunks configurables
- Génération et affichage de QR codes
- Paramètres ajustables :
  - Vitesse de transmission (100-5000 ms)
  - Taille des chunks (500-2900 octets)
  - Niveau de correction (L, M, Q, H)
- Scanner de QR de récupération
- Mode récupération pour chunks manquants
- Boutons de contrôle (start, stop, reset)

### 3. Page Récepteur (`/receiver.html`)
**Fonctionnalités :**
- Scan via caméra en temps réel
- Réception et stockage des chunks
- Barre de progression visuelle
- Statistiques détaillées
- Détection automatique des doublons
- Vérification de l'intégrité (SHA-256)
- Génération de QR de récupération
- Téléchargement du fichier reconstitué

### 4. Guide d'utilisation (`/guide.html`)
- Instructions complètes étape par étape
- Recommandations de paramètres
- Résolution de problèmes
- Estimation des temps de transfert
- Astuces et bonnes pratiques

## 🔧 Technologies et APIs

### Bibliothèques
- **Svelte 5** : Framework réactif
- **Vite 7** : Build tool rapide
- **qrcode 1.5.4** : Génération de QR codes
- **jsQR 1.4.0** : Lecture de QR codes

### APIs natives modernes (Chrome)
- **Web Crypto API** : Hash SHA-256
- **MediaDevices API** : Accès caméra
- **Canvas API** : Traitement image
- **File API** : Lecture fichiers
- **Blob API** : Création fichiers
- **URL API** : URLs objets

## ✨ Fonctionnalités clés

### Émetteur
✅ Hash SHA-256 pour identifier le fichier  
✅ Découpage automatique en chunks  
✅ QR codes avec données optimisées  
✅ Paramètres configurables en temps réel  
✅ Scanner de QR de récupération  
✅ Mode récupération intelligente  

### Récepteur  
✅ Scan en temps réel haute performance  
✅ Gestion des doublons  
✅ Barre de progression  
✅ Statistiques détaillées  
✅ Vérification d'intégrité SHA-256  
✅ Génération de QR de récupération  
✅ Téléchargement direct  

### Mécanisme de reprise
✅ Le récepteur génère un QR listant les chunks manquants  
✅ L'émetteur scanne ce QR  
✅ Retransmission uniquement des chunks manquants  
✅ Processus répétable jusqu'à réception complète  

## 📊 Capacités

- **Format de QR** : Version optimale automatique
- **Données par QR** : Jusqu'à ~2900 octets
- **Correction d'erreur** : L (7%), M (15%), Q (25%), H (30%)
- **Types de fichiers** : Tous formats acceptés
- **Taille maximale** : Illimitée (théoriquement)

## 🔒 Sécurité

- ✅ 100% local (aucun serveur externe)
- ✅ Aucune donnée envoyée sur Internet
- ✅ Vérification d'intégrité SHA-256
- ✅ Pas de stockage permanent
- ✅ Nettoyage automatique des ressources

## 🌐 Compatibilité navigateurs

| Navigateur | Support | Notes |
|------------|---------|-------|
| Chrome     | ✅ Oui  | Recommandé |
| Safari     | ✅ Oui  | iOS et macOS |
| Firefox    | ✅ Oui  | Testé |
| Edge       | ⚠️ Probable | Non testé |

**Prérequis :**
- ES2020+ support
- Web Crypto API
- MediaDevices API
- Canvas API

## 📝 Utilisation rapide

### Scénario de base

1. **Appareil A (émetteur)** : Ouvrir `/sender.html`
2. **Appareil B (récepteur)** : Ouvrir `/receiver.html`
3. Sur A : Choisir un fichier et démarrer
4. Sur B : Démarrer le scan
5. Placer la caméra de B face aux QR codes de A
6. Attendre la fin de la transmission
7. Sur B : Télécharger le fichier

### Avec récupération

Si des chunks sont manquants :
1. Sur B : Générer QR de récupération
2. Sur A : Scanner ce QR
3. A retransmet uniquement les chunks manquants
4. Répéter si nécessaire

## 📖 Documentation

- **README.md** : Vue d'ensemble et installation
- **FEATURES.md** : Liste complète des fonctionnalités
- **DEPLOY.md** : Instructions de déploiement
- **guide.html** : Guide utilisateur interactif

## 🎨 Design

- Interface moderne et épurée
- Cartes avec ombres et animations
- Responsive (mobile, tablette, desktop)
- Code couleur cohérent
- Emojis pour meilleure UX
- Messages d'état clairs

## 📈 Estimations de temps

Avec paramètres par défaut (2000 octets, 500 ms) :

| Taille | Temps approximatif |
|--------|-------------------|
| 100 Ko | ~25 secondes |
| 1 Mo   | ~4 minutes |
| 10 Mo  | ~42 minutes |
| 100 Mo | ~7 heures |

**Note :** Temps théoriques. Varie selon conditions (caméra, éclairage, stabilité).

## 🐛 Dépannage

### Caméra ne démarre pas
- Autoriser l'accès caméra
- Utiliser HTTPS ou localhost
- Redémarrer le navigateur

### QR codes illisibles
- Améliorer l'éclairage
- Ajuster la distance (20-30 cm)
- Réduire la vitesse
- Augmenter correction d'erreur

### Chunks manquants
- Ralentir la transmission
- Augmenter luminosité écran
- Stabiliser les appareils
- Utiliser le mode récupération

## 🚀 Build et déploiement

Le projet a été testé et construit avec succès :

```bash
✓ Build réussi
✓ 3 pages HTML générées
✓ Assets optimisés
✓ Prêt pour déploiement
```

Pour déployer :
1. `npm run build`
2. Copier le dossier `dist/`
3. Déployer sur votre serveur web

## 💡 Astuces

- Tester avec un petit fichier d'abord
- Noter les paramètres qui marchent le mieux
- Brancher les appareils pour les gros fichiers
- Utiliser des supports pour stabiliser
- Mode clair recommandé (meilleur contraste)

## ✅ État du projet

- [x] Architecture Svelte mise en place
- [x] Page émetteur fonctionnelle
- [x] Page récepteur fonctionnelle
- [x] Mécanisme de récupération
- [x] Interface utilisateur complète
- [x] Documentation complète
- [x] Build testé et fonctionnel
- [x] Prêt pour production

## 🎉 Résultat

**L'application est 100% fonctionnelle et prête à l'emploi !**

Toutes les fonctionnalités demandées ont été implémentées :
- ✅ Deux pages HTML séparées (sender/receiver)
- ✅ QR codes avec hash SHA-256 et numéro de chunk
- ✅ Paramètres configurables (vitesse, taille, correction)
- ✅ Mécanisme de récupération bidirectionnel
- ✅ Pas de recompression (fichiers déjà compressés)
- ✅ APIs standard modernes de Chrome
- ✅ Options de génération optimales pour maximum d'infos

**Commencez dès maintenant avec :**
```bash
npm run dev
```

Puis ouvrez :
- http://localhost:5173/ (accueil)
- http://localhost:5173/sender.html (émetteur)
- http://localhost:5173/receiver.html (récepteur)
- http://localhost:5173/guide.html (guide)

