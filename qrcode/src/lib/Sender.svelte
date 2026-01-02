<script lang="ts">
  import { tick } from "svelte";
  import type {
    FileChunk,
    ErrorCorrectionLevel,
    TransmissionMode,
    RecoveryQRData,
    ScannedSymbol,
  } from "./types";
  import {
    QR_CAPACITY,
    splitFileIntoChunks,
    generateFileInfoQRCode,
    generateMultipleQRCodes,
    validateChunkSize as validateChunkSizeService,
    getChunksToTransmit,
  } from "./senderService";
  import {
    startCameraStream,
    stopCameraStream,
    scanVideoFrame,
    initializeCanvas,
  } from "./scannerService";
  import { bytesToHex } from "./commons";

  let selectedFile = $state<File | null>(null);
  let fileChunks = $state<FileChunk[]>([]);
  let fileHash = $state<Uint8Array | null>(null);
  let isTransmitting = $state<boolean>(false);
  let currentChunkIndex = $state<number>(0);
  let qrCodeUrl = $state<string>("");
  let qrCodeUrls = $state<string[]>([]);
  let canvas: HTMLCanvasElement | undefined = undefined;
  let videoElement: HTMLVideoElement | undefined = undefined;
  let canvasContext: CanvasRenderingContext2D | undefined = undefined;
  let scannerActive = $state<boolean>(false);
  let missingChunks = $state<number[]>([]);
  let transmissionMode = $state<TransmissionMode>("all");

  // Configurable parameters
  let chunkSize = $state<number>(1400);
  let transmissionSpeed = $state<number>(100);
  let errorCorrectionLevel = $state<ErrorCorrectionLevel>("M");
  let numberOfQRCodes = $state<number>(1);
  let totalChunks = $state<number>(0);
  let transmittedChunks = $state<Set<number>>(new Set());
  let infoQRCode = $state<string>("");
  let startTransmissionButton: HTMLButtonElement | undefined = undefined;
  let stopTransmissionButton: HTMLButtonElement | undefined = undefined;

  // Get maximum chunk size based on error correction level
  function getMaxChunkSize(): number {
    const binaryHeader = 23;
    return QR_CAPACITY[errorCorrectionLevel] - binaryHeader;
  }

  // Validate and adjust chunk size
  function validateChunkSize(): void {
    const result = validateChunkSizeService(chunkSize, errorCorrectionLevel);
    if (result.wasAdjusted) {
      chunkSize = result.adjustedSize;
      alert(
        `Chunk size adjusted to ${result.adjustedSize} bytes to fit in QR code with ${errorCorrectionLevel} error correction.`
      );
    }
  }

  // Fonction pour découper le fichier en chunks
  async function processFile(): Promise<void> {
    if (!selectedFile) return;

    const result = await splitFileIntoChunks(selectedFile, chunkSize);
    fileHash = result.fileHash;
    fileChunks = result.chunks;
    totalChunks = result.chunks.length;

    // Générer le QR code d'information initial
    await generateInfoQRCode();
  }

  // Fonction pour générer le QR code d'information initial
  async function generateInfoQRCode(): Promise<void> {
    if (!selectedFile || !fileHash) return;

    try {
      infoQRCode = await generateFileInfoQRCode(
        selectedFile,
        fileHash,
        totalChunks,
        chunkSize
      );
    } catch (error) {
      console.error("Erreur lors de la génération du QR d'info:", error);
    }
  }

  // Function to start transmission
  async function startTransmission(): Promise<void> {
    console.log("Starting transmission...");
    validateChunkSize();

    if (fileChunks.length === 0) {
      await processFile();
    }

    isTransmitting = true;
    currentChunkIndex = 0;
    transmittedChunks.clear();
    transmitNextChunk();

    await tick();
    stopTransmissionButton?.focus();
  }

  // Function to transmit the next chunk
  async function transmitNextChunk(): Promise<void> {
    if (!isTransmitting) return;

    const chunksToTransmit = getChunksToTransmit(
      fileChunks,
      missingChunks,
      transmissionMode
    );

    if (chunksToTransmit.length === 0) {
      isTransmitting = false;
      return;
    }

    // Check if we've transmitted all chunks
    if (currentChunkIndex >= chunksToTransmit.length) {
      isTransmitting = false;
      startRecoveryScanner();
      return;
    }

    // Préparer les chunks à encoder
    const chunksToEncode: FileChunk[] = [];
    for (
      let i = 0;
      i < numberOfQRCodes && currentChunkIndex + i < chunksToTransmit.length;
      i++
    ) {
      const chunk = chunksToTransmit[currentChunkIndex + i];
      chunksToEncode.push(chunk);
      transmittedChunks.add(chunk.chunkIndex);
    }

    try {
      qrCodeUrls = await generateMultipleQRCodes(
        chunksToEncode,
        errorCorrectionLevel
      );
      currentChunkIndex += numberOfQRCodes;

      setTimeout(transmitNextChunk, transmissionSpeed);
    } catch (error) {
      console.error("Error generating QR codes:", error);
      const err = error as Error;
      alert(
        `Error generating QR codes: ${err.message}\n\nTry reducing the chunk size or changing the error correction level.`
      );
      isTransmitting = false;
    }
  }

  // Fonction pour arrêter la transmission
  function stopTransmission(): void {
    console.log("Stopping transmission...");
    isTransmitting = false;
  }

  // Fonction pour scanner le QR code de récupération
  async function startRecoveryScanner(): Promise<void> {
    scannerActive = true;

    await tick();
    await tick();
    await new Promise((resolve) => setTimeout(resolve, 50));

    if (!videoElement) {
      alert("Video element not ready. Please try again.");
      scannerActive = false;
      return;
    }

    if (canvas && !canvasContext) {
      canvas.width = 400;
      canvas.height = 300;
      canvasContext = initializeCanvas(canvas);
    }

    try {
      await startCameraStream(videoElement, { facingMode: "environment" });
      requestAnimationFrame(scanRecoveryQR);
    } catch (error) {
      console.error("Erreur d'accès à la caméra:", error);
      alert("Impossible d'accéder à la caméra");
      scannerActive = false;
    }
  }

  // Fonction pour scanner le QR de récupération
  async function scanRecoveryQR(): Promise<void> {
    if (!scannerActive || !videoElement || !canvas || !canvasContext) return;

    const symbols = await scanVideoFrame(videoElement, canvas, canvasContext);

    if (symbols.length > 0) {
      for (const symbol of symbols) {
        const data = symbol.decode();
        if (data) {
          try {
            const recoveryData: RecoveryQRData = JSON.parse(data);
            if (
              recoveryData.type === "recovery" &&
              fileHash &&
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

    requestAnimationFrame(scanRecoveryQR);
  }

  // Fonction pour arrêter le scanner
  function stopRecoveryScanner(): void {
    scannerActive = false;
    if (videoElement) {
      stopCameraStream(videoElement);
    }
  }

  // Fonction pour réinitialiser
  function reset(): void {
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
  async function handleFileSelect(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    selectedFile = target.files?.[0] || null;
    if (selectedFile) {
      await processFile();
      await tick();
      startTransmissionButton?.focus();
    }
  }

  // Validate chunk size when error correction level changes
  $effect(() => {
    validateChunkSize();
  });

  // Reprocess file when chunk size or error correction level changes
  $effect(() => {
    chunkSize;
    errorCorrectionLevel;

    if (selectedFile) {
      processFile();
    }
  });

  // Initialize canvas context when canvas is mounted
  $effect(() => {
    if (canvas) {
      canvasContext = initializeCanvas(canvas);
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
          <label for="transmissionSpeed"
            >Transmission speed ({transmissionSpeed} ms):</label
          >
          <input
            id="transmissionSpeed"
            type="range"
            bind:value={transmissionSpeed}
            min="50"
            max="1500"
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
