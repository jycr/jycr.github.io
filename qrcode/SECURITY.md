# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

We take the security of QR Code File Transfer seriously. If you discover a security vulnerability, please follow these steps:

### How to Report

1. **DO NOT** create a public GitHub issue
2. Email the details to: [Your email or create a security contact]
3. Include as much information as possible:
   - Type of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if you have one)

### What to Expect

- **Acknowledgment**: We'll acknowledge receipt within 48 hours
- **Updates**: We'll provide updates on the progress every 5-7 days
- **Resolution**: We aim to resolve critical issues within 7 days
- **Credit**: We'll credit you in the release notes (unless you prefer anonymity)

## Security Features

This application implements several security measures:

### Data Protection
- ✅ **100% Local Processing**: No data sent to external servers
- ✅ **No Storage**: Data not persisted after transfer
- ✅ **SHA-256 Verification**: File integrity checked
- ✅ **No Compression**: Preserves already compressed files

### Network Security
- ✅ **No Network Required**: Offline-first design
- ✅ **HTTPS Required**: Camera access requires secure context
- ✅ **No External Dependencies**: All processing happens locally

### Browser Security
- Uses standard Web APIs (Web Crypto, MediaDevices)
- Requires user permission for camera access
- No eval() or dangerous code execution
- Content Security Policy compatible

## Best Practices for Users

1. **Use HTTPS**: Always serve the application over HTTPS
2. **Keep Updated**: Use the latest version
3. **Verify Integrity**: Check file hashes after transfer
4. **Private Networks**: Use on trusted networks when possible
5. **Browser Updates**: Keep your browser up to date

## Known Limitations

- QR codes are visible to cameras/eyes in range
- No built-in encryption (files transferred as-is)
- Relies on physical security (line of sight)

## Security Updates

Security updates will be released as patch versions and announced via:
- GitHub Security Advisories
- Release notes
- README updates

## Contact

For security concerns, please contact: [Your email or security contact]

For general questions, please use GitHub Issues.

