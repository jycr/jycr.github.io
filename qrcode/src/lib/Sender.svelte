<script>
  import { tick } from "svelte";
  import QRCode from "qrcode";
  import { scanImageData } from "@undecaf/zbar-wasm";

  // QR Code capacity limits (in bytes) for binary data based on error correction level
  // These are approximate values for QR code version 40 (largest)
  // Format binaire pur (pas de base64) : SHA1(20) + chunkIndex(1-3 octets) = 21-23 octets de header
  // Le totalChunks est dans le QR d'info initial (pas dans chaque chunk)
  const QR_CAPACITY = {
    L: 2953, // Low (7% error correction)
    M: 2331, // Medium (15% error correction)
    Q: 1663, // Quartile (25% error correction)
    H: 1273, // High (30% error correction)
  };

  let selectedFile = $state(null);
  let fileChunks = $state([]);
  let fileHash = $state(null); // Stocke maintenant un Uint8Array de 20 octets
  let isTransmitting = $state(false);
  let currentChunkIndex = $state(0);
  let qrCodeUrl = $state("");
  let qrCodeUrls = $state([]); // Tableau pour plusieurs QR codes
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
  let numberOfQRCodes = $state(1); // Nombre de QR codes à afficher simultanément
  let totalChunks = $state(0);
  let transmittedChunks = $state(new Set());
  let infoQRCode = $state(""); // QR code initial avec les métadonnées
  let startTransmissionButton;
  let stopTransmissionButton;

  // Get maximum chunk size based on error correction level
  function getMaxChunkSize() {
    // Format binaire optimisé: SHA1(20) + chunkIndex(1-3 octets selon totalChunks)
    // On utilise le pire cas (3 octets) pour le calcul
    // Transport direct en binaire (plus de base64 !)
    const binaryHeader = 23; // SHA1(20) + index(3 max)
    return QR_CAPACITY[errorCorrectionLevel] - binaryHeader;
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

  // Fonction pour calculer le hash SHA-1 d'un fichier (20 octets au lieu de 32 pour SHA-256)
  async function calculateSHA1(file) {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-1", arrayBuffer);
    return new Uint8Array(hashBuffer); // Retourne directement les bytes
  }

  // Fonction utilitaire pour convertir un hash binaire en hex (pour affichage)
  function bytesToHex(bytes) {
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  // Fonction pour découper le fichier en chunks
  async function processFile() {
    if (!selectedFile) return;

    // Calculer le hash du fichier (SHA1 = 20 octets)
    fileHash = await calculateSHA1(selectedFile);

    // Lire le fichier
    const arrayBuffer = await selectedFile.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Découper en chunks avec format binaire optimisé
    fileChunks = [];
    totalChunks = Math.ceil(uint8Array.length / chunkSize);

    // Déterminer le nombre d'octets nécessaires pour l'index
    let indexBytes = 1; // Par défaut 1 octet (max 255)
    if (totalChunks > 255) indexBytes = 2; // 2 octets (max 65535)
    if (totalChunks > 65535) indexBytes = 3; // 3 octets (max 16777215)

    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, uint8Array.length);
      const chunkData = uint8Array.slice(start, end);

      // Format binaire optimisé: [SHA1(20)][chunkIndex(1-3 octets)][data]
      const binaryChunk = new Uint8Array(20 + indexBytes + chunkData.length);
      binaryChunk.set(fileHash, 0); // SHA1: 20 octets

      // Encoder l'index sur indexBytes octets (big endian)
      for (let j = 0; j < indexBytes; j++) {
        binaryChunk[20 + j] = (i >> (8 * (indexBytes - 1 - j))) & 0xff;
      }

      binaryChunk.set(chunkData, 20 + indexBytes); // Les données du chunk

      // Pas d'encodage base64 ! On garde le binaire brut
      fileChunks.push({
        binaryData: binaryChunk, // Format binaire pur (Uint8Array)
        chunkIndex: i, // Gardé pour l'affichage/debug
        fileName: selectedFile.name, // Gardé pour l'info QR
      });
    }

    // Générer le QR code d'information initial
    await generateInfoQRCode();
  }

  // Fonction pour générer le QR code d'information initial
  async function generateInfoQRCode() {
    const infoData = {
      type: "fileInfo",
      fileHash: bytesToHex(fileHash), // SHA1 en hex pour le JSON
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
    console.log("Starting transmission...");
    // Validate chunk size before starting
    validateChunkSize();

    if (fileChunks.length === 0) {
      await processFile();
    }

    isTransmitting = true;
    currentChunkIndex = 0;
    transmittedChunks.clear();
    transmitNextChunk();

    // Mettre le focus sur le bouton Stop
    await tick();
    stopTransmissionButton?.focus();
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

    // Générer plusieurs QR codes simultanément
    qrCodeUrls = [];
    const qrPromises = [];

    for (
      let i = 0;
      i < numberOfQRCodes && currentChunkIndex + i < chunksToTransmit.length;
      i++
    ) {
      const chunk = chunksToTransmit[currentChunkIndex + i];

      try {
        // Generate QR code avec données binaires pures (Uint8Array)
        // La librairie qrcode nécessite un format de segment pour le mode byte
        const segments = [
          {
            data: chunk.binaryData,
            mode: "byte",
          },
        ];

        const qrPromise = QRCode.toDataURL(segments, {
          errorCorrectionLevel: errorCorrectionLevel,
          margin: 1,
          width: 1000,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        });

        qrPromises.push(qrPromise);
        transmittedChunks.add(chunk.chunkIndex);
      } catch (error) {
        console.error("Error generating QR code:", error);
      }
    }

    try {
      qrCodeUrls = await Promise.all(qrPromises);
      currentChunkIndex += numberOfQRCodes;

      // Schedule next batch of chunks
      setTimeout(transmitNextChunk, transmissionSpeed);
    } catch (error) {
      console.error("Error generating QR codes:", error);
      alert(
        `Error generating QR codes: ${error.message}\n\nTry reducing the chunk size or changing the error correction level.`
      );
      isTransmitting = false;
    }
  }

  // Fonction pour arrêter la transmission
  function stopTransmission() {
    console.log("Stopping transmission...");
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
  async function scanRecoveryQR() {
    if (!scannerActive) return;

    if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
      canvasContext.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      const imageData = canvasContext.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
      );

      try {
        const symbols = await scanImageData(imageData);

        if (symbols && symbols.length > 0) {
          for (const symbol of symbols) {
            const data = symbol.decode();
            if (data) {
              try {
                const recoveryData = JSON.parse(data);
                if (
                  recoveryData.type === "recovery" &&
                  recoveryData.fileHash === bytesToHex(fileHash)
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
        }
      } catch (error) {
        console.error("Erreur de scan zbar:", error);
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
    fileHash = null;
    currentChunkIndex = 0;
    qrCodeUrl = "";
    qrCodeUrls = [];
    infoQRCode = "";
    missingChunks = [];
    transmissionMode = "all";
    transmittedChunks.clear();
  }

  // Gestionnaire de sélection de fichier
  async function handleFileSelect(event) {
    selectedFile = event.target.files[0];
    if (selectedFile) {
      await processFile();
      // Mettre le focus sur le bouton Start après un court délai
      await tick();
      startTransmissionButton?.focus();
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
  <header class="card">
    <h1>📤 QR Code Sender</h1>
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
        <p>Hash: <code>sha1:{fileHash ? bytesToHex(fileHash) : ""}</code></p>
      </div>
    {/if}
    <details>
      <summary>Transmission Parameters (advanced options)</summary>
      <div class="settings">
        <p class="field">
          <label for="numberOfQRCodes">Nombre de QR codes simultanés:</label>
          <input
            id="numberOfQRCodes"
            type="number"
            bind:value={numberOfQRCodes}
            min="1"
            max="9"
            step="1"
          />
          <span class="tips">
            Afficher plusieurs QR codes à la fois pour accélérer le transfert
          </span>
        </p>
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
  </header>

  <section class="main-content">
    {#if !isTransmitting && infoQRCode}
      <button
        type="button"
        class="qr-display"
        bind:this={startTransmissionButton}
        onclick={startTransmission}
      >
        {#each Array(numberOfQRCodes) as _, index}
          <img src={infoQRCode} alt="QR Code d'information {index + 1}" />
        {/each}
      </button>
    {:else if isTransmitting && qrCodeUrls.length > 0}
      <button
        type="button"
        class="qr-display"
        bind:this={stopTransmissionButton}
        onclick={stopTransmission}
      >
        {#each qrCodeUrls as qrUrl, index}
          <img src={qrUrl} alt="QR Code {index + 1}" />
        {/each}
      </button>
    {/if}

    <div class="controls">
      <p class="status">
        {#if isTransmitting}
          Transmission in progress... Chunks {currentChunkIndex -
            numberOfQRCodes +
            1} - {Math.min(
            currentChunkIndex,
            transmissionMode === "recovery" ? missingChunks.length : totalChunks
          )}
          /
          {transmissionMode === "recovery" ? missingChunks.length : totalChunks}
          {#if transmissionMode === "recovery"}
            <span class="recovery-mode">(Recovery mode)</span>
          {/if}
        {:else if infoQRCode}
          📱 QR code d'information - Scannez-le d'abord pour préparer la
          réception
        {/if}
      </p>
      {#if isTransmitting}
        <button class="danger" onclick={stopTransmission}> ⏹ Stop </button>
      {:else}
        <button
          type="button"
          class="primary"
          onclick={startTransmission}
          disabled={!selectedFile}
        >
          ▶ Start Transmission
        </button>
      {/if}
      <button type="button" class="secondary" onclick={reset}>
        🔄 Reset
      </button>
    </div>
  </section>

  <footer class="card">
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
      display: flex;
      box-sizing: border-box;
      flex-direction: column;
      align-items: center;
    }
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

  .tips {
    font-size: 0.875rem;
    color: #666;
    font-style: italic;
  }

  .controls {
    display: flex;
    flex-direction: column;
    gap: 1rem;
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
    align-items: center;
    padding: 0;
    border-radius: 0;

    img {
      border: 1px solid #000;
      width: auto;
      height: auto;
      object-fit: contain;
    }
  }

  .qr-display {
    aspect-ratio: 1;

    img {
      width: 100%;
      height: 100%;
      max-width: 100%;
      max-height: 100%;
    }
  }

  /* Mode portrait : largeur à 100vw */
  @media (orientation: portrait) {
    .qr-display {
      width: 100vw;

      img {
        width: 100vw;
        max-width: 100vw;
        height: auto;
        max-height: none;
      }
    }
  }

  /* Mode paysage : hauteur à 100vh */
  @media (orientation: landscape) {
    .qr-display {
      height: 100vh;

      img {
        height: 100vh;
        max-height: 100vh;
        width: auto;
        max-width: none;
      }
    }
  }

  .status {
    font-weight: bold;
    color: #2196f3;
    text-align: center;
    margin: 0;
  }

  .recovery-mode {
    color: #ff9800;
    font-style: italic;
  }

  .scanner-view {
    margin: 1rem;
    text-align: center;

    video {
      max-width: 100%;
    }
  }

  .info {
    padding: 0.75rem;
    background: #fff3cd;
    border: 1px solid #ffc107;
    border-radius: 4px;
    color: #856404;
    margin-top: 1rem;
  }
</style>
