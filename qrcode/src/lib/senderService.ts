/**
 * Service métier pour l'envoi de fichiers via QR codes
 */

import QRCode from 'qrcode';
import type {
	FileChunk,
	FileInfoQRData,
	QRCodeOptions,
	ErrorCorrectionLevel,
	QRCapacityMap,
	RecoveryQRData,
} from './types';
import {
	bytesToHex,
	getIndexBytes,
	encodeChunkIndex,
	calculateSHA1,
} from './commons';

/**
 * Capacités des QR codes selon le niveau de correction d'erreur
 */
export const QR_CAPACITY: QRCapacityMap = {
	L: 2953, // Low (7% error correction)
	M: 2331, // Medium (15% error correction)
	Q: 1663, // Quartile (25% error correction)
	H: 1273, // High (30% error correction)
};

/**
 * Calcule la taille maximale d'un chunk en fonction du niveau de correction d'erreur
 * @param errorCorrectionLevel - Niveau de correction d'erreur
 * @returns Taille maximale en octets
 */
export function getMaxChunkSize(errorCorrectionLevel: ErrorCorrectionLevel): number {
	// Format binaire: SHA1(20) + index(3 max) = 23 octets de header
	const binaryHeader = 23;
	return QR_CAPACITY[errorCorrectionLevel] - binaryHeader;
}

/**
 * Valide et ajuste la taille d'un chunk si nécessaire
 * @param chunkSize - Taille du chunk proposée
 * @param errorCorrectionLevel - Niveau de correction d'erreur
 * @returns Taille du chunk ajustée
 */
export function validateChunkSize(
	chunkSize: number,
	errorCorrectionLevel: ErrorCorrectionLevel
): { adjustedSize: number; wasAdjusted: boolean } {
	const maxSize = getMaxChunkSize(errorCorrectionLevel);
	if (chunkSize > maxSize) {
		return {
			adjustedSize: maxSize,
			wasAdjusted: true,
		};
	}
	return {
		adjustedSize: chunkSize,
		wasAdjusted: false,
	};
}

/**
 * Découpe un fichier en chunks avec format binaire optimisé
 * @param file - Fichier à découper
 * @param chunkSize - Taille de chaque chunk
 * @returns Promise contenant le hash du fichier et les chunks
 */
export async function splitFileIntoChunks(
	file: File,
	chunkSize: number
): Promise<{ fileHash: Uint8Array; chunks: FileChunk[] }> {
	// Calculer le hash du fichier
	const fileHash = await calculateSHA1(file);

	// Lire le fichier
	const arrayBuffer = await file.arrayBuffer();
	const uint8Array = new Uint8Array(arrayBuffer);

	// Calculer le nombre total de chunks
	const totalChunks = Math.ceil(uint8Array.length / chunkSize);

	// Déterminer le nombre d'octets pour l'index
	const indexBytes = getIndexBytes(totalChunks);

	const chunks: FileChunk[] = [];

	for (let i = 0; i < totalChunks; i++) {
		const start = i * chunkSize;
		const end = Math.min(start + chunkSize, uint8Array.length);
		const chunkData = uint8Array.slice(start, end);

		// Format binaire: [SHA1(20)][chunkIndex(1-3 octets)][data]
		const binaryChunk = new Uint8Array(20 + indexBytes + chunkData.length);
		binaryChunk.set(fileHash, 0); // SHA1: 20 octets

		// Encoder l'index
		const encodedIndex = encodeChunkIndex(i, indexBytes);
		binaryChunk.set(encodedIndex, 20);

		// Ajouter les données du chunk
		binaryChunk.set(chunkData, 20 + indexBytes);

		chunks.push({
			binaryData: binaryChunk,
			chunkIndex: i,
			fileName: file.name,
		});
	}

	return { fileHash, chunks };
}

/**
 * Génère le QR code d'information initial
 * @param file - Fichier à transmettre
 * @param fileHash - Hash du fichier
 * @param totalChunks - Nombre total de chunks
 * @param chunkSize - Taille des chunks
 * @returns Promise contenant l'URL data du QR code
 */
export async function generateFileInfoQRCode(
	file: File,
	fileHash: Uint8Array,
	totalChunks: number,
	chunkSize: number
): Promise<string> {
	const infoData: FileInfoQRData = {
		type: 'fileInfo',
		fileHash: bytesToHex(fileHash),
		fileName: file.name,
		fileSize: file.size,
		totalChunks,
		chunkSize,
	};

	const options: QRCodeOptions = {
		errorCorrectionLevel: 'M',
		margin: 1,
		width: 800,
	};

	return await QRCode.toDataURL(JSON.stringify(infoData), options);
}

/**
 * Génère un QR code pour un chunk de données
 * @param chunk - Chunk à encoder
 * @param errorCorrectionLevel - Niveau de correction d'erreur
 * @returns Promise contenant l'URL data du QR code
 */
export async function generateChunkQRCode(
	chunk: FileChunk,
	errorCorrectionLevel: ErrorCorrectionLevel
): Promise<string> {
	// Créer un segment de données binaires pour QRCode
	const segments = [
		{
			data: chunk.binaryData,
			mode: 'byte' as const,
		},
	];

	const options: QRCodeOptions = {
		errorCorrectionLevel,
		margin: 1,
		width: 1000,
		color: {
			dark: '#000000',
			light: '#FFFFFF',
		},
	};

	return await QRCode.toDataURL(segments, options);
}

/**
 * Génère plusieurs QR codes en parallèle
 * @param chunks - Chunks à encoder
 * @param errorCorrectionLevel - Niveau de correction d'erreur
 * @returns Promise contenant les URLs data des QR codes
 */
export async function generateMultipleQRCodes(
	chunks: FileChunk[],
	errorCorrectionLevel: ErrorCorrectionLevel
): Promise<string[]> {
	const qrPromises = chunks.map((chunk) =>
		generateChunkQRCode(chunk, errorCorrectionLevel)
	);
	return await Promise.all(qrPromises);
}

/**
 * Génère un QR code de récupération
 * @param fileHash - Hash du fichier
 * @param missingChunks - Indices des chunks manquants
 * @returns Promise contenant l'URL data du QR code
 */
export async function generateRecoveryQRCode(
	fileHash: Uint8Array,
	missingChunks: number[]
): Promise<string> {
	const recoveryData: RecoveryQRData = {
		type: 'recovery',
		fileHash: bytesToHex(fileHash),
		missingChunks,
	};

	const options: QRCodeOptions = {
		errorCorrectionLevel: 'M',
		margin: 1,
		width: 400,
	};

	return await QRCode.toDataURL(JSON.stringify(recoveryData), options);
}

/**
 * Filtre les chunks à transmettre selon le mode
 * @param allChunks - Tous les chunks disponibles
 * @param missingChunks - Indices des chunks manquants (pour mode recovery)
 * @param mode - Mode de transmission ('all' ou 'recovery')
 * @returns Chunks à transmettre
 */
export function getChunksToTransmit(
  allChunks: FileChunk[],
  missingChunks: number[],
  mode: 'all' | 'recovery'
): FileChunk[] {
  if (mode === 'recovery' && missingChunks.length > 0) {
    return missingChunks
      .map((idx) => allChunks[idx])
      .filter((chunk): chunk is FileChunk => chunk !== undefined);
  }
  return allChunks;
}
