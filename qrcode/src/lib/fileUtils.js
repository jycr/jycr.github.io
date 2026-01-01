/**
 * Calcule le hash SHA-256 d'un fichier
 * @param {File} file - Le fichier à hasher
 * @returns {Promise<string>} - Le hash en hexadécimal
 */
export async function calculateSHA256(file) {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Découpe un fichier en chunks
 * @param {File} file - Le fichier à découper
 * @param {number} chunkSize - Taille de chaque chunk en octets
 * @param {string} fileHash - Hash SHA-256 du fichier
 * @returns {Promise<Array>} - Tableau de chunks
 */
export async function splitFileIntoChunks(file, chunkSize, fileHash) {
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  const chunks = [];
  const totalChunks = Math.ceil(uint8Array.length / chunkSize);

  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, uint8Array.length);
    const chunkData = uint8Array.slice(start, end);
    const base64Chunk = btoa(String.fromCharCode(...chunkData));

    chunks.push({
      fileHash,
      fileName: file.name,
      chunkIndex: i,
      totalChunks,
      data: base64Chunk
    });
  }

  return chunks;
}

/**
 * Assemble les chunks pour recréer le fichier
 * @param {Map} chunksMap - Map des chunks reçus
 * @param {number} totalChunks - Nombre total de chunks attendus
 * @returns {Uint8Array} - Données du fichier reconstitué
 */
export function assembleChunks(chunksMap, totalChunks) {
  const sortedChunks = [];

  for (let i = 0; i < totalChunks; i++) {
    if (!chunksMap.has(i)) {
      throw new Error(`Chunk ${i} manquant`);
    }
    sortedChunks.push(chunksMap.get(i));
  }

  // Décoder les chunks base64
  const decodedChunks = sortedChunks.map(base64 => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  });

  // Calculer la taille totale et assembler
  const totalSize = decodedChunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const fileData = new Uint8Array(totalSize);

  let offset = 0;
  for (const chunk of decodedChunks) {
    fileData.set(chunk, offset);
    offset += chunk.length;
  }

  return fileData;
}

/**
 * Trouve les chunks manquants
 * @param {Map} receivedChunks - Map des chunks reçus
 * @param {number} totalChunks - Nombre total de chunks
 * @returns {Array<number>} - Indices des chunks manquants
 */
export function findMissingChunks(receivedChunks, totalChunks) {
  const missing = [];
  for (let i = 0; i < totalChunks; i++) {
    if (!receivedChunks.has(i)) {
      missing.push(i);
    }
  }
  return missing;
}

/**
 * Valide un chunk reçu
 * @param {Object} chunk - Le chunk à valider
 * @returns {boolean} - true si le chunk est valide
 */
export function validateChunk(chunk) {
  if (!chunk) return false;

  return (
    typeof chunk.fileHash === 'string' &&
    typeof chunk.chunkIndex === 'number' &&
    typeof chunk.totalChunks === 'number' &&
    typeof chunk.data === 'string' &&
    chunk.chunkIndex >= 0 &&
    chunk.chunkIndex < chunk.totalChunks
  );
}

/**
 * Crée un objet de QR de récupération
 * @param {string} fileHash - Hash du fichier
 * @param {Array<number>} missingChunks - Liste des chunks manquants
 * @returns {Object} - Objet de récupération
 */
export function createRecoveryData(fileHash, missingChunks) {
  return {
    type: 'recovery',
    fileHash,
    missingChunks
  };
}

/**
 * Valide un QR de récupération
 * @param {Object} recoveryData - Données du QR de récupération
 * @returns {boolean} - true si valide
 */
export function validateRecoveryData(recoveryData) {
  if (!recoveryData) return false;

  return (
    recoveryData.type === 'recovery' &&
    typeof recoveryData.fileHash === 'string' &&
    Array.isArray(recoveryData.missingChunks)
  );
}

