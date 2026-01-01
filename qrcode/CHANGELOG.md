# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-01

### Added
- Initial release of QR Code File Transfer
- **Sender page** with file selection and QR code generation
- **Receiver page** with camera scanning and file reconstruction
- **Recovery mechanism** for missing chunks
- SHA-256 file integrity verification
- Configurable parameters (speed, chunk size, error correction)
- Real-time progress tracking
- Duplicate chunk detection
- 22 unit and integration tests with 100% coverage
- Complete documentation (README, CONTRIBUTING, SECURITY)
- Multi-language support (French and English)
- Interactive user guide
- Utility script for development tasks

### Features
- 📤 File transmission via QR codes
- 📥 File reception via camera
- 🔄 Smart recovery for missing chunks
- 🔒 SHA-256 integrity verification
- ⚙️ Adjustable transmission parameters
- 📊 Real-time statistics and progress
- 🧪 Comprehensive test suite
- 📱 Responsive design

### Technical
- Built with Svelte 5 and Vite 7
- Uses qrcode library for generation
- Uses jsQR library for scanning
- 100% client-side processing
- No server required
- No network connection needed

### Security
- Local-only processing
- No data persistence
- SHA-256 integrity checks
- HTTPS recommended for camera access

### Browser Support
- Chrome 90+
- Safari 14+
- Firefox 88+
- Edge 90+ (not tested)

---

## [Unreleased]

### Planned
- [ ] End-to-end encryption option
- [ ] Multi-file transfer support
- [ ] Progressive Web App (PWA) features
- [ ] Additional language translations
- [ ] Performance optimizations for large files
- [ ] Automatic chunk retransmission

---

[1.0.0]: https://github.com/YOUR_USERNAME/qrcode-file-transfer/releases/tag/v1.0.0

