# Migration TypeScript - Architecture

## 📐 Structure du Projet

Le projet a été entièrement migré vers TypeScript avec une architecture modulaire et bien typée.

### Nouveaux fichiers créés

#### Types (`src/lib/types.ts`)
Définitions centralisées de tous les types et interfaces :
- `ErrorCorrectionLevel`, `TransmissionMode`
- `FileInfo`, `FileChunk`, `ParsedChunk`
- `ScanningStats`, `TransmissionConfig`
- `QRCodeOptions`, `ScannedSymbol`
- Et plus encore...

#### Services métier

**`src/lib/commons.ts`**
Utilitaires communs pour manipulation binaire :
- `getIndexBytes()` - Calcul du nombre d'octets pour l'index
- `bytesToHex()`, `hexToBytes()` - Conversions hexadécimales
- `encodeChunkIndex()`, `decodeChunkIndex()` - Encodage/décodage d'index
- `calculateSHA1()`, `calculateSHA1FromBytes()` - Calcul de hash
- `int8ArrayToUint8Array()` - Conversion de types

**`src/lib/receiverService.ts`**
Logique métier pour la réception :
- `parseFileInfoQRCode()` - Parse le QR d'informations initial
- `parseChunk()` - Parse un chunk de données
- `assembleFile()` - Assemble les chunks en fichier complet
- `findMissingChunks()` - Identifie les chunks manquants
- `isFileComplete()` - Vérifie si la réception est complète
- `downloadFile()` - Télécharge le fichier assemblé

**`src/lib/senderService.ts`**
Logique métier pour l'envoi :
- `QR_CAPACITY` - Constantes de capacité des QR codes
- `getMaxChunkSize()` - Calcul de taille maximale
- `validateChunkSize()` - Validation de la taille
- `splitFileIntoChunks()` - Découpage en chunks
- `generateFileInfoQRCode()` - Génération du QR d'infos
- `generateChunkQRCode()` - Génération de QR pour chunks
- `generateMultipleQRCodes()` - Génération parallèle
- `generateRecoveryQRCode()` - QR de récupération
- `getChunksToTransmit()` - Filtrage des chunks

**`src/lib/scannerService.ts`**
Service de scanning de QR codes :
- `startCameraStream()` - Démarrage de la caméra
- `stopCameraStream()` - Arrêt de la caméra
- `scanVideoFrame()` - Scan d'une frame vidéo
- `initializeCanvas()` - Initialisation du canvas
- `createScannerState()` - État initial du scanner

**`src/lib/fileUtils.ts`**
Utilitaires legacy (compatibilité tests) :
- Fonctions base64 pour rétro-compatibilité
- Interfaces `LegacyChunk` et `RecoveryData`

### Composants Svelte refactorisés

**`src/lib/Receiver.svelte`**
- Typage TypeScript complet avec `<script lang="ts">`
- Utilisation des services métier
- Types explicites pour toutes les variables
- Code UI séparé de la logique métier

**`src/lib/Sender.svelte`**
- Typage TypeScript complet avec `<script lang="ts">`
- Utilisation des services métier
- Types explicites pour toutes les variables
- Code UI séparé de la logique métier

### Tests

**`src/lib/__tests__/fileUtils.test.ts`**
- Converti en TypeScript
- Tests de toutes les fonctions utilitaires
- Couverture de code maintenue

## 🎯 Principes appliqués

### 1. **Typage fort**
Tous les paramètres, retours de fonction et variables sont typés explicitement.

### 2. **Séparation des préoccupations**
- **Services** : Logique métier pure, testable indépendamment
- **Composants Svelte** : Uniquement gestion de l'UI et événements
- **Types** : Définitions centralisées, réutilisables

### 3. **Mutualisation du code**
- `commons.ts` : Fonctions utilitaires partagées
- `scannerService.ts` : Code de scanning réutilisé par Sender et Receiver
- Pas de duplication de logique

### 4. **Robustesse**
- Gestion d'erreurs explicite avec types `Result`
- Validation des données à l'entrée
- Guards de type TypeScript (`is`, type predicates)

### 5. **Documentation**
- JSDoc complet pour toutes les fonctions publiques
- Types auto-documentés
- Exemples dans les commentaires

## 🚀 Avantages de la migration

1. **Sécurité** : Les erreurs de type sont détectées à la compilation
2. **Maintenabilité** : Code plus lisible et mieux structuré
3. **Refactoring** : L'IDE peut suivre les usages et aider au refactoring
4. **Documentation** : Les types servent de documentation vivante
5. **Productivité** : Autocomplétion et IntelliSense améliorés
6. **Testabilité** : Services métier isolés et facilement testables

## 📦 Build & Tests

```bash
# Build TypeScript
npm run build

# Tests
npm test

# Tests avec watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

## 🔍 Configuration TypeScript

Le projet utilise `tsconfig.json` avec :
- Target ES2020
- Mode strict activé
- Vérifications de sécurité (`noUncheckedIndexedAccess`)
- Support Svelte 5 avec runes

## ⚠️ Notes importantes

### Warnings Svelte 5
Les warnings sur `$state()` pour les éléments DOM (`videoElement`, `canvas`, etc.) sont **normaux et intentionnels**. Ces éléments utilisés avec `bind:this` ne doivent PAS utiliser `$state()` car ils sont gérés par Svelte lui-même.

### Compatibilité
Les anciens fichiers JavaScript ont été supprimés :
- ❌ `src/lib/commons.js`
- ❌ `src/lib/fileUtils.js`

Remplacés par leurs équivalents TypeScript :
- ✅ `src/lib/commons.ts`
- ✅ `src/lib/fileUtils.ts`
