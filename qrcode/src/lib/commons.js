// Fonction pour déterminer le nombre d'octets utilisés pour l'index
export function getIndexBytes(totalChunks) {
  for (let i = 1; i <= 512; i++) {
    if (totalChunks <= 2 ** (i * 8)) {
      return i;
    }
  }
  throw new Error("Total chunks exceed maximum supported value");
}

// Fonction utilitaire pour convertir un hash binaire en hex (pour comparaison)
export function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
