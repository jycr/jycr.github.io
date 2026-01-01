<script>
  import { tick } from "svelte";
  import QRCode from "qrcode";
  import jsQR from "jsqr";

  // QR Code capacity limits (in bytes) for binary data based on error correction level
  // These are approximate values for QR code version 40 (largest)
  const QR_CAPACITY = {
    L: 2953, // Low (7% error correction)
    M: 2331, // Medium (15% error correction)
    Q: 1663, // Quartile (25% error correction)
    H: 1273, // High (30% error correction)
  };

  let selectedFile = $state(null);
  let fileChunks = $state([]);
  let fileHash = $state("");
  let isTransmitting = $state(false);
  let currentChunkIndex = $state(0);
  let qrCodeUrl = $state("");
  let canvas = $state();
  let videoElement = $state();
  let canvasContext;
  let scannerActive = $state(false);
  let missingChunks = $state([]);
  let transmissionMode = $state("all"); // 'all' or 'recovery'

  // Configurable parameters
  let chunkSize = $state(1400); // Maximum data size per QR code (in bytes) - reduced default
  let transmissionSpeed = $state(100); // Milliseconds between each QR code
  let errorCorrectionLevel = $state("M"); // L, M, Q, H
  let totalChunks = $state(0);
  let transmittedChunks = $state(new Set());
  let infoQRCode = $state(""); // QR code initial avec les métadonnées

  // Get maximum chunk size based on error correction level
  function getMaxChunkSize() {
    // Account for JSON overhead (fileHash, fileName, chunkIndex, totalChunks)
    // Typical overhead is ~150-200 bytes, we use 250 to be safe
    const jsonOverhead = 250;
    return QR_CAPACITY[errorCorrectionLevel] - jsonOverhead;
  }

  // Validate and adjust chunk size
  function validateChunkSize() {
    const maxSize = getMaxChunkSize();
    if (chunkSize > maxSize) {
      chunkSize = maxSize;
      alert(
        `Chunk size adjusted to ${maxSize} bytes to fit in QR code with ${errorCorrectionLevel} error correction.`
      );
    }
  }

  // Fonction pour calculer le hash SHA-256 d'un fichier
  async function calculateSHA256(file) {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
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

      // Convert to base64 for transport
      const base64Chunk = btoa(String.fromCharCode(...chunkData));

      fileChunks.push({
        fileHash: fileHash,
        fileName: selectedFile.name,
        chunkIndex: i,
        totalChunks: totalChunks,
        data: base64Chunk,
      });
    }

    // Générer le QR code d'information initial
    await generateInfoQRCode();
  }

  // Fonction pour générer le QR code d'information initial
  async function generateInfoQRCode() {
    const infoData = {
      type: "fileInfo",
      fileHash: fileHash,
      fileName: selectedFile.name,
      fileSize: selectedFile.size,
      totalChunks: totalChunks,
      chunkSize: chunkSize,
    };

    try {
      infoQRCode = await QRCode.toDataURL(JSON.stringify(infoData), {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 800,
      });
    } catch (error) {
      console.error("Erreur lors de la génération du QR d'info:", error);
    }
  }

  // Function to start transmission
  async function startTransmission() {
    // Validate chunk size before starting
    validateChunkSize();

    if (fileChunks.length === 0) {
      await processFile();
    }

    isTransmitting = true;
    currentChunkIndex = 0;
    transmittedChunks.clear();
    transmitNextChunk();
  }

  // Function to transmit the next chunk
  async function transmitNextChunk() {
    if (!isTransmitting) return;

    let chunksToTransmit = [];

    if (transmissionMode === "recovery" && missingChunks.length > 0) {
      // Recovery mode: send only missing chunks
      chunksToTransmit = missingChunks
        .map((idx) => fileChunks[idx])
        .filter(Boolean);
    } else {
      // Normal mode: send all chunks
      chunksToTransmit = fileChunks;
    }

    if (chunksToTransmit.length === 0) {
      isTransmitting = false;
      return;
    }

    // Check if we've transmitted all chunks (don't loop)
    if (currentChunkIndex >= chunksToTransmit.length) {
      isTransmitting = false;
      startRecoveryScanner();
      return;
    }

    const chunk = chunksToTransmit[currentChunkIndex];

    try {
      // Generate QR code with chunk data
      const qrData = JSON.stringify(chunk);
      qrCodeUrl = await QRCode.toDataURL(qrData, {
        errorCorrectionLevel: errorCorrectionLevel,
        margin: 1,
        width: 1000,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });

      transmittedChunks.add(chunk.chunkIndex);
      currentChunkIndex++;

      // Schedule next chunk
      setTimeout(transmitNextChunk, transmissionSpeed);
    } catch (error) {
      console.error("Error generating QR code:", error);
      alert(
        `Error generating QR code: ${error.message}\n\nTry reducing the chunk size or changing the error correction level.`
      );
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

    // Wait for DOM elements to be mounted
    await tick();
    await tick();
    await new Promise((resolve) => setTimeout(resolve, 50));

    if (!videoElement) {
      alert("Video element not ready. Please try again.");
      scannerActive = false;
      return;
    }

    // Initialize canvas context if not already done
    if (canvas && !canvasContext) {
      canvas.width = 400;
      canvas.height = 300;
      canvasContext = canvas.getContext("2d", { willReadFrequently: true });
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      videoElement.srcObject = stream;
      videoElement.play();
      requestAnimationFrame(scanRecoveryQR);
    } catch (error) {
      console.error("Erreur d'accès à la caméra:", error);
      alert("Impossible d'accéder à la caméra");
      scannerActive = false;
    }
  }

  // Fonction pour scanner le QR de récupération
  function scanRecoveryQR() {
    if (!scannerActive) return;

    if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
      canvasContext.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      const imageData = canvasContext.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
      );
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code) {
        try {
          const recoveryData = JSON.parse(code.data);
          if (
            recoveryData.type === "recovery" &&
            recoveryData.fileHash === fileHash
          ) {
            missingChunks = recoveryData.missingChunks;
            stopRecoveryScanner();
            transmissionMode = "recovery";
            alert(
              `QR de récupération scanné ! ${missingChunks.length} chunks manquants détectés.`
            );
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
      videoElement.srcObject.getTracks().forEach((track) => track.stop());
      videoElement.srcObject = null;
    }
  }

  // Fonction pour réinitialiser
  function reset() {
    stopTransmission();
    stopRecoveryScanner();
    selectedFile = null;
    fileChunks = [];
    fileHash = "";
    currentChunkIndex = 0;
    qrCodeUrl = "";
    missingChunks = [];
    transmissionMode = "all";
    transmittedChunks.clear();
  }

  // Gestionnaire de sélection de fichier
  function handleFileSelect(event) {
    selectedFile = event.target.files[0];
    if (selectedFile) {
      processFile();
    }
  }

  // Validate chunk size when error correction level changes
  $effect(() => {
    validateChunkSize();
  });

  // Initialize canvas context when canvas is mounted
  $effect(() => {
    if (canvas) {
      canvasContext = canvas.getContext("2d");
    }
  });
</script>

<main>
  <h1>📤 QR Code Sender</h1>

  <div class="card">
    <p class="field">
      <label for="fileInput">Select a file</label>
      <input
        id="fileInput"
        type="file"
        onchange={handleFileSelect}
        accept="*/*"
      />
    </p>
    {#if selectedFile}
      <div class="file-info">
        <p>
          ✓ File: <strong>{selectedFile.name}</strong> ({Math.round(
            selectedFile.size / 1000
          )} kB → {totalChunks} chunks)
        </p>
        <p>Hash: <code>sha256:{fileHash}</code></p>
      </div>
    {/if}
    <details>
      <summary>Transmission Parameters (advanced options)</summary>
      <div class="settings">
        <p class="field">
          <label for="transmissionSpeed">Transmission speed (ms):</label>
          <input
            id="transmissionSpeed"
            type="number"
            bind:value={transmissionSpeed}
            min="100"
            max="5000"
            step="50"
          />
        </p>
        <p class="field">
          <label for="errorCorrectionLevel">Error correction level:</label>
          <select id="errorCorrectionLevel" bind:value={errorCorrectionLevel}>
            <option value="L"
              >L (7% - Max {QR_CAPACITY["L"] - 250} bytes)</option
            >
            <option value="M"
              >M (15% - Max {QR_CAPACITY["M"] - 250} bytes)</option
            >
            <option value="Q"
              >Q (25% - Max {QR_CAPACITY["Q"] - 250} bytes)</option
            >
            <option value="H"
              >H (30% - Max {QR_CAPACITY["H"] - 250} bytes)</option
            >
          </select>
        </p>
        <p class="field">
          <label for="chunkSize">Chunk size (bytes):</label>
          <input
            id="chunkSize"
            type="number"
            bind:value={chunkSize}
            min="500"
            max={getMaxChunkSize()}
            step="100"
            onblur={validateChunkSize}
          />
          <span class="tips">
            Max: {getMaxChunkSize()} bytes for {errorCorrectionLevel} level
          </span>
        </p>
      </div>
    </details>
    {#if infoQRCode && !isTransmitting}
      <div class="qr-display info-qr">
        <img src={infoQRCode} alt="QR Code d'information" />
        <p class="qr-caption">
          📱 QR code d'information - Scannez-le d'abord pour préparer la
          réception
        </p>
      </div>
    {/if}

    <div class="controls">
      {#if !isTransmitting}
        <button
          class="primary"
          onclick={startTransmission}
          disabled={!selectedFile}
        >
          ▶ Start Transmission
        </button>
      {:else}
        <button class="danger" onclick={stopTransmission}> ⏹ Stop </button>
      {/if}
      <button class="secondary" onclick={reset}> 🔄 Reset </button>
    </div>

    {#if isTransmitting}
      <p class="status">
        Transmission in progress... Chunk {(currentChunkIndex %
          (transmissionMode === "recovery"
            ? missingChunks.length
            : totalChunks)) +
          1}
        /
        {transmissionMode === "recovery" ? missingChunks.length : totalChunks}
        {#if transmissionMode === "recovery"}
          <span class="recovery-mode">(Recovery mode)</span>
        {/if}
      </p>
      {#if qrCodeUrl}
        <div class="qr-display">
          <img src={qrCodeUrl} alt="QR Code" />
        </div>
      {/if}
    {/if}
  </div>

  <div class="card">
    <h2>Missing chunks recovery</h2>
    <p>Scan the recovery QR code displayed by the receiver</p>
    {#if !scannerActive}
      <button onclick={startRecoveryScanner} disabled={!selectedFile}>
        📷 Scan Recovery QR
      </button>
    {:else}
      <button onclick={stopRecoveryScanner} class="danger">
        ⏹ Stop le scan
      </button>
    {/if}

    {#if scannerActive}
      <div class="scanner-view">
        <video
          bind:this={videoElement}
          width="400"
          height="300"
          style="display:block;"
        ></video>
        <canvas
          bind:this={canvas}
          width="400"
          height="300"
          style="display:none;"
        ></canvas>
      </div>
    {/if}

    {#if missingChunks.length > 0}
      <p class="info">
        ⚠ {missingChunks.length} chunks to retransmit
      </p>
    {/if}
  </div>
</main>

<style lang="scss">
  main {
    margin: 0 auto;
    padding: 2rem;
    font-family:
      system-ui,
      -apple-system,
      sans-serif;
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
    margin: 1rem;
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
    background-color: #4caf50;
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
    background-color: #2196f3;
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

  .qr-display.info-qr {
    background: #e3f2fd;
    flex-direction: column;
    align-items: center;
  }

  .qr-display.info-qr img {
    border: 2px solid #2196f3;
  }

  .qr-display img {
    max-width: 100%;
    width: 100%;
    height: auto;
    max-height: 80vh;
    object-fit: contain;
  }

  .qr-caption {
    margin-top: 0.5rem;
    font-size: 0.9rem;
    color: #666;
    font-weight: 500;
  }

  .status {
    font-weight: bold;
    color: #2196f3;
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
    border: 2px solid #2196f3;
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

  .field {
    display: flex;
    flex-wrap: wrap;
    align-items: anchor-center;

    label {
      flex: 1;
      text-align: right;
      padding: 0 0.5em 0 0;
    }

    input,
    select {
      flex: 2;
    }

    .tips {
      color: #666;
      width: 100%;
      display: block;
      text-align: right;
      flex: 1 0 100%;
    }
  }
</style>
