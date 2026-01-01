# 📋 Fiche Technique - QR Code File Transfer

## Informations générales

| Propriété | Valeur |
|-----------|--------|
| **Nom** | QR Code File Transfer |
| **Version** | 1.0.0 |
| **Type** | Application web Svelte |
| **Licence** | MIT |
| **Auteur** | - |
| **Date** | Janvier 2026 |

## Architecture technique

### Framework et outils
- **Frontend** : Svelte 5.43.8
- **Build tool** : Vite 7.2.4
- **Package manager** : npm
- **Config** : Multi-page application

### Dépendances principales
```json
{
  "qrcode": "^1.5.4",      // Génération QR codes
  "jsqr": "^1.4.0"         // Lecture QR codes
}
```

### APIs navigateur utilisées
- Web Crypto API (SHA-256)
- MediaDevices API (getUserMedia)
- Canvas API (2D context)
- File API (FileReader, arrayBuffer)
- Blob API (création fichiers)
- URL API (createObjectURL)

## Structure de l'application

### Pages
1. **index.html** - Accueil et navigation
2. **sender.html** - Page émetteur de fichiers
3. **receiver.html** - Page récepteur de fichiers
4. **guide.html** - Documentation utilisateur

### Composants Svelte
- `App.svelte` - Composant page d'accueil
- `Sender.svelte` - Composant émetteur (450+ lignes)
- `Receiver.svelte` - Composant récepteur (400+ lignes)

## Protocole de transfert

### Format des données QR

#### Chunk de données
```json
{
  "fileHash": "sha256_hash_64_chars",
  "fileName": "example.zip",
  "chunkIndex": 0,
  "totalChunks": 100,
  "data": "base64_encoded_chunk_data"
}
```

#### QR de récupération
```json
{
  "type": "recovery",
  "fileHash": "sha256_hash_64_chars",
  "missingChunks": [1, 5, 12, 23, 45]
}
```

### Processus de transmission

1. **Préparation** (Émetteur)
   - Lecture du fichier
   - Calcul SHA-256
   - Découpage en chunks
   - Encodage base64

2. **Transmission** (Émetteur → Récepteur)
   - Génération QR code
   - Affichage séquentiel
   - Intervalle configurable

3. **Réception** (Récepteur)
   - Scan via caméra
   - Décodage QR
   - Stockage chunk
   - Détection doublons

4. **Assemblage** (Récepteur)
   - Tri des chunks
   - Décodage base64
   - Concaténation
   - Vérification hash

5. **Récupération** (Bidirectionnel)
   - Génération QR récupération (R → E)
   - Scan QR récupération (E)
   - Retransmission chunks manquants (E → R)

## Paramètres techniques

### QR Code

| Paramètre | Min | Défaut | Max | Unité |
|-----------|-----|--------|-----|-------|
| Taille chunk | 500 | 2000 | 2900 | octets |
| Vitesse | 100 | 500 | 5000 | ms |
| Taille affichage | - | 600 | - | px |
| Marge | - | 1 | - | px |

### Correction d'erreur

| Niveau | Correction | Usage |
|--------|-----------|--------|
| L | 7% | Maximum données |
| M | 15% | Recommandé |
| Q | 25% | Haute fiabilité |
| H | 30% | Max fiabilité |

### Caméra (Récepteur)

| Paramètre | Valeur |
|-----------|--------|
| Résolution idéale | 1280x720 |
| Facing mode | environment |
| willReadFrequently | true |

## Performances

### Débit théorique

| Config | Octets/s | Ko/min | Mo/h |
|--------|----------|--------|------|
| Min (500o, 5000ms) | 100 | 6 | 0.35 |
| Défaut (2000o, 500ms) | 4000 | 234 | 13.7 |
| Max (2900o, 100ms) | 29000 | 1700 | 99.8 |

### Temps de transfert (config défaut)

| Taille fichier | Chunks | Temps estimé |
|----------------|--------|--------------|
| 100 Ko | 50 | ~25 secondes |
| 1 Mo | 512 | ~4 minutes |
| 10 Mo | 5120 | ~42 minutes |
| 100 Mo | 51200 | ~7 heures |

*Note : Temps théoriques. Peut varier selon conditions.*

## Sécurité

### Mesures implémentées
- ✅ Traitement 100% local
- ✅ Zéro transfert réseau
- ✅ Hash SHA-256 pour intégrité
- ✅ Pas de stockage permanent
- ✅ Nettoyage automatique ressources

### Vérifications
- Hash du fichier complet
- Cohérence des chunks (même fileHash)
- Détection des doublons
- Validation JSON des QR codes

## Compatibilité

### Navigateurs

| Navigateur | Version min | Status |
|------------|-------------|--------|
| Chrome | 90+ | ✅ Recommandé |
| Safari | 14+ | ✅ Testé |
| Firefox | 88+ | ✅ Testé |
| Edge | 90+ | ⚠️ Non testé |

### Systèmes

| Plateforme | Status |
|------------|--------|
| Windows | ✅ Compatible |
| macOS | ✅ Compatible |
| Linux | ✅ Compatible |
| iOS | ✅ Compatible |
| Android | ✅ Compatible |

### Prérequis techniques
- ES2020+ support
- Crypto API support
- MediaDevices API support
- Canvas API support
- JavaScript activé

## Limitations

### Techniques
- Taille max chunk : ~2900 octets (limite QR code)
- Pas de reprise après fermeture navigateur
- Requiert ligne de vue directe
- Sensible aux conditions d'éclairage
- Performance dépend de la qualité caméra

### Pratiques
- Temps long pour gros fichiers
- Nécessite stabilité des appareils
- Consommation batterie importante
- Pas de transfert en arrière-plan

## Build et déploiement

### Commandes
```bash
npm install       # Installation
npm run dev       # Développement
npm run build     # Production
npm run preview   # Prévisualisation
```

### Sortie build
```
dist/
├── index.html (0.62 KB)
├── sender.html (0.63 KB)
├── receiver.html (0.63 KB)
├── assets/
│   ├── CSS (6.01 KB total)
│   └── JS (203.74 KB total)
```

### Configuration déploiement
- Base path configurable dans `vite.config.js`
- Aucune configuration serveur requise
- Peut être servi statiquement
- Compatible GitHub Pages

## Optimisations possibles

### Performance
- [ ] WebWorkers pour traitement
- [ ] Streaming pour gros fichiers
- [ ] Adaptation dynamique vitesse
- [ ] Cache IndexedDB

### Fonctionnalités
- [ ] Compression adaptive
- [ ] Chiffrement E2E
- [ ] Multi-fichiers
- [ ] PWA
- [ ] Mode hors ligne

### UX
- [ ] Mode sombre
- [ ] Graphiques avancés
- [ ] Estimation temps restant
- [ ] Historique transferts

## Métriques du code

| Métrique | Valeur |
|----------|--------|
| Fichiers source | ~10 |
| Lignes de code | ~1500 |
| Composants Svelte | 3 |
| Pages HTML | 4 |
| Dépendances | 2 |
| Taille bundle JS | ~204 KB |
| Taille bundle CSS | ~6 KB |

## Support et documentation

### Documentation
- README.md - Vue d'ensemble
- FEATURES.md - Fonctionnalités détaillées
- DEPLOY.md - Instructions déploiement
- PROJECT_SUMMARY.md - Résumé complet
- guide.html - Guide utilisateur interactif

### Scripts utiles
- `dev.sh` - Menu interactif développement

---

**Status** : ✅ Production-ready  
**Dernière mise à jour** : 01/01/2026

