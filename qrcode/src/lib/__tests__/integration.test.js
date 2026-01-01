import { describe, it, expect } from 'vitest';
import {
  splitFileIntoChunks,
  assembleChunks,
  findMissingChunks,
  createRecoveryData,
  validateRecoveryData,
  calculateSHA256
} from '../fileUtils';

describe('Scénario de transfert de fichier', () => {
  it('devrait simuler un transfert complet avec succès', async () => {
    // 1. Émetteur : Préparer le fichier
    const originalContent = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';
    const file = new File([originalContent], 'test.txt', { type: 'text/plain' });
    const fileHash = await calculateSHA256(file);

    // 2. Émetteur : Découper en chunks
    const chunkSize = 20;
    const chunks = await splitFileIntoChunks(file, chunkSize, fileHash);

    expect(chunks.length).toBeGreaterThan(1);

    // 3. Récepteur : Recevoir tous les chunks
    const receivedChunks = new Map();
    chunks.forEach(chunk => {
      receivedChunks.set(chunk.chunkIndex, chunk.data);
    });

    // 4. Récepteur : Vérifier qu'il n'y a pas de chunks manquants
    const missing = findMissingChunks(receivedChunks, chunks.length);
    expect(missing).toHaveLength(0);

    // 5. Récepteur : Assembler le fichier
    const assembled = assembleChunks(receivedChunks, chunks.length);

    // 6. Vérifier que le contenu est identique
    const assembledContent = new TextDecoder().decode(assembled);
    expect(assembledContent).toBe(originalContent);
  });

  it('devrait gérer un transfert avec chunks manquants et récupération', async () => {
    // 1. Émetteur : Préparer le fichier
    const originalContent = 'Test de récupération avec chunks manquants';
    const file = new File([originalContent], 'test.txt', { type: 'text/plain' });
    const fileHash = await calculateSHA256(file);

    // 2. Émetteur : Découper en chunks
    const chunks = await splitFileIntoChunks(file, 10, fileHash);

    // 3. Récepteur : Recevoir seulement certains chunks (simuler pertes)
    const receivedChunks = new Map();
    chunks.forEach((chunk, index) => {
      // Ne pas recevoir les chunks 1 et 3 (perte)
      if (index !== 1 && index !== 3) {
        receivedChunks.set(chunk.chunkIndex, chunk.data);
      }
    });

    // 4. Récepteur : Identifier les chunks manquants
    const missing = findMissingChunks(receivedChunks, chunks.length);
    expect(missing).toEqual([1, 3]);

    // 5. Récepteur : Générer QR de récupération
    const recoveryData = createRecoveryData(fileHash, missing);
    expect(validateRecoveryData(recoveryData)).toBe(true);

    // 6. Émetteur : Scanner le QR de récupération et retransmettre
    const recoveryQR = JSON.parse(JSON.stringify(recoveryData)); // Simuler scan
    expect(recoveryQR.fileHash).toBe(fileHash);

    // 7. Émetteur : Retransmettre uniquement les chunks manquants
    const missingChunksToSend = recoveryQR.missingChunks.map(idx => chunks[idx]);
    expect(missingChunksToSend).toHaveLength(2);

    // 8. Récepteur : Recevoir les chunks manquants
    missingChunksToSend.forEach(chunk => {
      receivedChunks.set(chunk.chunkIndex, chunk.data);
    });

    // 9. Récepteur : Vérifier que tous les chunks sont maintenant reçus
    const stillMissing = findMissingChunks(receivedChunks, chunks.length);
    expect(stillMissing).toHaveLength(0);

    // 10. Récepteur : Assembler le fichier
    const assembled = assembleChunks(receivedChunks, chunks.length);
    const assembledContent = new TextDecoder().decode(assembled);

    // 11. Vérifier l'intégrité
    expect(assembledContent).toBe(originalContent);
  });

  it('devrait gérer un fichier binaire', async () => {
    // Créer un fichier binaire simple
    const binaryData = new Uint8Array([0, 1, 2, 255, 254, 253, 128, 127]);
    const file = new File([binaryData], 'binary.dat', { type: 'application/octet-stream' });
    const fileHash = await calculateSHA256(file);

    // Découper
    const chunks = await splitFileIntoChunks(file, 3, fileHash);

    // Recevoir tous les chunks
    const receivedChunks = new Map();
    chunks.forEach(chunk => {
      receivedChunks.set(chunk.chunkIndex, chunk.data);
    });

    // Assembler
    const assembled = assembleChunks(receivedChunks, chunks.length);

    // Vérifier
    expect(assembled).toEqual(binaryData);
  });

  it('devrait gérer plusieurs cycles de récupération', async () => {
    const originalContent = 'Test avec plusieurs cycles de récupération';
    const file = new File([originalContent], 'test.txt', { type: 'text/plain' });
    const fileHash = await calculateSHA256(file);
    const chunks = await splitFileIntoChunks(file, 8, fileHash);

    // Premier cycle : Recevoir partiellement
    const receivedChunks = new Map();
    [0, 2, 4].forEach(idx => {
      receivedChunks.set(chunks[idx].chunkIndex, chunks[idx].data);
    });

    // Récupération 1
    let missing = findMissingChunks(receivedChunks, chunks.length);
    expect(missing.length).toBeGreaterThan(0);

    // Retransmettre partiellement (simuler encore des pertes)
    missing.slice(0, 2).forEach(idx => {
      receivedChunks.set(chunks[idx].chunkIndex, chunks[idx].data);
    });

    // Récupération 2
    missing = findMissingChunks(receivedChunks, chunks.length);

    // Retransmettre le reste
    missing.forEach(idx => {
      receivedChunks.set(chunks[idx].chunkIndex, chunks[idx].data);
    });

    // Vérifier que tout est reçu
    missing = findMissingChunks(receivedChunks, chunks.length);
    expect(missing).toHaveLength(0);

    // Assembler et vérifier
    const assembled = assembleChunks(receivedChunks, chunks.length);
    const assembledContent = new TextDecoder().decode(assembled);
    expect(assembledContent).toBe(originalContent);
  });
});

