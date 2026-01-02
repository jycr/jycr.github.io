/**
 * Service métier pour la réception de fichiers via QR codes
 */

import type {
	FileInfo,
	FileInfoQRData,
	ParsedChunk,
	ScannedSymbol,
	FileAssemblyResult,
} from './types';
import {
	bytesToHex,
	getIndexBytes,
	int8ArrayToUint8Array,
	calculateSHA1FromBytes,
	decodeChunkIndex,
} from './commons';

/**
 * Parse le QR code contenant les informations du fichier
 * @param symbol - Symbole scanné
 * @returns Informations du fichier
 * @throws Error si les données ne sont pas valides
 */
export function parseFileInfoQRCode(symbol: ScannedSymbol): FileInfo {
	const START_JSON = '{'.charCodeAt(0);

	if (symbol.data[0] !== START_JSON) {
		throw new Error('Data is not JSON');
	}

	const jsonData: FileInfoQRData = JSON.parse(symbol.decode());

	if (jsonData.type !== 'fileInfo') {
		throw new Error(`Unknown JSON QR code type: ${jsonData.type}`);
	}

	const indexBytes = getIndexBytes(jsonData.totalChunks);

	return {
		hash: jsonData.fileHash,
		name: jsonData.fileName,
		size: jsonData.fileSize,
		totalChunks: jsonData.totalChunks,
		indexBytes,
		chunks: [],
		receivedCount: 0,
	};
}

/**
 * Parse un chunk de données depuis un symbole QR scanné
 * @param symbol - Symbole scanné
 * @param fileInfo - Informations du fichier en cours de réception
 * @returns Chunk parsé avec son index et ses données
 * @throws Error si le chunk est invalide
 */
export function parseChunk(symbol: ScannedSymbol, fileInfo: FileInfo): ParsedChunk {
	// Convertir Int8Array en Uint8Array si nécessaire
	let bytes: Uint8Array;
	if (symbol.data instanceof Int8Array) {
		bytes = int8ArrayToUint8Array(symbol.data);
	} else {
		// Fallback: traiter comme Uint8Array
		bytes = new Uint8Array(symbol.data);
	}

	// Extraire le hash SHA1 (20 premiers octets)
	const chunkHash = bytesToHex(bytes.slice(0, 20));

	// Vérifier que le chunk appartient au même fichier
	if (chunkHash !== fileInfo.hash) {
		throw new Error(
			`Chunk hash does not match file hash: ${chunkHash}, expected: ${fileInfo.hash}`
		);
	}

	// Extraire l'index du chunk (big endian)
	const chunkIndex = decodeChunkIndex(bytes, 20, fileInfo.indexBytes);

	// Vérifier la validité de l'index
	if (chunkIndex < 0 || chunkIndex >= fileInfo.totalChunks) {
		throw new Error(`Invalid chunk index: ${chunkIndex}`);
	}

	// Extraire les données du chunk (après le header)
	return {
		index: chunkIndex,
		data: bytes.slice(20 + fileInfo.indexBytes),
	};
}

/**
 * Assemble tous les chunks reçus pour reconstituer le fichier
 * @param fileInfo - Informations du fichier avec tous les chunks
 * @returns Résultat de l'assemblage avec les données du fichier ou une erreur
 */
export async function assembleFile(fileInfo: FileInfo): Promise<FileAssemblyResult> {
	try {
		// Vérifier que tous les chunks sont présents
		const chunks: Uint8Array[] = [];
		for (let i = 0; i < fileInfo.totalChunks; i++) {
			if (fileInfo.chunks[i] === undefined) {
				return {
					success: false,
					error: `Missing chunk: ${i}`,
				};
			}
			chunks.push(fileInfo.chunks[i]!);
		}

		// Calculer la taille totale
		const totalSize = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
		const fileData = new Uint8Array(totalSize);

		// Copier tous les chunks dans le tableau final
		let offset = 0;
		for (const chunk of chunks) {
			fileData.set(chunk, offset);
			offset += chunk.length;
		}

		// Vérifier le hash
		const calculatedHash = await calculateSHA1FromBytes(fileData);
		const calculatedHashHex = bytesToHex(calculatedHash);

		if (calculatedHashHex !== fileInfo.hash) {
			return {
				success: false,
				error: `Hash mismatch. Expected: ${fileInfo.hash}, Got: ${calculatedHashHex}`,
			};
		}

		// Créer un blob et une URL de téléchargement
		const blob = new Blob([fileData]);
		const downloadUrl = URL.createObjectURL(blob);

		return {
			success: true,
			fileData,
			downloadUrl,
		};
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error',
		};
	}
}

/**
 * Identifie les chunks manquants
 * @param fileInfo - Informations du fichier
 * @returns Liste des indices des chunks manquants
 */
export function findMissingChunks(fileInfo: FileInfo): number[] {
	const missing: number[] = [];
	for (let i = 0; i < fileInfo.totalChunks; i++) {
		if (fileInfo.chunks[i] === undefined) {
			missing.push(i);
		}
	}
	return missing;
}

/**
 * Vérifie si tous les chunks ont été reçus
 * @param fileInfo - Informations du fichier
 * @returns true si tous les chunks sont reçus
 */
export function isFileComplete(fileInfo: FileInfo): boolean {
	return fileInfo.receivedCount === fileInfo.totalChunks;
}

/**
 * Télécharge un fichier assemblé
 * @param downloadUrl - URL du blob à télécharger
 * @param fileName - Nom du fichier
 */
export function downloadFile(downloadUrl: string, fileName: string): void {
	const a = document.createElement('a');
	a.href = downloadUrl;
	a.download = fileName || 'fichier_recu';
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
}
