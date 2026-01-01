# 📱 QR Code File Transfer

Application Svelte permettant de transférer des fichiers entre deux appareils en utilisant uniquement des QR codes, sans connexion réseau.

[![Svelte](https://img.shields.io/badge/Svelte-5.43-ff3e00?logo=svelte)](https://svelte.dev/)
[![Vite](https://img.shields.io/badge/Vite-7.2-646cff?logo=vite)](https://vitejs.dev/)
[![Tests](https://img.shields.io/badge/Tests-22%20passing-success)](#-tests)
[![Coverage](https://img.shields.io/badge/Coverage-100%25-success)](#-tests)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## 🎯 Fonctionnalités

### 📤 Émetteur (`sender.html`)
- Sélection et analyse de fichier (hash SHA-256)
- Découpage en chunks configurables (500-2900 octets)
- Génération de QR codes optimisés
- Paramètres ajustables (vitesse, taille, correction d'erreur)
- Scanner de QR de récupération pour retransmettre uniquement les chunks manquants

### 📥 Récepteur (`receiver.html`)
- Scan en temps réel via caméra
- Réception et stockage des chunks avec détection des doublons
- Barre de progression et statistiques détaillées
- Vérification d'intégrité (SHA-256)
- Génération de QR de récupération
- Téléchargement du fichier reconstitué

### 🔄 Mécanisme de reprise
Le récepteur génère un QR code listant les chunks manquants. L'émetteur scanne ce QR et retransmet uniquement les données nécessaires. Le processus est répétable jusqu'à réception complète.

## 🚀 Démarrage rapide

```bash
# Installation
npm install

# Développement
npm run dev

# Production
npm run build
npm run preview              # Prévisualiser le build avec Vite
npm run serve:dist           # Servir dist/ avec http-server (port 8080)

# Tests
npm test
```

Ouvrez ensuite dans votre navigateur :
- **Accueil** : http://localhost:5173/ (dev) ou http://localhost:8080/ (dist)
- **Émetteur** : http://localhost:5173/sender.html
- **Récepteur** : http://localhost:5173/receiver.html

## 📖 Utilisation

### Scénario de base

1. **Appareil émetteur** : Ouvrir `sender.html`
   - Choisir un fichier
   - Ajuster les paramètres (vitesse, taille chunks, correction)
   - Démarrer la transmission

2. **Appareil récepteur** : Ouvrir `receiver.html`
   - Démarrer le scan
   - Autoriser l'accès à la caméra
   - Placer la caméra face aux QR codes (distance 20-30 cm)

3. **Récupération** (si nécessaire) :
   - Sur le récepteur : Générer QR de récupération
   - Sur l'émetteur : Scanner ce QR
   - L'émetteur retransmet automatiquement les chunks manquants

### Options de serveur pour tests

**Développement (Hot reload)**
```bash
npm run dev
# Accès : http://localhost:5173/
```

**Build de production**
```bash
npm run build
npm run preview          # Serveur Vite (port 4173)
# ou
npm run serve:dist       # http-server (port 8080)
# ou
./scripts.sh             # Menu interactif avec toutes les options
```

💡 **Astuce** : Utilisez `./scripts.sh` pour un menu interactif avec toutes les commandes disponibles, ou `serve:dist` pour tester le build de production sur différents appareils (accessible via IP locale).

## ⚙️ Paramètres recommandés

| Taille fichier | Taille chunk | Vitesse | Correction |
|----------------|--------------|---------|------------|
| < 1 Mo | 2000 octets | 500 ms | M (15%) |
| 1-10 Mo | 2500 octets | 300 ms | M ou Q |
| > 10 Mo | 2900 octets | 200 ms | L (7%) |

## 🛠️ Technologies

- **Framework** : Svelte 5 + Vite 7
- **Bibliothèques** : qrcode, jsQR
- **APIs** : Web Crypto (SHA-256), MediaDevices (caméra), Canvas, File, Blob

## 📊 Format des données

### QR Code de chunk
```json
{
  "fileHash": "sha256_hash",
  "fileName": "example.zip",
  "chunkIndex": 0,
  "totalChunks": 100,
  "data": "base64_encoded_data"
}
```

### QR Code de récupération
```json
{
  "type": "recovery",
  "fileHash": "sha256_hash",
  "missingChunks": [1, 5, 12]
}
```

## 🧪 Tests

L'application inclut une suite de tests complète avec **22 tests** et **100% de couverture** sur les fonctions utilitaires.

### Lancer les tests

```bash
# Tous les tests
npm test

# Tests en mode watch (relance automatique)
npm run test:watch

# Tests avec rapport de couverture
npm run test:coverage
```

### Tests disponibles

**Tests unitaires (18 tests)** - `src/lib/__tests__/fileUtils.test.js`
- Découpage de fichiers en chunks
- Assemblage de chunks en fichier
- Recherche de chunks manquants
- Validation de chunks et données de récupération
- Gestion des cas limites et erreurs

**Tests d'intégration (4 tests)** - `src/lib/__tests__/integration.test.js`
- Scénario de transfert complet réussi
- Transfert avec chunks manquants et récupération
- Gestion de fichiers binaires
- Cycles multiples de récupération

### Résultats

```
✓ src/lib/__tests__/integration.test.js (4 tests) 3ms
✓ src/lib/__tests__/fileUtils.test.js (18 tests) 4ms

Test Files  2 passed (2)
Tests       22 passed (22)
Coverage    100% (fileUtils.js)
```

### Infrastructure de test

- **Vitest 4.0.16** : Framework de test moderne et rapide
- **@testing-library/svelte** : Utilitaires de test pour Svelte
- **happy-dom** : Environnement DOM léger
- **Mocks** : Web Crypto API, MediaDevices API, URL API

### Ajouter de nouveaux tests

Les tests sont dans `src/lib/__tests__/`. Exemple :

```javascript
import { describe, it, expect } from 'vitest';
import { maFonction } from '../monModule';

describe('Mon module', () => {
  it('devrait fonctionner correctement', () => {
    const resultat = maFonction('test');
    expect(resultat).toBe('attendu');
  });
});
```

## 🏗️ Structure du projet

```
src/
├── lib/
│   ├── Sender.svelte      # Composant émetteur
│   ├── Receiver.svelte    # Composant récepteur
│   └── __tests__/         # Tests unitaires
├── App.svelte             # Page d'accueil
├── sender.js              # Entry point émetteur
└── receiver.js            # Entry point récepteur
```

## 🔒 Sécurité

- ✅ Traitement 100% local (aucun serveur)
- ✅ Vérification d'intégrité SHA-256
- ✅ Pas de stockage permanent
- ✅ Pas de compression (fichiers déjà compressés)

## 🌐 Compatibilité

| Navigateur | Support |
|------------|---------|
| Chrome 90+ | ✅ Recommandé |
| Safari 14+ | ✅ Testé |
| Firefox 88+ | ✅ Testé |
| Edge 90+ | ⚠️ Non testé |

## 🐛 Dépannage

**Caméra ne démarre pas** : Autoriser l'accès, utiliser HTTPS/localhost  
**QR codes illisibles** : Améliorer éclairage, ajuster distance (20-30 cm)  
**Chunks manquants** : Ralentir vitesse, utiliser mode récupération

## 📈 Estimation temps de transfert

| Taille | Temps (défaut: 2000 octets, 500 ms) |
|--------|--------------------------------------|
| 100 Ko | ~25 secondes |
| 1 Mo | ~4 minutes |
| 10 Mo | ~42 minutes |

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

## 📄 Licence

MIT

