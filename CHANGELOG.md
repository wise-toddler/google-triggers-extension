# Change Log

## [0.0.2] - 2025-07-18

### Fixed
- **CRITICAL**: Fixed shell escaping for substitution values containing special characters
- Multi-line values (like SSH private keys) now properly escaped in gcloud commands
- Values with spaces, quotes, and newlines no longer break command execution
- Improved command logging for better debugging

### Technical Details
- Added `escapeShellArg()` method to properly escape shell arguments
- Single quotes used for complex values with proper quote escaping
- Simple alphanumeric values remain unescaped for optimal performance

## [0.0.1] - 2025-01-XX

### Added
- Initial release of Google Cloud Build VSCode Extension
- Authentication integration with gcloud CLI
- Project and region selection
- Cloud Build trigger management
- Custom substitution variables support
- Build execution from VSCode
- Tree view interface with VSCode sidebar integration
- Persistent storage for user preferences
- Pin functionality for frequently used triggers
- Modular codebase architecture

### Features
- Seamless integration with Google Cloud Build
- No context switching required
- Professional VSCode-style tree interface
- Comprehensive error handling
- Support for all Google Cloud regions
- Auto-refresh on authentication changes

### Technical Details
- Built with VSCode Extension API using TreeDataProvider
- Uses gcloud CLI for Google Cloud integration
- Modular architecture with separate service classes
- Asynchronous operations for better performance