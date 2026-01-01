# 📱 QR Code File Transfer

A Svelte application for transferring files between two devices using only QR codes, without network connection.

[![Svelte](https://img.shields.io/badge/Svelte-5.43-ff3e00?logo=svelte)](https://svelte.dev/)
[![Vite](https://img.shields.io/badge/Vite-7.2-646cff?logo=vite)](https://vitejs.dev/)
[![Tests](https://img.shields.io/badge/Tests-22%20passing-success)](#-tests)
[![Coverage](https://img.shields.io/badge/Coverage-100%25-success)](#-tests)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## 🎯 Features

### 📤 Sender (`sender.html`)

- File selection and analysis (SHA-256 hash)
- Configurable chunk splitting (500-2900 bytes)
- Optimized QR code generation
- Adjustable parameters (speed, size, error correction)
- Recovery QR scanner to retransmit only missing chunks

### 📥 Receiver (`receiver.html`)

- Real-time scanning via camera
- Chunk reception and storage with duplicate detection
- Progress bar and detailed statistics
- Integrity verification (SHA-256)
- Recovery QR code generation
- Download of reconstructed file

### 🔄 Recovery Mechanism

The receiver generates a QR code listing missing chunks. The sender scans this QR and retransmits only the necessary
data. The process is repeatable until complete reception.

## 🚀 Quick Start

```bash
# Installation
npm install

# Development
npm run dev

# Production
npm run build
npm run preview              # Preview build with Vite
npm run serve:dist           # Serve dist/ with http-server (port 8080)

# Tests
npm test
```

Then open in your browser:

- **Home** : http://localhost:5173/ (dev) or http://localhost:8080/ (dist)
- **Sender** : http://localhost:5173/sender.html
- **Receiver** : http://localhost:5173/receiver.html

## 📖 Usage

### Basic Scenario

1. **Sender device** : Open `sender.html`
    - Choose a file
    - Adjust parameters (speed, chunk size, correction)
    - Start transmission

2. **Receiver device** : Open `receiver.html`
    - Start scanning
    - Allow camera access
    - Place camera facing QR codes (distance 20-30 cm)

3. **Recovery** (if needed) :
    - On receiver: Generate recovery QR
    - On sender: Scan this QR
    - Sender automatically retransmits missing chunks

### Server Options for Testing

**Development (Hot reload)**

```bash
npm run dev
# Access: http://localhost:5173/
```

**Production Build**

```bash
npm run build
npm run preview          # Vite server (port 4173)
# or
npm run serve:dist       # http-server (port 8080)
# or
./scripts.sh             # Interactive menu with all options
```

💡 **Tip** : Use `./scripts.sh` for an interactive menu with all available commands, or `serve:dist` to test production
build on different devices (accessible via local IP).

## ⚙️ Recommended Parameters

### QR Code Capacity Limits

The maximum chunk size depends on the error correction level:

| Error Correction | Correction Rate | Max Chunk Size |
|------------------|-----------------|----------------|
| L (Low)          | 7%              | ~2700 bytes    |
| M (Medium)       | 15%             | ~2000 bytes    |
| Q (Quartile)     | 25%             | ~1400 bytes    |
| H (High)         | 30%             | ~1000 bytes    |

⚠️ **Important**: The application will automatically validate and adjust chunk size based on the selected error
correction level.

### Recommended Settings by File Size

| File Size | Chunk Size | Speed  | Correction |
|-----------|------------|--------|------------|
| < 1 MB    | 1400 bytes | 500 ms | M (15%)    |
| 1-10 MB   | 2000 bytes | 300 ms | L or M     |
| > 10 MB   | 2700 bytes | 200 ms | L (7%)     |

## 🛠️ Technologies

- **Framework** : Svelte 5 + Vite 7
- **Libraries** : qrcode, jsQR
- **APIs** : Web Crypto (SHA-256), MediaDevices (camera), Canvas, File, Blob

## 📊 Data Format

### Chunk QR Code

```json
{
  "fileHash": "sha256_hash",
  "fileName": "example.zip",
  "chunkIndex": 0,
  "totalChunks": 100,
  "data": "base64_encoded_data"
}
```

### Recovery QR Code

```json
{
  "type": "recovery",
  "fileHash": "sha256_hash",
  "missingChunks": [
    1,
    5,
    12
  ]
}
```

## 🧪 Tests

The application includes a complete test suite with **22 tests** and **100% coverage** on utility functions.

### Run Tests

```bash
# All tests
npm test

# Tests in watch mode (auto-rerun)
npm run test:watch

# Tests with coverage report
npm run test:coverage
```

### Available Tests

**Unit tests (18 tests)** - `src/lib/__tests__/fileUtils.test.js`

- File splitting into chunks
- Chunks assembly into file
- Missing chunks detection
- Chunk and recovery data validation
- Edge cases and error handling

**Integration tests (4 tests)** - `src/lib/__tests__/integration.test.js`

- Complete successful transfer scenario
- Transfer with missing chunks and recovery
- Binary file handling
- Multiple recovery cycles

### Results

```
✓ src/lib/__tests__/integration.test.js (4 tests) 3ms
✓ src/lib/__tests__/fileUtils.test.js (18 tests) 4ms

Test Files  2 passed (2)
Tests       22 passed (22)
Coverage    100% (fileUtils.js)
```

### Test Infrastructure

- **Vitest 4.0.16** : Modern and fast test framework
- **@testing-library/svelte** : Testing utilities for Svelte
- **happy-dom** : Lightweight DOM environment
- **Mocks** : Web Crypto API, MediaDevices API, URL API

### Adding New Tests

Tests are in `src/lib/__tests__/`. Example:

```javascript
import {describe, it, expect} from 'vitest';
import {myFunction} from '../myModule';

describe('My module', () => {
    it('should work correctly', () => {
        const result = myFunction('test');
        expect(result).toBe('expected');
    });
});
```

## 🏗️ Project Structure

```
src/
├── lib/
│   ├── Sender.svelte      # Sender component
│   ├── Receiver.svelte    # Receiver component
│   └── __tests__/         # Unit tests
├── App.svelte             # Home page
├── sender.js              # Sender entry point
└── receiver.js            # Receiver entry point
```

## 🔒 Security

- ✅ 100% local processing (no server)
- ✅ SHA-256 integrity verification
- ✅ No permanent storage
- ✅ No compression (for already compressed files)

## 🌐 Compatibility

| Browser     | Support       |
|-------------|---------------|
| Chrome 90+  | ✅ Recommended |
| Safari 14+  | ✅ Tested      |
| Firefox 88+ | ✅ Tested      |
| Edge 90+    | ⚠️ Not tested |

## 🐛 Troubleshooting

**Camera won't start** : Allow access, use HTTPS/localhost  
**QR codes unreadable** : Improve lighting, adjust distance (20-30 cm)  
**Missing chunks** : Slow down speed, use recovery mode

## 📈 Transfer Time Estimates

| Size   | Time (default: 2000 bytes, 500 ms) |
|--------|------------------------------------|
| 100 KB | ~25 seconds                        |
| 1 MB   | ~4 minutes                         |
| 10 MB  | ~42 minutes                        |

## 🤝 Contributing

Contributions are welcome! Feel free to open an issue or pull request.

## 📄 License

MIT

