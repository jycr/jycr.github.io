import { describe, it, expect, beforeEach } from 'vitest';
import {
  splitFileIntoChunks,
  assembleChunks,
  findMissingChunks,
  validateChunk,
  createRecoveryData,
  validateRecoveryData
} from '../fileUtils';

describe('fileUtils', () => {
  describe('splitFileIntoChunks', () => {
    it('devrait découper un fichier en chunks', async () => {
      const content = 'Hello, World!';
      const file = new File([content], 'test.txt', { type: 'text/plain' });
      const fileHash = 'abcd1234';
      const chunkSize = 5;

      const chunks = await splitFileIntoChunks(file, chunkSize, fileHash);

      expect(chunks).toHaveLength(3); // 13 bytes / 5 = 3 chunks
      expect(chunks[0]).toHaveProperty('fileHash', fileHash);
      expect(chunks[0]).toHaveProperty('fileName', 'test.txt');
      expect(chunks[0]).toHaveProperty('chunkIndex', 0);
      expect(chunks[0]).toHaveProperty('totalChunks', 3);
      expect(chunks[0]).toHaveProperty('data');
    });

    it('devrait créer un seul chunk si le fichier est petit', async () => {
      const content = 'Hi';
      const file = new File([content], 'small.txt', { type: 'text/plain' });
      const chunks = await splitFileIntoChunks(file, 1000, 'hash123');

      expect(chunks).toHaveLength(1);
    });
  });

  describe('assembleChunks', () => {
    it('devrait assembler les chunks correctement', () => {
      // Créer des chunks de test
      const originalData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      const chunk1 = btoa(String.fromCharCode(...originalData.slice(0, 5)));
      const chunk2 = btoa(String.fromCharCode(...originalData.slice(5, 10)));

      const chunksMap = new Map([
        [0, chunk1],
        [1, chunk2]
      ]);

      const assembled = assembleChunks(chunksMap, 2);

      expect(assembled).toEqual(originalData);
    });

    it('devrait lancer une erreur si un chunk est manquant', () => {
      const chunksMap = new Map([[0, 'data']]);

      expect(() => assembleChunks(chunksMap, 2)).toThrow('Chunk 1 manquant');
    });
  });

  describe('findMissingChunks', () => {
    it('devrait trouver les chunks manquants', () => {
      const receivedChunks = new Map([
        [0, 'data0'],
        [2, 'data2'],
        [4, 'data4']
      ]);

      const missing = findMissingChunks(receivedChunks, 5);

      expect(missing).toEqual([1, 3]);
    });

    it('devrait retourner un tableau vide si tous les chunks sont reçus', () => {
      const receivedChunks = new Map([
        [0, 'data0'],
        [1, 'data1'],
        [2, 'data2']
      ]);

      const missing = findMissingChunks(receivedChunks, 3);

      expect(missing).toEqual([]);
    });

    it('devrait retourner tous les indices si aucun chunk n\'est reçu', () => {
      const receivedChunks = new Map();

      const missing = findMissingChunks(receivedChunks, 3);

      expect(missing).toEqual([0, 1, 2]);
    });
  });

  describe('validateChunk', () => {
    it('devrait valider un chunk correct', () => {
      const chunk = {
        fileHash: 'abc123',
        chunkIndex: 0,
        totalChunks: 5,
        data: 'base64data'
      };

      expect(validateChunk(chunk)).toBe(true);
    });

    it('devrait rejeter un chunk sans fileHash', () => {
      const chunk = {
        chunkIndex: 0,
        totalChunks: 5,
        data: 'base64data'
      };

      expect(validateChunk(chunk)).toBe(false);
    });

    it('devrait rejeter un chunk avec index négatif', () => {
      const chunk = {
        fileHash: 'abc123',
        chunkIndex: -1,
        totalChunks: 5,
        data: 'base64data'
      };

      expect(validateChunk(chunk)).toBe(false);
    });

    it('devrait rejeter un chunk avec index >= totalChunks', () => {
      const chunk = {
        fileHash: 'abc123',
        chunkIndex: 5,
        totalChunks: 5,
        data: 'base64data'
      };

      expect(validateChunk(chunk)).toBe(false);
    });

    it('devrait rejeter null ou undefined', () => {
      expect(validateChunk(null)).toBe(false);
      expect(validateChunk(undefined)).toBe(false);
    });
  });

  describe('createRecoveryData', () => {
    it('devrait créer un objet de récupération valide', () => {
      const fileHash = 'hash123';
      const missingChunks = [1, 3, 5];

      const recovery = createRecoveryData(fileHash, missingChunks);

      expect(recovery).toEqual({
        type: 'recovery',
        fileHash: 'hash123',
        missingChunks: [1, 3, 5]
      });
    });
  });

  describe('validateRecoveryData', () => {
    it('devrait valider des données de récupération correctes', () => {
      const recovery = {
        type: 'recovery',
        fileHash: 'hash123',
        missingChunks: [1, 2, 3]
      };

      expect(validateRecoveryData(recovery)).toBe(true);
    });

    it('devrait rejeter si le type n\'est pas "recovery"', () => {
      const recovery = {
        type: 'chunk',
        fileHash: 'hash123',
        missingChunks: [1, 2, 3]
      };

      expect(validateRecoveryData(recovery)).toBe(false);
    });

    it('devrait rejeter si fileHash est absent', () => {
      const recovery = {
        type: 'recovery',
        missingChunks: [1, 2, 3]
      };

      expect(validateRecoveryData(recovery)).toBe(false);
    });

    it('devrait rejeter si missingChunks n\'est pas un tableau', () => {
      const recovery = {
        type: 'recovery',
        fileHash: 'hash123',
        missingChunks: 'not-an-array'
      };

      expect(validateRecoveryData(recovery)).toBe(false);
    });

    it('devrait rejeter null ou undefined', () => {
      expect(validateRecoveryData(null)).toBe(false);
      expect(validateRecoveryData(undefined)).toBe(false);
    });
  });
});

