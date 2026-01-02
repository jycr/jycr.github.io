<script>
  import { tick } from "svelte";
  import { scanImageData } from "@undecaf/zbar-wasm";
  import QRCode from "qrcode";
  import { bytesToHex, getIndexBytes } from "./commons";

  // DOM references should NOT use $state() - use regular let for bind:this
  let videoElement;
  let canvas;
  let canvasContext;
  let isScanning = $state(false);
  let fileInfo = $state(null);
  let recoveryQRCode = $state("");
  let downloadUrl = $state("");

  // Statistics
  let missingChunks = $state([]);
  let lastChunkTime = $state(Date.now());
  let scanningStats = $state({
    totalScanned: 0,
    duplicates: 0,
    errors: 0,
  });

  // Reactive derived values for Svelte 5
  let isComplete = $derived(
    fileInfo && fileInfo.receivedCount === fileInfo.totalChunks
  );

  // Function to start scanning
  async function startScanning() {
    isScanning = true;

    // Wait for DOM to update
    await tick();

    if (!videoElement) {
      alert("Video element not ready. Please try again.");
      isScanning = false;
      return;
    }

    // Initialize canvas context if not already done
    if (canvas && !canvasContext) {
      canvasContext = canvas.getContext("2d", { willReadFrequently: true });
    }

    if (!canvasContext) {
      alert("Canvas not ready. Please try again.");
      isScanning = false;
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      videoElement.srcObject = stream;
      videoElement.play();
      requestAnimationFrame(scanQRCode);
    } catch (error) {
      console.error("Camera access error:", error);
      alert("Unable to access camera. Please allow camera access.");
      isScanning = false;
    }
  }

  // Fonction pour arrêter le scan
  function stopScanning() {
    isScanning = false;
    if (videoElement && videoElement.srcObject) {
      videoElement.srcObject.getTracks().forEach((track) => track.stop());
      videoElement.srcObject = null;
    }
  }

  // Main QR code scanning function
  async function scanQRCode() {
    if (!isScanning || !canvasContext) return;

    if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
      canvas.height = videoElement.videoHeight;
      canvas.width = videoElement.videoWidth;

      canvasContext.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      const imageData = canvasContext.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
      );

      try {
        const symbols = await scanImageData(imageData);

        // Traiter tous les QR codes détectés
        if (symbols && symbols.length > 0) {
          for (const symbol of symbols) {
            // Utiliser .data pour les données binaires brutes (Int8Array)
            // symbol.decode() fait un décodage UTF-8 qui corrompt les bytes binaires
            if (symbol?.data.length > 0) {
              processQRCode(symbol);
            }
          }
        }
      } catch (error) {
        console.error("Erreur de scan zbar:", error);
      }
    }

    requestAnimationFrame(scanQRCode);
  }

  const START_JSON = "{".charCodeAt(0);
  function parseJsonFileInfo(symbol) {
    if (symbol.data[0] !== START_JSON) {
      throw new Error("Data is not JSON");
    }

    // Essayer de décoder comme JSON d'abord (pour le QR d'info)
    const jsonData = JSON.parse(symbol.decode());

    // Check if this is file info (initial QR code)
    if (jsonData.type === "fileInfo") {
      // Déterminer le nombre d'octets pour l'index
      const indexBytes = getIndexBytes(jsonData.totalChunks);
      return {
        hash: jsonData.fileHash, // SHA1 en hex
        name: jsonData.fileName,
        size: jsonData.fileSize,
        totalChunks: jsonData.totalChunks,
        indexBytes,
        chunks: [],
        receivedCount: 0,
      };
    } else {
      console.warn("Unknown JSON QR code type:", jsonData.type);
      throw new Error("Unknown JSON QR code type: " + jsonData.type);
    }
  }
  function parseChunck(symbol) {
    // Convertir Int8Array (valeurs signées) en Uint8Array (valeurs non-signées)
    let bytes;
    if (symbol.data instanceof Int8Array) {
      // zbar-wasm retourne un Int8Array, on doit le convertir en Uint8Array
      bytes = new Uint8Array(symbol.data.length);
      for (let i = 0; i < symbol.data.length; i++) {
        // Convertir valeur signée (-128 à 127) en non-signée (0 à 255)
        bytes[i] = symbol.data[i] & 0xff;
      }
    } else if (symbol.data instanceof Uint8Array) {
      bytes = symbol.data;
    } else {
      throw new Error("Invalid symbol data type");
    }

    // Format: [SHA1(20)][chunkIndex(1-3 octets)][data]
    if (bytes.length < 21) {
      throw new Error("Chunk too short");
    }

    // Extraire le hash SHA1 (20 premiers octets)
    const chunkHash = bytesToHex(bytes.slice(0, 20));

    // Vérifier que le chunk appartient au même fichier
    if (chunkHash !== fileInfo.hash) {
      throw new Error(
        `Chunk hash does not match file hash: ${chunkHash}, expected: ${fileInfo.hash}`
      );
    }

    // Extraire l'index du chunk (big endian)
    let chunkIndex = 0;
    for (let i = 0; i < fileInfo.indexBytes; i++) {
      chunkIndex = (chunkIndex << 8) | bytes[20 + i];
    }

    // Vérifier la validité de l'index
    if (chunkIndex < 0 || chunkIndex >= fileInfo.totalChunks) {
      throw new Error(`Invalid chunk index: ${chunkIndex}`);
    }

    // Extraire les données du chunk (après le header)
    return {
      index: chunkIndex,
      data: bytes.slice(20 + fileInfo.indexBytes),
    };
  }

  // Fonction pour traiter les données du QR code
  function processQRCode(symbol) {
    try {
      fileInfo = parseJsonFileInfo(symbol);
      console.log("File info received:", fileInfo);
      return;
    } catch (e) {
      // Data is not JSON, continue to process as binary chunk encoded in string
    }

    scanningStats.totalScanned++;

    try {
      // Si on n'a pas encore les infos du fichier, ignorer les chunks
      if (!fileInfo) {
        console.log("Waiting for file info QR code first...");
        return;
      }
      const chunk = parseChunck(symbol);
      // Vérifier si on a déjà ce chunk
      if (fileInfo.chunks[chunk.index] !== undefined) {
        scanningStats.duplicates++;
        return;
      }
      fileInfo.receivedCount++;

      // Stocker le chunk (en bytes bruts)
      fileInfo.chunks[chunk.index] = chunk.data;
      lastChunkTime = Date.now();

      console.log(
        `Received chunk ${chunk.index + 1}/${fileInfo.totalChunks} (${chunk.data.length} bytes)`
      );

      // Vérifier si tous les chunks sont reçus
      if (fileInfo.receivedCount === fileInfo.totalChunks) {
        stopScanning();
        assembleFile();
      }
    } catch (error) {
      scanningStats.errors++;
      console.error("Error processing QR code:", error);
    }
  }

  // Fonction pour assembler le fichier à partir des chunks
  async function assembleFile() {
    console.log("Assembling file...");

    try {
      // Trier les chunks par index
      const chunks = [];
      for (let i = 0; i < fileInfo.totalChunks; i++) {
        if (fileInfo.chunks[i] === undefined) {
          console.error(`missing chunk: ${i}`);
          return;
        }
        chunks.push(fileInfo.chunks[i]);
      }

      // Calculer la taille totale
      const totalSize = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const fileData = new Uint8Array(totalSize);

      // Copier tous les chunks dans le tableau final
      let offset = 0;
      for (const chunk of chunks) {
        fileData.set(chunk, offset);
        offset += chunk.length;
      }

      // Vérifier le hash (SHA1 pour correspondre au sender)
      const hashBuffer = await crypto.subtle.digest("SHA-1", fileData);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const calculatedHash = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      if (calculatedHash !== fileInfo.hash) {
        alert("⚠ Error: File hash does not match!");
        console.error("Expected hash:", fileInfo.hash);
        console.error("Calculated hash:", calculatedHash);
        return;
      }

      // Create a blob and a download URL
      const blob = new Blob([fileData]);
      downloadUrl = URL.createObjectURL(blob);

      console.log("✓ File assembled successfully!");
    } catch (error) {
      console.error("Error assembling file:", error);
      alert("Error assembling file: " + error.message);
    }
  }

  // Fonction pour générer le QR code de récupération
  async function generateRecoveryQR() {
    missingChunks = [];
    for (let i = 0; i < fileInfo.totalChunks; i++) {
      if (fileInfo.chunks[i] === undefined) {
        missingChunks.push(i);
      }
    }

    if (missingChunks.length === 0) {
      alert("All chunks have been received!");
      return;
    }

    const recoveryData = {
      type: "recovery",
      fileHash: fileInfo.hash,
      missingChunks: missingChunks,
    };

    try {
      recoveryQRCode = await QRCode.toDataURL(JSON.stringify(recoveryData), {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 400,
      });
    } catch (error) {
      console.error(
        "Erreur lors de la génération du QR de récupération:",
        error
      );
    }
  }

  // Fonction pour télécharger le fichier
  function downloadFile() {
    if (!downloadUrl) return;

    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = fileInfo.name || "fichier_recu";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // Fonction pour réinitialiser
  function reset() {
    stopScanning();
    fileInfo = null;
    recoveryQRCode = "";
    downloadUrl = "";
    missingChunks = [];
    scanningStats = {
      totalScanned: 0,
      duplicates: 0,
      errors: 0,
    };

    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
    }
  }

  // Initialize canvas context when canvas is mounted
  $effect(() => {
    if (canvas) {
      canvasContext = canvas.getContext("2d", { willReadFrequently: true });
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
  <header class="card">
    <h1>📥 QR Code Receiver</h1>

    <div class="controls">
      {#if !isScanning}
        <button onclick={startScanning} class="primary">
          📷 Start Scanning
        </button>
      {:else}
        <button onclick={stopScanning} class="danger">
          ⏹ Stop Scanning
        </button>
      {/if}
      <button onclick={reset} class="secondary"> 🔄 Reset </button>
    </div>
  </header>

  <section class="main-content">
    {#if isScanning}
      <div class="scanner-view">
        <video bind:this={videoElement} autoplay playsinline></video>
        <canvas bind:this={canvas} style="display:none;"></canvas>
        <div class="scanner-overlay">
          <div class="scanner-frame"></div>
        </div>
      </div>
    {/if}

    {#if fileInfo}
      <div class="card">
        <h2>2. Reception Progress</h2>
        <div class="file-info">
          <p><strong>Fichier:</strong> {fileInfo.name}</p>
          <p>
            <strong>Hash:</strong>
            <code>{fileInfo.hash}</code>
          </p>
        </div>

        <div class="progress-section">
          <p class="progress-text">
            {fileInfo.receivedCount} / {fileInfo.totalChunks} chunks received ({(
              (fileInfo.receivedCount / fileInfo.totalChunks) *
              100
            ).toFixed(1)}%)
          </p>

          <div class="chunks-grid">
            {#each Array(fileInfo.totalChunks) as _, i}
              <div
                class="chunk-box"
                class:received={fileInfo.chunks[i] !== undefined}
                title="Chunk {i + 1}/{fileInfo.totalChunks}"
              ></div>
            {/each}
          </div>
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
          <div class="success-message">✓ All chunks have been received!</div>
        {/if}
      </div>
    {/if}
  </section>

  <footer class="card">
    {#if fileInfo && !isComplete}
      <div class="card">
        <h2>3. Missing chunks recovery</h2>
        <p>
          If chunks are missing, generate a recovery QR code to scan with the
          sender.
        </p>
        <button onclick={generateRecoveryQR}> 🔄 Generate Recovery QR </button>

        {#if recoveryQRCode}
          <div class="recovery-section">
            <p class="info">
              <strong>{missingChunks.length}</strong> missing chunk(s):
              {missingChunks.slice(0, 10).join(", ")}
              {#if missingChunks.length > 10}
                ...
              {/if}
            </p>
            <div class="qr-display">
              <img src={recoveryQRCode} alt="QR Code de récupération" />
              <p class="qr-caption">
                Scan this QR with the sender page to retransmit missing chunks
              </p>
            </div>
          </div>
        {/if}
      </div>
    {/if}

    {#if isComplete && downloadUrl}
      <div class="card">
        <h2>4. Download file</h2>
        <button onclick={downloadFile} class="download-button">
          💾 Download {fileInfo.name}
        </button>
      </div>
    {/if}
  </footer>
</main>

<style lang="scss">
  main {
    flex: 1;
    display: flex;
    flex-direction: column;
    margin: 0 auto;
    width: 100%;

    > header,
    > footer {
      margin: 1rem;
      padding: 1rem;
    }

    > .main-content {
      flex: 1;
    }
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
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
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
    background-color: #4caf50;
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
    background-color: #2196f3;
    color: white;
  }

  button.secondary:hover {
    background-color: #0b7dda;
  }

  button.download-button {
    background-color: #9c27b0;
    color: white;
    font-size: 1.1rem;
    padding: 1rem 2rem;
  }

  button.download-button:hover {
    background-color: #7b1fa2;
  }

  .scanner-view {
    position: relative;
    margin: 1rem;
    border-radius: 8px;
    overflow: hidden;
    background: #000;

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

      .scanner-frame {
        width: calc(100% - 1rem);
        height: calc(100% - 1rem);
        border: 3px solid #4caf50;
        border-radius: 8px;
        box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
      }
    }
  }

  .chunks-grid {
    display: flex;
    .chunk-box {
      flex: 1;
      height: 20px;
      background: #ddd;
      &.received {
        background: #4caf50;
      }
    }
  }

  .progress-section {
    margin: 1.5rem 0;
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
