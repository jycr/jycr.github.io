/**
 * Service métier pour la réception de fichiers via QR codes
 */

import type {
	FileInfo,
	FileInfoQRData,
	ParsedChunk,
	ScannedSymbol,
	FileAssemblyResult,
	ScanningStats,
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
 * File item representing a file being received
 */
export class FileItem {
	/** Array of received chunks */
	chunks: (Uint8Array | undefined)[];
	/** Scanning statistics */
	stats: ScanningStats;

	/**
	 * 
	 * @param info Information about the file
	 */
	constructor(
		public readonly info: FileInfo,
	) {
		this.info = info;
		this.chunks = new Array(info.totalChunks);
		this.stats = {
			total: 0,
			count: 0,
			duplicates: 0,
			errors: 0,
		};
	}

	hasChunks(i: number) {
		return this.chunks[i] !== undefined;
	}

	/**
	 * Compare if the given FileInfo is different from this FileItem's info
	 */
	isInfoEquals(fileInfo: FileInfo): boolean {
		return JSON.stringify(this.info) === JSON.stringify(fileInfo);
	}

	/**
	 * Add a chunk to the file
	 * @param chunk - The parsed chunk to add
	 */
	addChunk(chunk: ParsedChunk): void {
		// Vérifier si on a déjà ce chunk
		if (this.chunks[chunk.index] !== undefined) {
			this.stats.duplicates++;
			return;
		}

		this.stats.count++;

		// Stocker le chunk (en bytes bruts)
		this.chunks[chunk.index] = chunk.data;

		console.log(
			`Add chunk ${chunk.index + 1}/${this.info.totalChunks} (${chunk.data.length} bytes)`
		);
	}

	/**
	 * Get progress percentage
	 */
	getProgressPercent(): number {
		return (this.stats.count / this.info.totalChunks) * 100;
	}

	/**
	 * Identifie les chunks manquants
	 * @param fileInfo - Informations du fichier
	 * @returns Liste des indices des chunks manquants
	 */
	findMissingChunks(): number[] {
		const missing: number[] = [];
		for (let i = 0; i < this.info.totalChunks; i++) {
			if (this.chunks[i] === undefined) {
				missing.push(i);
			}
		}
		return missing;
	}

	/**
	 * Check if all chunks have been received
	 */
	isFileComplete(): boolean {
		return this.stats.count === this.info.totalChunks;
	}

	/**
	 * Assemble all received chunks to reconstruct the file
	 * @returns Result of the file assembly, including success status, file data, download URL, or error message
	 */
	async assembleFile(): Promise<FileAssemblyResult> {
		try {
			// Vérifier que tous les chunks sont présents
			const chunks: Uint8Array[] = [];
			for (let i = 0; i < this.info.totalChunks; i++) {
				if (this.chunks[i] === undefined) {
					return {
						success: false,
						error: `Missing chunk: ${i}`,
					};
				}
				chunks.push(this.chunks[i]!);
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

			if (calculatedHashHex !== this.info.hash) {
				return {
					success: false,
					error: `Hash mismatch. Expected: ${this.info.hash}, Got: ${calculatedHashHex}`,
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
}
