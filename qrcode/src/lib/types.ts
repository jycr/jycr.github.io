/**
 * Niveaux de correction d'erreur pour les QR codes
 */
export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

/**
 * Mode de transmission
 */
export type TransmissionMode = 'all' | 'recovery';

/**
 * Capacités des QR codes en octets selon le niveau de correction d'erreur
 */
export interface QRCapacityMap {
	L: number; // Low (7% correction)
	M: number; // Medium (15% correction)
	Q: number; // Quartile (25% correction)
	H: number; // High (30% correction)
}

export interface FileInfo {
	hash: string;        // Hash SHA-1 du fichier en hexadécimal
	name: string;        // Nom du fichier
	size: number;        // Taille du fichier en octets
	totalChunks: number; // Nombre total de chunks
	indexBytes: number;  // Nombre d'octets utilisés pour encoder l'index des chunks
}

/**
 * Données du QR code initial contenant les métadonnées du fichier
 */
export interface FileInfoQRData {
	type: 'fileInfo';
	fileHash: string;    // SHA-1 en hexadécimal
	fileName: string;
	fileSize: number;
	totalChunks: number;
	chunkSize: number;
}

/**
 * Données du QR code de récupération
 */
export interface RecoveryQRData {
	type: 'recovery';
	fileHash: string;
	missingChunks: number[];
}

/**
 * Structure d'un chunk de données
 */
export interface FileChunk {
	binaryData: Uint8Array; // Données binaires du chunk (incluant header)
	chunkIndex: number;     // Index du chunk
	fileName: string;       // Nom du fichier (pour debug)
}

/**
 * Chunk décodé après parsing
 */
export interface ParsedChunk {
	index: number;
	data: Uint8Array;
}

/**
 * Statistiques de scan
 */
export interface ScanningStats {
	/** Total number of QR codes scanned */
	total: number;
	/** Number of unique QR codes processed */
	count: number;
	/** Number of duplicate QR codes detected */
	duplicates: number;
	/** Number of errors encountered during scanning */
	errors: number;
}

/**
 * Configuration de transmission
 */
export interface TransmissionConfig {
	chunkSize: number;
	transmissionSpeed: number;  // Milliseconds between QR codes
	errorCorrectionLevel: ErrorCorrectionLevel;
	numberOfQRCodes: number;    // Number of QR codes to display simultaneously
}

/**
 * Options pour la génération de QR codes
 */
export interface QRCodeOptions {
	errorCorrectionLevel: ErrorCorrectionLevel;
	margin: number;
	width: number;
	color?: {
		dark: string;
		light: string;
	};
}

/**
 * Symbole scanné par zbar-wasm
 */
export interface ScannedSymbol {
	data: Int8Array;
	decode(): string;
	typeName: string;
	quality?: number;
}

/**
 * Résultat de l'assemblage d'un fichier
 */
export interface FileAssemblyResult {
	success: boolean;
	fileData?: Uint8Array;
	downloadUrl?: string;
	error?: string;
}

/**
 * État de la transmission
 */
export interface TransmissionState {
	isTransmitting: boolean;
	currentChunkIndex: number;
	transmittedChunks: Set<number>;
	mode: TransmissionMode;
}

/**
 * État du scanner
 */
export interface ScannerState {
	isScanning: boolean;
	videoElement?: HTMLVideoElement;
	canvas?: HTMLCanvasElement;
	canvasContext?: CanvasRenderingContext2D;
}
