# Change Log

## [0.0.3] - 2025-07-24

### Added
- **Real-time Build Status Tracking** - Monitor build progress after triggering with live status updates
- **Enhanced Authentication Validation** - Improved auth checking with specific error messages for different auth issues
- **Build History View** - View recent builds with status, duration, and trigger information
- **Build Log Viewer** - Click on builds to view their logs directly in VSCode
- **Active Build Monitoring** - See currently running builds with real-time duration tracking
- **Automatic Build Refresh** - Recent builds automatically refresh after triggering new builds

### Enhanced
- **Better Authentication Error Messages** - Specific guidance for `gcloud auth login` vs `gcloud auth application-default login`
- **Build Status Icons** - Visual indicators for build states (✅ Success, ❌ Failure, 🔄 Working, etc.)
- **Improved Tree View** - Added build sections alongside triggers for comprehensive project overview
- **Enhanced Logging** - Better build monitoring and status update logging

### Fixed
- **Authentication Issues** - Fixed cases where extension showed authenticated but builds failed
- **Build Status Visibility** - Users can now see what happened to their triggered builds
- **Missing Feedback** - Added notifications for build completion and failure states

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