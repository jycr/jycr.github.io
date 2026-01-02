/**
 * Utilitaires pour la manipulation de fichiers et chunks (legacy - base64)
 * Note: La nouvelle implémentation utilise un format binaire optimisé (voir senderService.ts et receiverService.ts)
 * Ces fonctions sont conservées pour compatibilité avec les tests existants
 */

/**
 * Calcule le hash SHA-256 d'un fichier
 * @param file - Le fichier à hasher
 * @returns Promise contenant le hash en hexadécimal
 */
export async function calculateSHA256(file: File): Promise<string> {
	const arrayBuffer = await file.arrayBuffer();
	const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Interface pour les chunks au format base64 (legacy)
 */
export interface LegacyChunk {
	fileHash: string;
	fileName: string;
	chunkIndex: number;
	totalChunks: number;
	data: string; // base64
}

/**
 * Découpe un fichier en chunks avec encodage base64
 * @param file - Le fichier à découper
 * @param chunkSize - Taille de chaque chunk en octets
 * @param fileHash - Hash SHA-256 du fichier
 * @returns Promise contenant le tableau de chunks
 */
export async function splitFileIntoChunks(
	file: File,
	chunkSize: number,
	fileHash: string
): Promise<LegacyChunk[]> {
	const arrayBuffer = await file.arrayBuffer();
	const uint8Array = new Uint8Array(arrayBuffer);
	const chunks: LegacyChunk[] = [];
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
			data: base64Chunk,
		});
	}

	return chunks;
}

/**
 * Assemble les chunks pour recréer le fichier
 * @param chunksMap - Map des chunks reçus (index -> données base64)
 * @param totalChunks - Nombre total de chunks attendus
 * @returns Données du fichier reconstitué
 */
export function assembleChunks(
	chunksMap: Map<number, string>,
	totalChunks: number
): Uint8Array {
	const sortedChunks: string[] = [];

	for (let i = 0; i < totalChunks; i++) {
		if (!chunksMap.has(i)) {
			throw new Error(`Chunk ${i} manquant`);
		}
		sortedChunks.push(chunksMap.get(i)!);
	}

	// Décoder les chunks base64
	const decodedChunks = sortedChunks.map((base64) => {
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
 * @param receivedChunks - Map des chunks reçus
 * @param totalChunks - Nombre total de chunks
 * @returns Indices des chunks manquants
 */
export function findMissingChunks(
	receivedChunks: Map<number, string>,
	totalChunks: number
): number[] {
	const missing: number[] = [];
	for (let i = 0; i < totalChunks; i++) {
		if (!receivedChunks.has(i)) {
			missing.push(i);
		}
	}
	return missing;
}

/**
 * Valide un chunk reçu
 * @param chunk - Le chunk à valider
 * @returns true si le chunk est valide
 */
export function validateChunk(chunk: unknown): chunk is LegacyChunk {
	if (!chunk || typeof chunk !== 'object') return false;

	const c = chunk as Record<string, unknown>;

	return (
		typeof c.fileHash === 'string' &&
		typeof c.chunkIndex === 'number' &&
		typeof c.totalChunks === 'number' &&
		typeof c.data === 'string' &&
		c.chunkIndex >= 0 &&
		c.chunkIndex < c.totalChunks
	);
}

/**
 * Interface pour les données de récupération
 */
export interface RecoveryData {
	type: 'recovery';
	fileHash: string;
	missingChunks: number[];
}

/**
 * Crée un objet de QR de récupération
 * @param fileHash - Hash du fichier
 * @param missingChunks - Liste des chunks manquants
 * @returns Objet de récupération
 */
export function createRecoveryData(
	fileHash: string,
	missingChunks: number[]
): RecoveryData {
	return {
		type: 'recovery',
		fileHash,
		missingChunks,
	};
}

/**
 * Valide un QR de récupération
 * @param recoveryData - Données du QR de récupération
 * @returns true si valide
 */
export function validateRecoveryData(recoveryData: unknown): recoveryData is RecoveryData {
	if (!recoveryData || typeof recoveryData !== 'object') return false;

	const r = recoveryData as Record<string, unknown>;

	return (
		r.type === 'recovery' &&
		typeof r.fileHash === 'string' &&
		Array.isArray(r.missingChunks)
	);
}
