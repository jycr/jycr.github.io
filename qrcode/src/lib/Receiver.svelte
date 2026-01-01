<script>
  import jsQR from 'jsqr';
  import QRCode from 'qrcode';

  let videoElement;
  let canvas;
  let canvasContext;
  let isScanning = $state(false);
  let receivedChunks = $state(new Map());
  let fileInfo = $state(null);
  let recoveryQRCode = $state('');
  let downloadUrl = $state('');

  // Statistics
  let totalChunks = $state(0);
  let receivedCount = $state(0);
  let missingChunks = $state([]);
  let lastChunkTime = $state(Date.now());
  let scanningStats = $state({
    totalScanned: 0,
    duplicates: 0,
    errors: 0
  });

  // Reactive derived values for Svelte 5
  let progress = $derived(totalChunks > 0 ? (receivedCount / totalChunks) * 100 : 0);
  let isComplete = $derived(totalChunks > 0 && receivedCount === totalChunks);

  // Function to start scanning
  async function startScanning() {
    if (!videoElement) {
      alert('Video element not ready. Please try again.');
      return;
    }

    isScanning = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      videoElement.srcObject = stream;
      videoElement.play();
      requestAnimationFrame(scanQRCode);
    } catch (error) {
      console.error('Camera access error:', error);
      alert('Unable to access camera. Please allow camera access.');
      isScanning = false;
    }
  }

  // Fonction pour arrêter le scan
  function stopScanning() {
    isScanning = false;
    if (videoElement && videoElement.srcObject) {
      videoElement.srcObject.getTracks().forEach(track => track.stop());
      videoElement.srcObject = null;
    }
  }

  // Fonction principale de scan des QR codes
  function scanQRCode() {
    if (!isScanning) return;

    if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
      canvas.height = videoElement.videoHeight;
      canvas.width = videoElement.videoWidth;

      canvasContext.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      const imageData = canvasContext.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (code) {
        processQRCode(code.data);
      }
    }

    requestAnimationFrame(scanQRCode);
  }

  // Fonction pour traiter les données du QR code
  function processQRCode(data) {
    scanningStats.totalScanned++;

    try {
      const chunk = JSON.parse(data);

      // Vérifier que c'est un chunk valide
      if (!chunk.fileHash || chunk.chunkIndex === undefined || !chunk.data) {
        scanningStats.errors++;
        return;
      }

      // Initialiser les infos du fichier si c'est le premier chunk
      if (!fileInfo) {
        fileInfo = {
          hash: chunk.fileHash,
          name: chunk.fileName,
          totalChunks: chunk.totalChunks
        };
        totalChunks = chunk.totalChunks;
      }

      // Vérifier que le chunk appartient au même fichier
      if (chunk.fileHash !== fileInfo.hash) {
        console.warn('Chunk d\'un autre fichier détecté');
        return;
      }

      // Vérifier si on a déjà ce chunk
      if (receivedChunks.has(chunk.chunkIndex)) {
        scanningStats.duplicates++;
        return;
      }

      // Stocker le chunk
      receivedChunks.set(chunk.chunkIndex, chunk.data);
      receivedCount = receivedChunks.size;
      lastChunkTime = Date.now();

      console.log(`Chunk ${chunk.chunkIndex + 1}/${totalChunks} reçu`);

      // Vérifier si tous les chunks sont reçus
      if (receivedCount === totalChunks) {
        assembleFile();
      }

    } catch (error) {
      scanningStats.errors++;
      console.error('Erreur de traitement du QR code:', error);
    }
  }

  // Fonction pour assembler le fichier à partir des chunks
  async function assembleFile() {
    console.log('Assemblage du fichier...');

    try {
      // Trier les chunks par index
      const sortedChunks = [];
      for (let i = 0; i < totalChunks; i++) {
        if (!receivedChunks.has(i)) {
          console.error(`Chunk ${i} manquant`);
          return;
        }
        sortedChunks.push(receivedChunks.get(i));
      }

      // Décoder les chunks base64 et les assembler
      const chunks = sortedChunks.map(base64 => {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
      });

      // Calculer la taille totale
      const totalSize = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const fileData = new Uint8Array(totalSize);

      // Copier tous les chunks dans le tableau final
      let offset = 0;
      for (const chunk of chunks) {
        fileData.set(chunk, offset);
        offset += chunk.length;
      }

      // Vérifier le hash
      const hashBuffer = await crypto.subtle.digest('SHA-256', fileData);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const calculatedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      if (calculatedHash !== fileInfo.hash) {
        alert('⚠ Erreur: Le hash du fichier ne correspond pas !');
        console.error('Hash attendu:', fileInfo.hash);
        console.error('Hash calculé:', calculatedHash);
        return;
      }

      // Créer un blob et une URL de téléchargement
      const blob = new Blob([fileData]);
      downloadUrl = URL.createObjectURL(blob);

      console.log('✓ Fichier assemblé avec succès !');
      stopScanning();

    } catch (error) {
      console.error('Erreur lors de l\'assemblage du fichier:', error);
      alert('Erreur lors de l\'assemblage du fichier');
    }
  }

  // Fonction pour générer le QR code de récupération
  async function generateRecoveryQR() {
    missingChunks = [];
    for (let i = 0; i < totalChunks; i++) {
      if (!receivedChunks.has(i)) {
        missingChunks.push(i);
      }
    }

    if (missingChunks.length === 0) {
      alert('All chunks have been received!');
      return;
    }

    const recoveryData = {
      type: 'recovery',
      fileHash: fileInfo.hash,
      missingChunks: missingChunks
    };

    try {
      recoveryQRCode = await QRCode.toDataURL(JSON.stringify(recoveryData), {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 400
      });
    } catch (error) {
      console.error('Erreur lors de la génération du QR de récupération:', error);
    }
  }

  // Fonction pour télécharger le fichier
  function downloadFile() {
    if (!downloadUrl) return;

    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = fileInfo.name || 'fichier_recu';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // Fonction pour réinitialiser
  function reset() {
    stopScanning();
    receivedChunks.clear();
    fileInfo = null;
    recoveryQRCode = '';
    downloadUrl = '';
    totalChunks = 0;
    receivedCount = 0;
    missingChunks = [];
    scanningStats = {
      totalScanned: 0,
      duplicates: 0,
      errors: 0
    };

    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
    }
  }

  // Initialize canvas context when canvas is mounted
  $effect(() => {
    if (canvas) {
      canvasContext = canvas.getContext('2d', { willReadFrequently: true });
    }

    // Cleanup on component destroy
    return () => {
      stopScanning();
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
      }
    };
  });
</script>

<main>
  <h1>📥 QR Code Receiver</h1>

  <div class="card">
    <h2>1. Scan QR codes</h2>
    <div class="controls">
      {#if !isScanning}
        <button on:click={startScanning} class="primary">
          📷 Start Scanning
        </button>
      {:else}
        <button on:click={stopScanning} class="danger">
          ⏹ Stop Scanning
        </button>
      {/if}
      <button on:click={reset} class="secondary">
        🔄 Réinitialiser
      </button>
    </div>

    {#if isScanning}
      <div class="scanner-view">
        <video bind:this={videoElement} autoplay playsinline></video>
        <canvas bind:this={canvas} style="display:none;"></canvas>
        <div class="scanner-overlay">
          <div class="scanner-frame"></div>
        </div>
      </div>
    {/if}
  </div>

  {#if fileInfo}
    <div class="card">
      <h2>2. Reception Progress</h2>
      <div class="file-info">
        <p><strong>Fichier:</strong> {fileInfo.name}</p>
        <p><strong>Hash:</strong> <code>{fileInfo.hash.substring(0, 16)}...</code></p>
      </div>

      <div class="progress-section">
        <div class="progress-bar">
          <div class="progress-fill" style="width: {progress}%"></div>
        </div>
        <p class="progress-text">
          {receivedCount} / {totalChunks} chunks received ({progress.toFixed(1)}%)
        </p>
      </div>

      <div class="stats">
        <div class="stat-item">
          <span class="stat-label">Total scanned:</span>
          <span class="stat-value">{scanningStats.totalScanned}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Duplicates:</span>
          <span class="stat-value">{scanningStats.duplicates}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Errors:</span>
          <span class="stat-value">{scanningStats.errors}</span>
        </div>
      </div>

      {#if isComplete}
        <div class="success-message">
          ✓ All chunks have been received!
        </div>
      {/if}
    </div>
  {/if}

  {#if fileInfo && !isComplete}
    <div class="card">
      <h2>3. Missing chunks recovery</h2>
      <p>If chunks are missing, generate a recovery QR code to scan with the sender.</p>
      <button on:click={generateRecoveryQR}>
        🔄 Generate Recovery QR
      </button>

      {#if recoveryQRCode}
        <div class="recovery-section">
          <p class="info">
            <strong>{missingChunks.length}</strong> missing chunk(s):
            {missingChunks.slice(0, 10).join(', ')}
            {#if missingChunks.length > 10}
              ...
            {/if}
          </p>
          <div class="qr-display">
            <img src={recoveryQRCode} alt="QR Code de récupération" />
            <p class="qr-caption">Scan this QR with the sender page to retransmit missing chunks</p>
          </div>
        </div>
      {/if}
    </div>
  {/if}

  {#if isComplete && downloadUrl}
    <div class="card">
      <h2>4. Download file</h2>
      <button on:click={downloadFile} class="download-button">
        💾 Download {fileInfo.name}
      </button>
    </div>
  {/if}
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

  .controls {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
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

  button.primary {
    background-color: #4CAF50;
    color: white;
  }

  button.primary:hover {
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

  button.download-button {
    background-color: #9C27B0;
    color: white;
    font-size: 1.1rem;
    padding: 1rem 2rem;
  }

  button.download-button:hover {
    background-color: #7B1FA2;
  }

  .scanner-view {
    position: relative;
    margin: 1rem 0;
    border-radius: 8px;
    overflow: hidden;
    background: #000;
  }

  video {
    width: 100%;
    height: auto;
    display: block;
  }

  .scanner-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }

  .scanner-frame {
    width: 300px;
    height: 300px;
    border: 3px solid #4CAF50;
    border-radius: 8px;
    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
  }

  .file-info {
    margin: 1rem 0;
  }

  .file-info p {
    margin: 0.5rem 0;
  }

  .progress-section {
    margin: 1.5rem 0;
  }

  .progress-bar {
    width: 100%;
    height: 30px;
    background: #f0f0f0;
    border-radius: 15px;
    overflow: hidden;
    margin-bottom: 0.5rem;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #4CAF50, #8BC34A);
    transition: width 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .progress-text {
    text-align: center;
    font-weight: bold;
    color: #555;
    margin: 0.5rem 0;
  }

  .stats {
    display: flex;
    gap: 1rem;
    margin: 1rem 0;
    flex-wrap: wrap;
  }

  .stat-item {
    flex: 1;
    min-width: 150px;
    padding: 1rem;
    background: #f9f9f9;
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .stat-label {
    font-size: 0.9rem;
    color: #777;
    margin-bottom: 0.25rem;
  }

  .stat-value {
    font-size: 1.5rem;
    font-weight: bold;
    color: #333;
  }

  .success-message {
    padding: 1rem;
    background: #d4edda;
    border: 1px solid #c3e6cb;
    border-radius: 4px;
    color: #155724;
    text-align: center;
    font-weight: bold;
    margin: 1rem 0;
  }

  .recovery-section {
    margin-top: 1rem;
  }

  .qr-display {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 1rem 0;
    padding: 1rem;
    background: #f9f9f9;
    border-radius: 4px;
  }

  .qr-display img {
    max-width: 100%;
    height: auto;
  }

  .qr-caption {
    margin-top: 0.5rem;
    font-size: 0.9rem;
    color: #666;
    text-align: center;
  }

  .info {
    padding: 0.75rem;
    background: #fff3cd;
    border: 1px solid #ffc107;
    border-radius: 4px;
    color: #856404;
    margin: 1rem 0;
  }

  code {
    background: #f4f4f4;
    padding: 0.2rem 0.4rem;
    border-radius: 3px;
    font-family: monospace;
    font-size: 0.9rem;
  }

  p {
    margin: 0.5rem 0;
  }
</style>

