import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import Sender from '../Sender.svelte';
import Receiver from '../Receiver.svelte';
import {
  splitFileIntoChunks,
  assembleChunks,
  findMissingChunks,
  createRecoveryData,
  calculateSHA256
} from '../fileUtils';

/**
 * Tests d'intégration complets pour la transmission et la récupération de fichiers
 * Ces tests simulent des scénarios réels de transfert entre un émetteur et un récepteur
 */

describe('Tests d\'intégration - Transmission complète', () => {
  let consoleErrors = [];
  let consoleWarnings = [];
  let originalConsoleError;
  let originalConsoleWarn;

  // Capturer les erreurs et avertissements de console avant chaque test
  beforeEach(() => {
    consoleErrors = [];
    consoleWarnings = [];

    originalConsoleError = console.error;
    originalConsoleWarn = console.warn;

    console.error = (...args) => {
      consoleErrors.push(args.join(' '));
      originalConsoleError(...args);
    };

    console.warn = (...args) => {
      consoleWarnings.push(args.join(' '));
      originalConsoleWarn(...args);
    };
  });

  // Restaurer console et vérifier l'absence d'erreurs après chaque test
  afterEach(() => {
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;

    // Filtrer les avertissements attendus (ex: avertissements de dépendances)
    const criticalErrors = consoleErrors.filter(err =>
      !err.includes('Warning:') &&
      !err.includes('npm warn')
    );

    expect(criticalErrors, 'Aucune erreur critique ne devrait être présente dans la console').toHaveLength(0);
  });

  it('devrait effectuer une transmission complète sans erreur', async () => {
    // Créer un fichier de test
    const testContent = 'Contenu du fichier de test pour transmission complète';
    const testFile = new File([testContent], 'test.txt', { type: 'text/plain' });
    const fileHash = await calculateSHA256(testFile);

    // Découper le fichier en chunks (émetteur)
    const chunkSize = 50;
    const chunks = await splitFileIntoChunks(testFile, chunkSize, fileHash);

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].fileHash).toBe(fileHash);
    expect(chunks[0].fileName).toBe('test.txt');

    // Simuler la réception de tous les chunks (récepteur)
    const receivedChunks = new Map();
    chunks.forEach(chunk => {
      receivedChunks.set(chunk.chunkIndex, chunk.data);
    });

    // Vérifier qu'il n'y a pas de chunks manquants
    const missing = findMissingChunks(receivedChunks, chunks.length);
    expect(missing).toHaveLength(0);

    // Assembler le fichier
    const assembled = assembleChunks(receivedChunks, chunks.length);
    const assembledContent = new TextDecoder().decode(assembled);

    // Vérifier l'intégrité
    expect(assembledContent).toBe(testContent);

    // Vérifier qu'aucune erreur n'a été enregistrée
    expect(consoleErrors).toHaveLength(0);
  });

  it('devrait gérer la récupération de chunks manquants sans erreur', async () => {
    // Créer un fichier de test
    const testContent = 'Test de récupération avec chunks manquants - ce texte est assez long pour générer plusieurs chunks';
    const testFile = new File([testContent], 'recovery-test.txt', { type: 'text/plain' });
    const fileHash = await calculateSHA256(testFile);

    // Découper le fichier
    const chunkSize = 30;
    const chunks = await splitFileIntoChunks(testFile, chunkSize, fileHash);

    expect(chunks.length).toBeGreaterThan(3);

    // Simuler une transmission avec des pertes (récepteur ne reçoit pas tous les chunks)
    const receivedChunks = new Map();
    const lostChunkIndices = [1, 3]; // Simuler la perte des chunks 1 et 3

    chunks.forEach((chunk, index) => {
      if (!lostChunkIndices.includes(index)) {
        receivedChunks.set(chunk.chunkIndex, chunk.data);
      }
    });

    // Le récepteur détecte les chunks manquants
    const missing = findMissingChunks(receivedChunks, chunks.length);
    expect(missing).toEqual(lostChunkIndices);

    // Le récepteur crée un QR code de récupération
    const recoveryData = createRecoveryData(fileHash, missing);
    expect(recoveryData.fileHash).toBe(fileHash);
    expect(recoveryData.missingChunks).toEqual(lostChunkIndices);

    // L'émetteur scanne le QR de récupération et retransmet uniquement les chunks manquants
    const chunksToRetransmit = recoveryData.missingChunks.map(idx => chunks[idx]);
    expect(chunksToRetransmit).toHaveLength(lostChunkIndices.length);

    // Le récepteur reçoit les chunks manquants
    chunksToRetransmit.forEach(chunk => {
      receivedChunks.set(chunk.chunkIndex, chunk.data);
    });

    // Vérifier que tous les chunks sont maintenant reçus
    const stillMissing = findMissingChunks(receivedChunks, chunks.length);
    expect(stillMissing).toHaveLength(0);

    // Assembler et vérifier l'intégrité
    const assembled = assembleChunks(receivedChunks, chunks.length);
    const assembledContent = new TextDecoder().decode(assembled);
    expect(assembledContent).toBe(testContent);

    // Vérifier qu'aucune erreur n'a été enregistrée
    expect(consoleErrors).toHaveLength(0);
  });

  it('devrait gérer plusieurs cycles de récupération sans erreur', async () => {
    const testContent = 'Cycle multiple de récupération - test avec beaucoup de chunks pour simuler plusieurs pertes successives';
    const testFile = new File([testContent], 'multi-recovery.txt', { type: 'text/plain' });
    const fileHash = await calculateSHA256(testFile);

    const chunkSize = 20;
    const chunks = await splitFileIntoChunks(testFile, chunkSize, fileHash);

    // Première transmission : perte importante
    const receivedChunks = new Map();
    [0, 2, 4, 6].forEach(idx => {
      if (idx < chunks.length) {
        receivedChunks.set(chunks[idx].chunkIndex, chunks[idx].data);
      }
    });

    // Premier cycle de récupération
    let missing = findMissingChunks(receivedChunks, chunks.length);
    expect(missing.length).toBeGreaterThan(0);

    let recoveryData1 = createRecoveryData(fileHash, missing);
    expect(recoveryData1.missingChunks).toEqual(missing);

    // Retransmettre une partie (simuler encore des pertes)
    const halfMissing = missing.slice(0, Math.ceil(missing.length / 2));
    halfMissing.forEach(idx => {
      receivedChunks.set(chunks[idx].chunkIndex, chunks[idx].data);
    });

    // Deuxième cycle de récupération
    missing = findMissingChunks(receivedChunks, chunks.length);

    if (missing.length > 0) {
      let recoveryData2 = createRecoveryData(fileHash, missing);
      expect(recoveryData2.missingChunks).toEqual(missing);

      // Retransmettre le reste
      missing.forEach(idx => {
        receivedChunks.set(chunks[idx].chunkIndex, chunks[idx].data);
      });
    }

    // Vérifier que tout est reçu
    missing = findMissingChunks(receivedChunks, chunks.length);
    expect(missing).toHaveLength(0);

    // Assembler et vérifier
    const assembled = assembleChunks(receivedChunks, chunks.length);
    const assembledContent = new TextDecoder().decode(assembled);
    expect(assembledContent).toBe(testContent);

    // Vérifier qu'aucune erreur n'a été enregistrée
    expect(consoleErrors).toHaveLength(0);
  });

  it('devrait gérer des fichiers binaires sans erreur', async () => {
    // Créer un fichier binaire avec divers octets
    const binaryData = new Uint8Array([
      0x00, 0x01, 0x02, 0xFF, 0xFE, 0xFD, 0x80, 0x7F,
      0x42, 0x69, 0x6E, 0x61, 0x72, 0x79, 0x21, 0x00,
      0xDE, 0xAD, 0xBE, 0xEF, 0xCA, 0xFE, 0xBA, 0xBE
    ]);
    const testFile = new File([binaryData], 'binary.dat', { type: 'application/octet-stream' });
    const fileHash = await calculateSHA256(testFile);

    // Découper
    const chunkSize = 8;
    const chunks = await splitFileIntoChunks(testFile, chunkSize, fileHash);

    expect(chunks.length).toBeGreaterThan(1);

    // Simuler réception avec quelques pertes
    const receivedChunks = new Map();
    const lostIndices = [1];

    chunks.forEach((chunk, index) => {
      if (!lostIndices.includes(index)) {
        receivedChunks.set(chunk.chunkIndex, chunk.data);
      }
    });

    // Récupération
    let missing = findMissingChunks(receivedChunks, chunks.length);
    expect(missing).toEqual(lostIndices);

    // Retransmettre les chunks manquants
    missing.forEach(idx => {
      receivedChunks.set(chunks[idx].chunkIndex, chunks[idx].data);
    });

    // Assembler
    const assembled = assembleChunks(receivedChunks, chunks.length);

    // Vérifier que les données binaires sont identiques
    expect(assembled).toEqual(binaryData);

    // Vérifier qu'aucune erreur n'a été enregistrée
    expect(consoleErrors).toHaveLength(0);
  });

  it('devrait gérer des fichiers volumineux sans erreur', async () => {
    // Créer un fichier plus volumineux (10 KB)
    const largeContent = 'A'.repeat(10240);
    const testFile = new File([largeContent], 'large-file.txt', { type: 'text/plain' });
    const fileHash = await calculateSHA256(testFile);

    // Découper avec une taille de chunk réaliste
    const chunkSize = 1000;
    const chunks = await splitFileIntoChunks(testFile, chunkSize, fileHash);

    expect(chunks.length).toBeGreaterThanOrEqual(10);

    // Simuler une transmission avec pertes aléatoires
    const receivedChunks = new Map();
    const lostIndices = [2, 5, 7]; // Perdre quelques chunks

    chunks.forEach((chunk, index) => {
      if (!lostIndices.includes(index)) {
        receivedChunks.set(chunk.chunkIndex, chunk.data);
      }
    });

    // Première détection de chunks manquants
    let missing = findMissingChunks(receivedChunks, chunks.length);
    expect(missing).toEqual(lostIndices);

    // Récupération
    missing.forEach(idx => {
      receivedChunks.set(chunks[idx].chunkIndex, chunks[idx].data);
    });

    // Vérifier que tout est reçu
    missing = findMissingChunks(receivedChunks, chunks.length);
    expect(missing).toHaveLength(0);

    // Assembler
    const assembled = assembleChunks(receivedChunks, chunks.length);
    const assembledContent = new TextDecoder().decode(assembled);

    expect(assembledContent).toBe(largeContent);
    expect(assembledContent.length).toBe(10240);

    // Vérifier qu'aucune erreur n'a été enregistrée
    expect(consoleErrors).toHaveLength(0);
  });

  it('devrait valider l\'intégrité des données avec le hash du fichier', async () => {
    const testContent = 'Test d\'intégrité avec hash';
    const testFile = new File([testContent], 'integrity-test.txt', { type: 'text/plain' });
    const fileHash = await calculateSHA256(testFile);

    // Découper
    const chunks = await splitFileIntoChunks(testFile, 20, fileHash);

    // Vérifier que tous les chunks ont le bon hash
    chunks.forEach(chunk => {
      expect(chunk.fileHash).toBe(fileHash);
    });

    // Simuler réception complète
    const receivedChunks = new Map();
    chunks.forEach(chunk => {
      receivedChunks.set(chunk.chunkIndex, chunk.data);
    });

    // Assembler
    const assembled = assembleChunks(receivedChunks, chunks.length);

    // Recalculer le hash du fichier assemblé
    const reassembledFile = new File([assembled], 'test.txt', { type: 'text/plain' });
    const reassembledHash = await calculateSHA256(reassembledFile);

    // Vérifier que le hash correspond
    expect(reassembledHash).toBe(fileHash);

    // Vérifier qu'aucune erreur n'a été enregistrée
    expect(consoleErrors).toHaveLength(0);
  });

  it('devrait gérer des noms de fichiers avec caractères spéciaux', async () => {
    const testContent = 'Test avec nom de fichier spécial';
    const specialFileName = 'test-éàç_file (1) [copie].txt';
    const testFile = new File([testContent], specialFileName, { type: 'text/plain' });
    const fileHash = await calculateSHA256(testFile);

    const chunks = await splitFileIntoChunks(testFile, 20, fileHash);

    // Vérifier que le nom de fichier est préservé
    chunks.forEach(chunk => {
      expect(chunk.fileName).toBe(specialFileName);
    });

    // Réception et assemblage
    const receivedChunks = new Map();
    chunks.forEach(chunk => {
      receivedChunks.set(chunk.chunkIndex, chunk.data);
    });

    const assembled = assembleChunks(receivedChunks, chunks.length);
    const assembledContent = new TextDecoder().decode(assembled);

    expect(assembledContent).toBe(testContent);

    // Vérifier qu'aucune erreur n'a été enregistrée
    expect(consoleErrors).toHaveLength(0);
  });

  it('devrait détecter les chunks en double et les ignorer', async () => {
    const testContent = 'Test de détection de doublons';
    const testFile = new File([testContent], 'duplicate-test.txt', { type: 'text/plain' });
    const fileHash = await calculateSHA256(testFile);

    const chunks = await splitFileIntoChunks(testFile, 20, fileHash);

    // Recevoir les chunks, incluant des doublons
    const receivedChunks = new Map();
    chunks.forEach(chunk => {
      receivedChunks.set(chunk.chunkIndex, chunk.data);
    });

    const initialSize = receivedChunks.size;

    // Essayer d'ajouter des doublons
    chunks.forEach(chunk => {
      receivedChunks.set(chunk.chunkIndex, chunk.data);
    });

    // Vérifier que la taille n'a pas changé (Map ignore les doublons)
    expect(receivedChunks.size).toBe(initialSize);

    // Assembler
    const assembled = assembleChunks(receivedChunks, chunks.length);
    const assembledContent = new TextDecoder().decode(assembled);

    expect(assembledContent).toBe(testContent);

    // Vérifier qu'aucune erreur n'a été enregistrée
    expect(consoleErrors).toHaveLength(0);
  });

  it('devrait gérer une récupération totale (tous les chunks manquants)', async () => {
    const testContent = 'Test de récupération complète';
    const testFile = new File([testContent], 'full-recovery.txt', { type: 'text/plain' });
    const fileHash = await calculateSHA256(testFile);

    const chunks = await splitFileIntoChunks(testFile, 15, fileHash);

    // Le récepteur n'a reçu aucun chunk (scénario extrême)
    const receivedChunks = new Map();

    // Détecter tous les chunks manquants
    const missing = findMissingChunks(receivedChunks, chunks.length);
    expect(missing.length).toBe(chunks.length);

    // Créer un QR de récupération pour tous les chunks
    const recoveryData = createRecoveryData(fileHash, missing);
    expect(recoveryData.missingChunks.length).toBe(chunks.length);

    // Retransmettre tous les chunks
    chunks.forEach(chunk => {
      receivedChunks.set(chunk.chunkIndex, chunk.data);
    });

    // Vérifier que tout est reçu
    const stillMissing = findMissingChunks(receivedChunks, chunks.length);
    expect(stillMissing).toHaveLength(0);

    // Assembler
    const assembled = assembleChunks(receivedChunks, chunks.length);
    const assembledContent = new TextDecoder().decode(assembled);

    expect(assembledContent).toBe(testContent);

    // Vérifier qu'aucune erreur n'a été enregistrée
    expect(consoleErrors).toHaveLength(0);
  });
});

describe('Tests d\'intégration - Scénarios d\'erreur', () => {
  let consoleErrors = [];
  let originalConsoleError;

  beforeEach(() => {
    consoleErrors = [];
    originalConsoleError = console.error;
    console.error = (...args) => {
      consoleErrors.push(args.join(' '));
      originalConsoleError(...args);
    };
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  it('devrait gérer gracieusement un chunk avec index invalide', async () => {
    const testContent = 'Test avec index invalide';
    const testFile = new File([testContent], 'invalid-index.txt', { type: 'text/plain' });
    const fileHash = await calculateSHA256(testFile);

    const chunks = await splitFileIntoChunks(testFile, 15, fileHash);
    const receivedChunks = new Map();

    // Ajouter les chunks valides
    chunks.forEach(chunk => {
      receivedChunks.set(chunk.chunkIndex, chunk.data);
    });

    // Tenter d'ajouter un chunk avec un index hors limites (sera ignoré par Map)
    receivedChunks.set(999, 'invalid-data');

    // L'assemblage devrait toujours fonctionner pour les chunks valides
    const assembled = assembleChunks(receivedChunks, chunks.length);
    const assembledContent = new TextDecoder().decode(assembled);

    expect(assembledContent).toBe(testContent);
  });

  it('devrait gérer des chunks reçus dans le désordre', async () => {
    const testContent = 'Test avec ordre mélangé des chunks';
    const testFile = new File([testContent], 'shuffled.txt', { type: 'text/plain' });
    const fileHash = await calculateSHA256(testFile);

    const chunks = await splitFileIntoChunks(testFile, 10, fileHash);

    // Mélanger l'ordre des chunks
    const shuffledChunks = [...chunks].sort(() => Math.random() - 0.5);

    // Recevoir dans le désordre
    const receivedChunks = new Map();
    shuffledChunks.forEach(chunk => {
      receivedChunks.set(chunk.chunkIndex, chunk.data);
    });

    // L'assemblage devrait reconstruire dans le bon ordre
    const assembled = assembleChunks(receivedChunks, chunks.length);
    const assembledContent = new TextDecoder().decode(assembled);

    expect(assembledContent).toBe(testContent);

    // Vérifier qu'aucune erreur critique n'a été enregistrée
    const criticalErrors = consoleErrors.filter(err =>
      !err.includes('Warning:')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  it('devrait gérer un fichier vide sans erreur', async () => {
    const testFile = new File([], 'empty.txt', { type: 'text/plain' });
    const fileHash = await calculateSHA256(testFile);

    const chunks = await splitFileIntoChunks(testFile, 100, fileHash);

    // Un fichier vide peut générer 0 ou 1 chunk selon l'implémentation
    expect(chunks.length).toBeGreaterThanOrEqual(0);

    if (chunks.length > 0) {
      const receivedChunks = new Map();
      chunks.forEach(chunk => {
        receivedChunks.set(chunk.chunkIndex, chunk.data);
      });

      const assembled = assembleChunks(receivedChunks, chunks.length);
      expect(assembled.length).toBe(0);
    }

    // Vérifier qu'aucune erreur critique n'a été enregistrée
    const criticalErrors = consoleErrors.filter(err =>
      !err.includes('Warning:')
    );
    expect(criticalErrors).toHaveLength(0);
  });
});

