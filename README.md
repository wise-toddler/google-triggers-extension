# Google Cloud Build Extension for Cursor/VSCode

A comprehensive extension for managing Google Cloud Build triggers directly from your IDE with pinning, auto-sync, and multi-region support.

## 🚀 Features

- **🔐 Authentication Management** - Check and manage Google Cloud authentication status
- **📂 Project Selection** - Browse and select from your Google Cloud projects  
- **🌍 Region Selection** - Support for 18+ Google Cloud regions
- **🌿 Branch Selection** - Choose from common branches or enter custom branch names
- **🎯 Build Triggers** - View and execute Cloud Build triggers with one click
- **📌 Pin Important Triggers** - Pin frequently used triggers for quick access
- **⚙️ Substitutions Management** - Configure build substitutions in tree view
- **💾 Persistent Storage** - Remembers your settings across IDE restarts
- **🌳 Tree View Interface** - Organized, expandable tree structure
- **📊 Detailed Logging** - Complete command logging in Extension Host logs
- **🔄 Auto-Refresh** - Automatically loads triggers after authentication/project selection

## 📦 Installation

Install the extension package:

```bash
code --install-extension ./google-cloud-build-extension-0.0.1.vsix
```

## 🛠️ Setup

1. **Install Google Cloud CLI** (if not already installed):
   ```bash
   # macOS
   brew install google-cloud-sdk
   
   # Windows
   # Download from: https://cloud.google.com/sdk/docs/install
   ```

2. **Authenticate with Google Cloud**:
   ```bash
   gcloud auth application-default login
   ```

3. **Open the extension** in VSCode/Cursor:
   - Look for the Google Cloud Build icon in the Activity Bar
   - Click "Check Authentication" to verify your setup

## 🎮 Usage

### Tree View Structure:
```
🔒 Not Authenticated
📂 Project: my-gcp-project  
🌍 Region: US Central 1 (Iowa)
🎯 Build Triggers (5) • Pinned: 2 | Unpinned: 3
├── 📌 Pinned Triggers (2)
│   ├── 📦 important-deploy
│   │   ├── ▶️ Trigger Build
│   │   ├── _ENV = production (modified) 
│   │   ├── _VERSION = 1.0.0 (custom)
│   │   └── ➕ Add Substitution
│   └── 📦 critical-build
└── 🎯 Other Triggers (3)
    ├── 📦 regular-trigger
    └── 📦 test-build
```

### Workflow:
1. **Check Authentication** → Verify gcloud login (auto-loads triggers if project saved)
2. **Select Project** → Choose your GCP project (auto-loads triggers)
3. **Select Region** → Pick appropriate region (auto-reloads triggers)
4. **Pin Important Triggers** → Click pin icon to organize frequently used triggers
5. **Configure Substitutions** → Edit build variables with inline inputs
6. **Trigger Builds** → Click "▶️ Trigger Build" → Enter branch → Confirm with preview

### Substitutions Management:
- **View defaults** → See existing trigger substitutions from Google Cloud
- **Edit inline** → Click edit icon to modify values with simple input dialogs
- **Add custom** → Use "➕ Add Substitution" to add new variables
- **Delete/Reset** → Right-click to remove custom or reset to defaults
- **Visual indicators** → Different icons show default/modified/custom status

### Pin Management:
- **📌 Pin triggers** → Click pin icon next to any trigger name
- **🔝 Pinned section** → Pinned triggers appear at top in separate group
- **🧹 Clear all pins** → Right-click on "Build Triggers" group
- **💾 Persistent pins** → Pin status saved across IDE restarts

## 🏗️ Architecture

### Modular Design:
```
src/
├── constants.js        # Configuration, regions, storage keys
├── stateManager.js     # Persistent storage management
├── pinManager.js       # Trigger pinning functionality
├── gcloudService.js    # Google Cloud CLI interactions
├── treeDataProvider.js # Tree view logic and organization
└── commandHandlers.js  # User interaction handling
```

### Supported Regions:
- **Global** (default)
- **US**: central1, east1, east4, west1-4
- **Europe**: west1-6 (Belgium, London, Frankfurt, etc.)
- **Asia**: east1, northeast1, southeast1, south1  
- **Australia**: southeast1

## 📊 Debugging & Logs

### Extension Host Logs:
1. **View → Output** → Select "Google Cloud Build" from dropdown
2. **Or Command Palette** → "Developer: Show Logs..." → "Extension Host"

### Sample Log Output:
```
🚀 ===== EXECUTING GCLOUD BUILD COMMAND =====
🎯 Trigger: my-app-deploy (ID: abc123def456)
📂 Project: my-gcp-project
🌍 Region: us-central1 (US Central 1 (Iowa))
🌿 Branch: feature/new-ui
⚙️ Substitutions Count: 3
📋 Substitution Details:
   _ENV = production (modified)
   _VERSION = 1.2.0 (custom)
   _BRANCH = main (default)
💻 Final Command:
   gcloud builds triggers run abc123def456 --project=my-gcp-project --region=us-central1 --branch=feature/new-ui --substitutions=_ENV=production,_VERSION=1.2.0,_BRANCH=main
===============================================

✅ BUILD TRIGGERED SUCCESSFULLY!
🆔 Build ID: 12345678-90ab-cdef-ghij-klmnopqrstuv
🕒 Triggered at: 2025-07-07T01:15:32.123Z
===============================================
```

## 🔧 Development

### Project Structure:
```
/app/
├── src/                          # Modular source code
│   ├── constants.js              # Configuration & regions
│   ├── stateManager.js           # Persistent storage  
│   ├── pinManager.js             # Pin functionality
│   ├── gcloudService.js          # Google Cloud interactions
│   ├── treeDataProvider.js       # Tree view logic
│   └── commandHandlers.js        # Command handling
├── extension.js                  # Main entry point
├── package.json                  # Extension manifest
├── google-cloud-build-extension-0.0.1.vsix # Ready to install!
└── README.md                     # Documentation
```

### Building:
```bash
npm install -g vsce
vsce package
```

## 📋 Requirements

- **VSCode** or **Cursor** IDE
- **Google Cloud CLI** (gcloud) installed and authenticated
- **Node.js** (for development)

## 🎯 Use Cases

- **CI/CD Management** - Trigger builds from your IDE without context switching
- **Development Workflow** - Test builds with different branches/substitutions
- **Multi-Project Management** - Switch between GCP projects easily
- **Region-Specific Builds** - Deploy to different regions
- **Parameter Testing** - Quickly test different substitution values
- **Team Workflows** - Pin important triggers for team consistency

## ✨ Version History

- **v0.0.1** - Initial release with full functionality
  - Pin management for important triggers
  - Auto-refresh triggers after authentication/project selection
  - Per-build branch selection with input validation
  - Inline substitution editing with visual indicators
  - Detailed logging in Extension Host logs
  - Fixed gcloud command format (comma-separated substitutions)
  - Persistent storage for all settings
  - Multi-region support (18+ regions)
  - Tree-based organization with pinned/unpinned sections

## 🤝 Contributing

This extension was built to solve the problem of context switching when managing Google Cloud Build triggers. Built with **Emergent AI Agent** using **vibecoding** approach for rapid development and iteration.

## 📄 License

MIT License - feel free to use and modify as needed.