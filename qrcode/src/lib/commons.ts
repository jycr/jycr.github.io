/**
 * Utilitaires communs pour la manipulation de données binaires et d'index
 */

/**
 * Détermine le nombre d'octets nécessaires pour encoder l'index des chunks
 * @param totalChunks - Nombre total de chunks
 * @returns Nombre d'octets nécessaires (1, 2, 3, etc.)
 */
export function getIndexBytes(totalChunks: number): number {
  for (let i = 1; i <= 512; i++) {
    if (totalChunks <= 2 ** (i * 8)) {
      return i;
    }
  }
  throw new Error('Total chunks exceed maximum supported value');
}

/**
 * Convertit un tableau d'octets en chaîne hexadécimale
 * @param bytes - Tableau d'octets
 * @returns Chaîne hexadécimale
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convertit une chaîne hexadécimale en tableau d'octets
 * @param hex - Chaîne hexadécimale
 * @returns Tableau d'octets
 */
export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Encode un index de chunk en big endian sur un nombre d'octets donné
 * @param index - Index du chunk
 * @param indexBytes - Nombre d'octets à utiliser
 * @returns Tableau d'octets contenant l'index encodé
 */
export function encodeChunkIndex(index: number, indexBytes: number): Uint8Array {
  const encoded = new Uint8Array(indexBytes);
  for (let j = 0; j < indexBytes; j++) {
    encoded[j] = (index >> (8 * (indexBytes - 1 - j))) & 0xff;
  }
  return encoded;
}

/**
 * Décode un index de chunk depuis un format big endian
 * @param bytes - Octets contenant l'index
 * @param offset - Position de départ dans le tableau
 * @param indexBytes - Nombre d'octets utilisés pour l'index
 * @returns Index décodé
 */
export function decodeChunkIndex(
  bytes: Uint8Array,
  offset: number,
  indexBytes: number
): number {
  let index = 0;
  for (let i = 0; i < indexBytes; i++) {
    index = (index << 8) | (bytes[offset + i] ?? 0);
  }
  return index;
}

/**
 * Calcule le hash SHA-1 d'un fichier
 * @param file - Fichier à hasher
 * @returns Promise contenant les octets du hash
 */
export async function calculateSHA1(file: File): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-1', arrayBuffer);
  return new Uint8Array(hashBuffer);
}

/**
 * Calcule le hash SHA-1 d'un tableau d'octets
 * @param data - Données à hasher
 * @returns Promise contenant les octets du hash
 */
export async function calculateSHA1FromBytes(data: Uint8Array): Promise<Uint8Array> {
  const hashBuffer = await crypto.subtle.digest('SHA-1', data.buffer);
  return new Uint8Array(hashBuffer);
}

/**
 * Convertit un Int8Array en Uint8Array (pour compatibilité avec zbar-wasm)
 * @param int8Array - Tableau d'octets signés
 * @returns Tableau d'octets non signés
 */
export function int8ArrayToUint8Array(int8Array: Int8Array): Uint8Array {
  const uint8Array = new Uint8Array(int8Array.length);
  for (let i = 0; i < int8Array.length; i++) {
    // Convertir valeur signée (-128 à 127) en non-signée (0 à 255)
    uint8Array[i] = (int8Array[i] ?? 0) & 0xff;
  }
  return uint8Array;
}
