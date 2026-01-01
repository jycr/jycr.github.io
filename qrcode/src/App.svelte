<script>
</script>

<main>
  <h1>📱 Transfert de fichiers par QR Code</h1>

  <div class="intro">
    <p>
      Cette application permet de transférer des fichiers entre deux appareils en utilisant des QR codes.
    </p>
  </div>

  <div class="cards">
    <div class="card">
      <h2>📤 Émetteur</h2>
      <p>Envoyez un fichier en générant une série de QR codes</p>
      <a href="/sender.html" class="button primary">Ouvrir l'émetteur</a>
    </div>

    <div class="card">
      <h2>📥 Récepteur</h2>
      <p>Recevez un fichier en scannant les QR codes</p>
      <a href="/receiver.html" class="button secondary">Ouvrir le récepteur</a>
    </div>
  </div>

  <div style="text-align: center; margin: 2rem 0;">
    <a href="/guide.html" class="button" style="background: #764ba2; color: white; text-decoration: none; padding: 0.75rem 2rem; border-radius: 6px; display: inline-block;">
      📖 Guide d'utilisation complet
    </a>
  </div>

  <div class="info">
    <h3>Comment ça marche ?</h3>
    <ol>
      <li>Sur l'appareil émetteur, ouvrez la page <strong>Émetteur</strong> et sélectionnez un fichier</li>
      <li>Sur l'appareil récepteur, ouvrez la page <strong>Récepteur</strong> et démarrez le scan</li>
      <li>Placez la caméra du récepteur face aux QR codes affichés par l'émetteur</li>
      <li>Les chunks seront progressivement reçus et le fichier sera reconstruit</li>
      <li>En cas de chunks manquants, générez un QR de récupération depuis le récepteur</li>
      <li>Scannez ce QR sur l'émetteur pour retransmettre uniquement les chunks manquants</li>
    </ol>
  </div>
</main>

<style>
  main {
    max-width: 900px;
    margin: 0 auto;
    padding: 2rem;
    font-family: system-ui, -apple-system, sans-serif;
  }

  h1 {
    color: #333;
    text-align: center;
    margin-bottom: 2rem;
    font-size: 2.5rem;
  }

  .intro {
    text-align: center;
    margin-bottom: 3rem;
    font-size: 1.1rem;
    color: #666;
  }

  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
    margin-bottom: 3rem;
  }

  .card {
    background: white;
    border: 2px solid #ddd;
    border-radius: 12px;
    padding: 2rem;
    text-align: center;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 12px rgba(0,0,0,0.15);
  }

  .card h2 {
    color: #333;
    margin-bottom: 1rem;
    font-size: 1.8rem;
  }

  .card p {
    color: #666;
    margin-bottom: 1.5rem;
  }

  .button {
    display: inline-block;
    padding: 0.75rem 2rem;
    text-decoration: none;
    border-radius: 6px;
    font-weight: 500;
    transition: background-color 0.2s;
    color: white;
  }

  .button.primary {
    background-color: #4CAF50;
  }

  .button.primary:hover {
    background-color: #45a049;
  }

  .button.secondary {
    background-color: #2196F3;
  }

  .button.secondary:hover {
    background-color: #0b7dda;
  }

  .info {
    background: #f9f9f9;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 2rem;
    margin-top: 2rem;
  }

  .info h3 {
    color: #333;
    margin-bottom: 1rem;
  }

  .info ol {
    line-height: 1.8;
    color: #555;
  }

  .info li {
    margin-bottom: 0.5rem;
  }
</style>
