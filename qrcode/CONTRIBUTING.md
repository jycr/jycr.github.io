# Contributing to QR Code File Transfer

Thank you for your interest in contributing to QR Code File Transfer! We welcome contributions from everyone.

## How to Contribute

### Reporting Bugs

If you find a bug, please open an issue with:
- A clear title and description
- Steps to reproduce the problem
- Expected vs actual behavior
- Screenshots if applicable
- Your environment (browser, OS)

### Suggesting Enhancements

We're open to suggestions! Please open an issue describing:
- The enhancement you'd like to see
- Why it would be useful
- Any implementation ideas you have

### Pull Requests

1. Fork the repository
2. Create a new branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Development Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/qrcode-file-transfer.git
cd qrcode-file-transfer

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Code Style

- Use meaningful variable and function names
- Add comments for complex logic
- Follow the existing code style
- Write tests for new features

### Testing

- All tests must pass before submitting a PR
- Add tests for new features
- Update tests if you change existing functionality

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Commit Messages

- Use clear and descriptive commit messages
- Start with a verb (Add, Fix, Update, Remove, etc.)
- Keep the first line under 50 characters
- Add more details in the body if needed

Examples:
```
Add recovery QR code generation
Fix chunk assembly for binary files
Update README with installation instructions
```

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- Help others learn and grow

## Questions?

Feel free to open an issue for any questions!

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

