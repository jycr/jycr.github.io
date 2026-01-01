# Déploiement

## Pour GitHub Pages

1. Assurez-vous d'avoir construit le projet :
```bash
npm run build
```

2. Le dossier `dist` contient les fichiers prêts pour le déploiement.

3. Pour déployer sur GitHub Pages, vous pouvez :
   - Copier le contenu du dossier `dist` dans la branche `gh-pages`
   - Ou utiliser GitHub Actions pour automatiser le déploiement

## Configuration pour le sous-dossier

Si vous déployez dans un sous-dossier (par exemple `/qrcode`), mettez à jour `vite.config.js` :

```javascript
export default defineConfig({
  base: '/qrcode/', // Ajouter cette ligne
  plugins: [svelte()],
  // ...reste de la config
})
```

## Pour tester localement

```bash
# Construire
npm run build

# Prévisualiser
npm run preview
```

## Structure des fichiers déployés

```
dist/
├── index.html           # Page d'accueil
├── sender.html         # Page émetteur
├── receiver.html       # Page récepteur
├── guide.html          # Guide d'utilisation
└── assets/            # JS et CSS compilés
```

## URLs d'accès

Après déploiement :
- Page d'accueil : `https://yourdomain.com/`
- Émetteur : `https://yourdomain.com/sender.html`
- Récepteur : `https://yourdomain.com/receiver.html`
- Guide : `https://yourdomain.com/guide.html`

