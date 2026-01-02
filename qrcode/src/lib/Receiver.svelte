<script lang="ts">
  import { tick } from "svelte";
  import QRCode from "qrcode";
  import type { FileInfo, ScanningStats, ScannedSymbol } from "./types";
  import { parseFileInfoQRCode, parseChunk, FileItem } from "./receiverService";
  import {
    startCameraStream,
    stopCameraStream,
    scanVideoFrame,
    initializeCanvas,
  } from "./scannerService";
  import { generateRecoveryQRCode } from "./senderService";

  // DOM references should NOT use $state() - use regular let for bind:this
  let videoElement: HTMLVideoElement | undefined = undefined;
  let canvas: HTMLCanvasElement | undefined = undefined;
  let canvasContext: CanvasRenderingContext2D | undefined = undefined;
  let isScanning = $state<boolean>(false);
  let fileItem = $state<FileItem | null>(null);
  let recoveryQRCode = $state<string>("");
  let downloadUrl = $state<string>("");

  // Statistics
  let missingChunks = $state<number[]>([]);

  // Trigger pour forcer la réactivité des stats
  let statsTrigger = $state(0);

  function refreshStats(): void {
    statsTrigger++;
  }

  // Reactive derived values for Svelte 5
  let isComplete = $derived<boolean>(fileItem?.isFileComplete() ?? false);

  // Function to start scanning
  async function startScanning(): Promise<void> {
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
      canvasContext = initializeCanvas(canvas);
    }

    if (!canvasContext) {
      alert("Canvas not ready. Please try again.");
      isScanning = false;
      return;
    }

    try {
      await startCameraStream(videoElement, {
        facingMode: "environment",
        width: { ideal: 1280 },
        height: { ideal: 720 },
      });
      requestAnimationFrame(scanQRCode);
    } catch (error) {
      console.error("Camera access error:", error);
      alert("Unable to access camera. Please allow camera access.");
      isScanning = false;
    }
  }

  // Fonction pour arrêter le scan
  function stopScanning(): void {
    isScanning = false;
    if (videoElement) {
      stopCameraStream(videoElement);
    }
  }

  // Main QR code scanning function
  async function scanQRCode(): Promise<void> {
    if (!isScanning || !canvasContext || !videoElement || !canvas) return;

    const symbols = await scanVideoFrame(videoElement, canvas, canvasContext);

    // Traiter tous les QR codes détectés
    if (symbols.length > 0) {
      for (const symbol of symbols) {
        if (symbol?.data.length > 0) {
          processQRCode(symbol);
        }
      }
    }

    requestAnimationFrame(scanQRCode);
  }

  // Fonction pour traiter les données du QR code
  function processQRCode(symbol: ScannedSymbol): void {
    // Essayer de parser comme QR d'info d'abord
    try {
      const fileInfo = parseFileInfoQRCode(symbol);

      if (!fileItem?.isInfoEquals(fileInfo)) {
        fileItem = new FileItem(fileInfo);
        console.log("Initialized file reception:", fileItem.info);
      }
      return;
    } catch (e) {
      // Data is not JSON, continue to process as binary chunk
    }

    // Si on n'a pas encore les infos du fichier, ignorer les chunks
    if (!fileItem) {
      console.log("Waiting for file info QR code first...");
      return;
    }

    fileItem.stats.total++;
    refreshStats();

    try {
      const chunk = parseChunk(symbol, fileItem.info);
      fileItem.addChunk(chunk);
      refreshStats();

      // Vérifier si tous les chunks sont reçus
      if (isComplete) {
        stopScanning();
        assembleReceivedFile();
      }
    } catch (error) {
      fileItem.stats.errors++;
      refreshStats();
      console.error("Error processing QR code:", error);
    }
  }

  // Fonction pour assembler le fichier à partir des chunks
  async function assembleReceivedFile(): Promise<void> {
    if (!fileItem) return;

    console.log("Assembling file...");

    const result = await fileItem.assembleFile();

    if (!result.success) {
      alert(`⚠ Error: ${result.error}`);
      console.error("Assembly error:", result.error);
      return;
    }

    downloadUrl = result.downloadUrl!;
    console.log("✓ File assembled successfully!");
  }

  // Fonction pour générer le QR code de récupération
  async function generateRecoveryQR(): Promise<void> {
    if (!fileItem) return;

    missingChunks = fileItem.findMissingChunks();

    if (missingChunks.length === 0) {
      alert("All chunks have been received!");
      return;
    }

    try {
      // Convertir le hash hex en Uint8Array pour le service
      const hashBytes = new Uint8Array(20);
      for (let i = 0; i < 20; i++) {
        hashBytes[i] = parseInt(fileItem.info.hash.slice(i * 2, i * 2 + 2), 16);
      }

      recoveryQRCode = await generateRecoveryQRCode(hashBytes, missingChunks);
    } catch (error) {
      console.error(
        "Erreur lors de la génération du QR de récupération:",
        error
      );
    }
  }

  // Fonction pour télécharger le fichier
  function downloadFile(): void {
    if (!downloadUrl || !fileItem) return;
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = fileItem.info.name || "fichier_recu";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // Fonction pour réinitialiser
  function reset(): void {
    stopScanning();
    fileItem = null;
    recoveryQRCode = "";
    downloadUrl = "";
    missingChunks = [];

    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
    }
  }

  // Initialize canvas context when canvas is mounted
  $effect(() => {
    if (canvas) {
      canvasContext = initializeCanvas(canvas);
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

    {#if fileItem}
      <div class="card">
        <h2>2. Reception Progress</h2>
        <div class="file-info">
          <p><strong>Fichier:</strong> {fileItem.info.name}</p>
          <p>
            <strong>Hash:</strong>
            <code>{fileItem.info.hash}</code>
          </p>
        </div>

        <div class="progress-section">
          <p class="progress-text">
            {statsTrigger && fileItem.stats.count} / {fileItem.info.totalChunks}
            chunks received ({(
              (statsTrigger &&
                fileItem.stats.count / fileItem.info.totalChunks) * 100
            ).toFixed(1)}%)
          </p>

          <div class="chunks-grid">
            {#each Array(fileItem.info.totalChunks) as _, i}
              <div
                class="chunk-box"
                class:received={fileItem.hasChunks(i)}
                title="Chunk {i + 1}/{fileItem.info.totalChunks}"
              ></div>
            {/each}
          </div>
        </div>

        <div class="stats">
          <div class="stat-item">
            <span class="stat-label">Total scanned:</span>
            <span class="stat-value"
              >{statsTrigger && fileItem.stats.total}</span
            >
          </div>
          <div class="stat-item">
            <span class="stat-label">Duplicates:</span>
            <span class="stat-value"
              >{statsTrigger && fileItem.stats.duplicates}</span
            >
          </div>
          <div class="stat-item">
            <span class="stat-label">Errors:</span>
            <span class="stat-value"
              >{statsTrigger && fileItem.stats.errors}</span
            >
          </div>
        </div>

        {#if isComplete}
          <div class="success-message">✓ All chunks have been received!</div>
        {/if}
      </div>
    {/if}
  </section>

  <footer class="card">
    {#if fileItem && !isComplete}
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
          💾 Download {fileItem.info.name}
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
