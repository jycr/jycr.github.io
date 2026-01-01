# 📱 Transfert de fichiers par QR Code

Application Svelte permettant de transférer des fichiers entre deux appareils en utilisant des QR codes.

## 🚀 Fonctionnalités

### Page Émetteur (`sender.html`)
- Sélection d'un fichier à transmettre
- Calcul automatique du hash SHA-256 du fichier
- Découpage du fichier en chunks
- Génération et affichage séquentiel de QR codes
- Paramètres configurables :
  - Vitesse de transmission (ms entre chaque QR code)
  - Taille des chunks (en octets)
  - Niveau de correction d'erreur (L, M, Q, H)
- Scanner de QR code de récupération pour retransmettre les chunks manquants
- Mode récupération pour ne transmettre que les chunks manquants

### Page Récepteur (`receiver.html`)
- Scan des QR codes via la caméra
- Réception et stockage des chunks
- Barre de progression en temps réel
- Statistiques de réception (total scanné, doublons, erreurs)
- Vérification de l'intégrité du fichier (hash SHA-256)
- Assemblage automatique du fichier une fois tous les chunks reçus
- Génération d'un QR code de récupération pour les chunks manquants
- Téléchargement du fichier reconstruit

## 📦 Installation

```bash
# Installer les dépendances
npm install

# Démarrer le serveur de développement
npm run dev

# Construire pour la production
npm run build
```

## 🛠️ Technologies utilisées

- **Svelte** : Framework JavaScript réactif
- **Vite** : Outil de build rapide
- **qrcode** : Génération de QR codes
- **jsQR** : Lecture de QR codes
- **Web Crypto API** : Calcul du hash SHA-256
- **MediaDevices API** : Accès à la caméra

## 📖 Utilisation

### 1. Ouvrir l'application

Deux appareils sont nécessaires :
- **Appareil A** (émetteur) : Ouvre `sender.html`
- **Appareil B** (récepteur) : Ouvre `receiver.html`

### 2. Transmission initiale

1. Sur l'appareil A, sélectionnez le fichier à transmettre
2. Configurez les paramètres de transmission si nécessaire
3. Cliquez sur "Démarrer la transmission"
4. Sur l'appareil B, cliquez sur "Démarrer le scan"
5. Placez la caméra de B face aux QR codes affichés par A
6. Attendez que tous les chunks soient reçus

### 3. Récupération des chunks manquants

Si des chunks sont manquants :

1. Sur l'appareil B, cliquez sur "Générer QR de récupération"
2. Un QR code s'affiche avec la liste des chunks manquants
3. Sur l'appareil A, cliquez sur "Scanner QR de récupération"
4. Scannez le QR affiché par B
5. L'émetteur retransmet automatiquement les chunks manquants

### 4. Téléchargement

Une fois tous les chunks reçus :
1. Le fichier est automatiquement assemblé
2. Le hash est vérifié
3. Cliquez sur "Télécharger" pour sauvegarder le fichier

## ⚙️ Paramètres recommandés

### Pour des petits fichiers (< 1 Mo)
- Taille des chunks : 2000 octets
- Vitesse : 500 ms
- Correction d'erreur : M

### Pour des fichiers moyens (1-10 Mo)
- Taille des chunks : 2500 octets
- Vitesse : 300 ms
- Correction d'erreur : M ou Q

### Pour des gros fichiers (> 10 Mo)
- Taille des chunks : 2900 octets (maximum pour QR code)
- Vitesse : 200 ms
- Correction d'erreur : L ou M

**Note** : Une taille de chunk plus grande réduit le nombre de QR codes mais rend la lecture plus difficile. Un niveau de correction élevé (H) augmente la fiabilité mais réduit la capacité de données.

## 🔒 Sécurité

- Vérification de l'intégrité avec hash SHA-256
- Pas de compression supplémentaire (pour fichiers déjà compressés)
- Transmission locale (pas de serveur externe)
- Utilisation d'APIs standard modernes du navigateur

## 🌐 Compatibilité

Nécessite un navigateur moderne supportant :
- Web Crypto API (SHA-256)
- MediaDevices API (getUserMedia)
- Canvas API
- ES6+ (async/await, Map, Set)

Testé sur :
- Google Chrome (dernière version recommandée)
- Safari (iOS et macOS)
- Firefox

## 📝 Limitations

- La taille maximale d'un chunk est limitée par la capacité d'un QR code (~2900 octets)
- La vitesse de transmission dépend de la qualité de la caméra et de l'affichage
- Les très gros fichiers peuvent prendre du temps à transmettre
- Nécessite une ligne de vue directe entre l'émetteur et le récepteur

## 🐛 Dépannage

### La caméra ne se lance pas
- Vérifiez que vous avez autorisé l'accès à la caméra
- Utilisez HTTPS ou localhost
- Redémarrez le navigateur

### Les QR codes ne se lisent pas
- Augmentez la taille d'affichage des QR codes
- Réduisez la taille des chunks
- Augmentez le niveau de correction d'erreur
- Améliorez l'éclairage
- Nettoyez l'objectif de la caméra

### Des chunks sont perdus
- Ralentissez la vitesse de transmission
- Générez un QR de récupération
- Stabilisez les appareils

## 📄 Licence

MIT

