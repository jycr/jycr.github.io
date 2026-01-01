<script>
  import { onMount } from 'svelte';
  import QRCode from 'qrcode';
  import jsQR from 'jsqr';

  let selectedFile = null;
  let fileChunks = [];
  let fileHash = '';
  let isTransmitting = false;
  let currentChunkIndex = 0;
  let qrCodeUrl = '';
  let canvas;
  let videoElement;
  let canvasContext;
  let scannerActive = false;
  let missingChunks = [];
  let transmissionMode = 'all'; // 'all' ou 'recovery'

  // Paramètres configurables
  let chunkSize = 2000; // Taille maximale des données par QR code (en octets)
  let transmissionSpeed = 500; // Millisecondes entre chaque QR code
  let errorCorrectionLevel = 'M'; // L, M, Q, H
  let totalChunks = 0;
  let transmittedChunks = new Set();

  // Fonction pour calculer le hash SHA-256 d'un fichier
  async function calculateSHA256(file) {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Fonction pour découper le fichier en chunks
  async function processFile() {
    if (!selectedFile) return;

    // Calculer le hash du fichier
    fileHash = await calculateSHA256(selectedFile);

    // Lire le fichier
    const arrayBuffer = await selectedFile.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Découper en chunks
    fileChunks = [];
    totalChunks = Math.ceil(uint8Array.length / chunkSize);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, uint8Array.length);
      const chunkData = uint8Array.slice(start, end);

      // Convertir en base64 pour le transport
      const base64Chunk = btoa(String.fromCharCode(...chunkData));

      fileChunks.push({
        fileHash: fileHash,
        fileName: selectedFile.name,
        chunkIndex: i,
        totalChunks: totalChunks,
        data: base64Chunk
      });
    }

    console.log(`Fichier découpé en ${totalChunks} chunks`);
  }

  // Fonction pour démarrer la transmission
  async function startTransmission() {
    if (fileChunks.length === 0) {
      await processFile();
    }

    isTransmitting = true;
    currentChunkIndex = 0;
    transmittedChunks.clear();
    transmitNextChunk();
  }

  // Fonction pour transmettre le prochain chunk
  async function transmitNextChunk() {
    if (!isTransmitting) return;

    let chunksToTransmit = [];

    if (transmissionMode === 'recovery' && missingChunks.length > 0) {
      // Mode récupération : n'envoyer que les chunks manquants
      chunksToTransmit = missingChunks.map(idx => fileChunks[idx]).filter(Boolean);
    } else {
      // Mode normal : envoyer tous les chunks
      chunksToTransmit = fileChunks;
    }

    if (chunksToTransmit.length === 0) {
      isTransmitting = false;
      return;
    }

    const chunk = chunksToTransmit[currentChunkIndex % chunksToTransmit.length];

    try {
      // Générer le QR code avec les données du chunk
      const qrData = JSON.stringify(chunk);
      qrCodeUrl = await QRCode.toDataURL(qrData, {
        errorCorrectionLevel: errorCorrectionLevel,
        margin: 1,
        width: 600,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      transmittedChunks.add(chunk.chunkIndex);
      currentChunkIndex++;

      // Programmer le prochain chunk
      setTimeout(transmitNextChunk, transmissionSpeed);
    } catch (error) {
      console.error('Erreur lors de la génération du QR code:', error);
      isTransmitting = false;
    }
  }

  // Fonction pour arrêter la transmission
  function stopTransmission() {
    isTransmitting = false;
  }

  // Fonction pour scanner le QR code de récupération
  async function startRecoveryScanner() {
    scannerActive = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      videoElement.srcObject = stream;
      videoElement.play();
      requestAnimationFrame(scanRecoveryQR);
    } catch (error) {
      console.error('Erreur d\'accès à la caméra:', error);
      alert('Impossible d\'accéder à la caméra');
      scannerActive = false;
    }
  }

  // Fonction pour scanner le QR de récupération
  function scanRecoveryQR() {
    if (!scannerActive) return;

    if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
      canvasContext.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      const imageData = canvasContext.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code) {
        try {
          const recoveryData = JSON.parse(code.data);
          if (recoveryData.type === 'recovery' && recoveryData.fileHash === fileHash) {
            missingChunks = recoveryData.missingChunks;
            stopRecoveryScanner();
            transmissionMode = 'recovery';
            alert(`QR de récupération scanné ! ${missingChunks.length} chunks manquants détectés.`);
            return;
          }
        } catch (e) {
          // Pas un QR de récupération valide
        }
      }
    }

    requestAnimationFrame(scanRecoveryQR);
  }

  // Fonction pour arrêter le scanner
  function stopRecoveryScanner() {
    scannerActive = false;
    if (videoElement && videoElement.srcObject) {
      videoElement.srcObject.getTracks().forEach(track => track.stop());
      videoElement.srcObject = null;
    }
  }

  // Fonction pour réinitialiser
  function reset() {
    stopTransmission();
    stopRecoveryScanner();
    selectedFile = null;
    fileChunks = [];
    fileHash = '';
    currentChunkIndex = 0;
    qrCodeUrl = '';
    missingChunks = [];
    transmissionMode = 'all';
    transmittedChunks.clear();
  }

  // Gestionnaire de sélection de fichier
  function handleFileSelect(event) {
    selectedFile = event.target.files[0];
    if (selectedFile) {
      processFile();
    }
  }

  onMount(() => {
    canvasContext = canvas.getContext('2d');
  });
</script>

<main>
  <h1>📤 QR Code Sender</h1>

  <div class="card">
    <h2>1. Sélectionner un fichier</h2>
    <input
      type="file"
      on:change={handleFileSelect}
      accept="*/*"
    />
    {#if selectedFile}
      <p>✓ Fichier: <strong>{selectedFile.name}</strong> ({Math.round(selectedFile.size / 1024)} Ko)</p>
      <p>Hash: <code>{fileHash.substring(0, 16)}...</code></p>
      <p>Chunks: <strong>{totalChunks}</strong></p>
    {/if}
  </div>

  <div class="card">
    <h2>2. Paramètres de transmission</h2>
    <div class="settings">
      <label>
        Vitesse de transmission (ms):
        <input type="number" bind:value={transmissionSpeed} min="100" max="5000" step="100" />
      </label>
      <label>
        Taille des chunks (octets):
        <input type="number" bind:value={chunkSize} min="500" max="2900" step="100" />
      </label>
      <label>
        Niveau de correction d'erreur:
        <select bind:value={errorCorrectionLevel}>
          <option value="L">L (7%)</option>
          <option value="M">M (15%)</option>
          <option value="Q">Q (25%)</option>
          <option value="H">H (30%)</option>
        </select>
      </label>
    </div>
  </div>

  <div class="card">
    <h2>3. Transmission</h2>
    <div class="controls">
      {#if !isTransmitting}
        <button
          on:click={startTransmission}
          disabled={!selectedFile}
          class="primary"
        >
          ▶ Démarrer la transmission
        </button>
      {:else}
        <button on:click={stopTransmission} class="danger">
          ⏹ Arrêter
        </button>
      {/if}
      <button on:click={reset} class="secondary">
        🔄 Réinitialiser
      </button>
    </div>

    {#if isTransmitting}
      <p class="status">
        Transmission en cours...
        Chunk {(currentChunkIndex % (transmissionMode === 'recovery' ? missingChunks.length : totalChunks)) + 1} /
        {transmissionMode === 'recovery' ? missingChunks.length : totalChunks}
        {#if transmissionMode === 'recovery'}
          <span class="recovery-mode">(Mode récupération)</span>
        {/if}
      </p>
    {/if}

    {#if qrCodeUrl}
      <div class="qr-display">
        <img src={qrCodeUrl} alt="QR Code" />
      </div>
    {/if}
  </div>

  <div class="card">
    <h2>4. Récupération des chunks manquants</h2>
    <p>Scanner le QR code de récupération affiché par le récepteur</p>
    {#if !scannerActive}
      <button on:click={startRecoveryScanner} disabled={!selectedFile}>
        📷 Scanner QR de récupération
      </button>
    {:else}
      <button on:click={stopRecoveryScanner} class="danger">
        ⏹ Arrêter le scan
      </button>
    {/if}

    {#if scannerActive}
      <div class="scanner-view">
        <video bind:this={videoElement} width="400" height="300" style="display:block;"></video>
        <canvas bind:this={canvas} width="400" height="300" style="display:none;"></canvas>
      </div>
    {/if}

    {#if missingChunks.length > 0}
      <p class="info">
        ⚠ {missingChunks.length} chunks à retransmettre
      </p>
    {/if}
  </div>
</main>

<style>
  main {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
    font-family: system-ui, -apple-system, sans-serif;
  }

  h1 {
    color: #333;
    text-align: center;
    margin-bottom: 2rem;
  }

  h2 {
    color: #555;
    font-size: 1.2rem;
    margin-bottom: 1rem;
  }

  .card {
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  .settings {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    font-weight: 500;
  }

  input[type="number"],
  select {
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 1rem;
  }

  input[type="file"] {
    margin: 0.5rem 0;
  }

  .controls {
    display: flex;
    gap: 1rem;
    margin: 1rem 0;
    flex-wrap: wrap;
  }

  button {
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  button.primary {
    background-color: #4CAF50;
    color: white;
  }

  button.primary:hover:not(:disabled) {
    background-color: #45a049;
  }

  button.danger {
    background-color: #f44336;
    color: white;
  }

  button.danger:hover {
    background-color: #da190b;
  }

  button.secondary {
    background-color: #2196F3;
    color: white;
  }

  button.secondary:hover {
    background-color: #0b7dda;
  }

  .qr-display {
    display: flex;
    justify-content: center;
    margin: 1rem 0;
    padding: 1rem;
    background: #f9f9f9;
    border-radius: 4px;
  }

  .qr-display img {
    max-width: 100%;
    height: auto;
  }

  .status {
    font-weight: bold;
    color: #2196F3;
    text-align: center;
    margin: 1rem 0;
  }

  .recovery-mode {
    color: #ff9800;
    font-style: italic;
  }

  .scanner-view {
    margin: 1rem 0;
    text-align: center;
  }

  .scanner-view video {
    border: 2px solid #2196F3;
    border-radius: 4px;
    max-width: 100%;
  }

  .info {
    padding: 0.75rem;
    background: #fff3cd;
    border: 1px solid #ffc107;
    border-radius: 4px;
    color: #856404;
    margin-top: 1rem;
  }

  code {
    background: #f4f4f4;
    padding: 0.2rem 0.4rem;
    border-radius: 3px;
    font-family: monospace;
  }

  p {
    margin: 0.5rem 0;
  }
</style>

