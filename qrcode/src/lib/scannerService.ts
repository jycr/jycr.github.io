/**
 * Service de scanning de QR codes via la caméra
 */

import { scanImageData } from '@undecaf/zbar-wasm';
import type { ScannedSymbol, ScannerState } from './types';

/**
 * Options pour l'accès à la caméra
 */
export interface CameraOptions {
	facingMode?: 'user' | 'environment';
	width?: { ideal: number };
	height?: { ideal: number };
}

/**
 * Démarre le stream vidéo de la caméra
 * @param videoElement - Élément vidéo HTML
 * @param options - Options de la caméra
 * @returns Promise du MediaStream
 */
export async function startCameraStream(
	videoElement: HTMLVideoElement,
	options: CameraOptions = {}
): Promise<MediaStream> {
	const constraints: MediaStreamConstraints = {
		video: {
			facingMode: options.facingMode || 'environment',
			width: options.width || { ideal: 1280 },
			height: options.height || { ideal: 720 },
		},
	};

	const stream = await navigator.mediaDevices.getUserMedia(constraints);
	videoElement.srcObject = stream;
	await videoElement.play();

	return stream;
}

/**
 * Arrête le stream vidéo de la caméra
 * @param videoElement - Élément vidéo HTML
 */
export function stopCameraStream(videoElement: HTMLVideoElement): void {
	if (videoElement.srcObject) {
		const stream = videoElement.srcObject as MediaStream;
		stream.getTracks().forEach((track) => track.stop());
		videoElement.srcObject = null;
	}
}

/**
 * Scanne une frame vidéo pour détecter des QR codes
 * @param videoElement - Élément vidéo source
 * @param canvas - Canvas pour le traitement d'image
 * @param context - Contexte 2D du canvas
 * @returns Promise contenant les symboles détectés
 */
export async function scanVideoFrame(
	videoElement: HTMLVideoElement,
	canvas: HTMLCanvasElement,
	context: CanvasRenderingContext2D
): Promise<ScannedSymbol[]> {
	if (videoElement.readyState !== videoElement.HAVE_ENOUGH_DATA) {
		return [];
	}

	// Ajuster les dimensions du canvas
	canvas.height = videoElement.videoHeight;
	canvas.width = videoElement.videoWidth;

	// Dessiner la frame vidéo sur le canvas
	context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

	// Obtenir les données d'image
	const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

	try {
		const symbols = await scanImageData(imageData);
		return symbols || [];
	} catch (error) {
		console.error('Error scanning QR code:', error);
		return [];
	}
}

/**
 * Initialise le contexte du canvas pour le scanning
 * @param canvas - Canvas HTML
 * @returns Contexte 2D du canvas
 */
export function initializeCanvas(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
	const context = canvas.getContext('2d', { willReadFrequently: true });
	if (!context) {
		throw new Error('Failed to get canvas 2D context');
	}
	return context;
}

/**
 * Crée un état de scanner initial
 * @returns État de scanner vide
 */
export function createScannerState(): ScannerState {
	return {
		isScanning: false,
		videoElement: undefined,
		canvas: undefined,
		canvasContext: undefined,
	};
}
