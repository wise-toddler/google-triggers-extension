# Google Cloud Build Extension v3.0

A comprehensive VSCode/Cursor extension for managing Google Cloud Build triggers with a clean, modular architecture.

## ✨ Features

- 🔐 **Authentication Management** - Check and manage gcloud authentication
- 📂 **Project Selection** - Browse and select Google Cloud projects
- 🌍 **Region Selection** - Support for 18+ Google Cloud regions
- 🌿 **Branch Selection** - Common branches + custom branch input
- 🎯 **Build Triggers** - One-click trigger execution
- ⚙️ **Substitutions Management** - Tree-view substitutions editor
- 💾 **Persistent Storage** - Remembers settings across restarts
- 🌳 **Tree View Interface** - Clean, organized tree structure

## 🚀 Quick Start

1. **Install Extension**: Load the `.vsix` file
2. **Authenticate**: Run `gcloud auth application-default login`
3. **Open Tree View**: Click Google Cloud Build icon in Activity Bar
4. **Select Project & Region**: Use the tree interface
5. **Trigger Builds**: Expand triggers and click "▶️ Trigger Build"

## 🏗️ Architecture (v3.0)

### Modular Components:
- **`constants.js`** - Configuration, regions, defaults
- **`stateManager.js`** - Persistent storage operations  
- **`gcloudService.js`** - Google Cloud CLI interactions
- **`treeDataProvider.js`** - Tree view rendering logic
- **`commandHandlers.js`** - User interaction handling
- **`extension.js`** - Clean entry point

### Benefits:
- **Single Responsibility** - Each module has one purpose
- **Easy Testing** - Modules can be tested independently
- **Better Maintainability** - Clean separation of concerns
- **Improved Error Handling** - Isolated error boundaries

## 🎮 Usage

### Tree Structure:
```
🔒 Authentication Status
📂 Project: my-project
🌍 Region: US Central 1  
🌿 Branch: main
🎯 Build Triggers (3)
├── 📦 app-trigger
│   ├── ▶️ Trigger Build
│   ├── _ENV = staging (modified)
│   ├── _VERSION = 1.0.0 (custom)
│   └── ➕ Add Substitution
```

### Substitutions:
- **Default values** show from trigger config
- **Modified defaults** marked as "(modified)"
- **Custom variables** marked as "(custom)"
- **Edit inline** by clicking edit icon
- **Add/Delete** via context menu

## 🌍 Supported Regions

- **Global** (default)
- **US**: central1, east1, east4, west1-4
- **Europe**: west1-6 (Belgium, London, Frankfurt...)
- **Asia**: east1, northeast1, southeast1, south1
- **Australia**: southeast1

## 🔧 Development

### Building:
```bash
npm install -g vsce
vsce package
```

### File Structure:
```
src/
├── constants.js        # Config & constants
├── stateManager.js     # Storage management
├── gcloudService.js    # GCloud interactions
├── treeDataProvider.js # Tree view logic
└── commandHandlers.js  # Command handling
```

## 📋 Requirements

- VSCode or Cursor IDE
- Google Cloud CLI (gcloud)
- Authenticated Google Cloud account
- Node.js (for development)

## 🎯 Use Cases

- **CI/CD Automation** - Trigger builds from IDE
- **Development Testing** - Quick builds with custom parameters
- **Multi-Project Workflow** - Easy project switching
- **Region Management** - Deploy to specific regions
- **Parameter Experimentation** - Test different substitutions

## 📈 Version History

- **v3.0.0** - Modular architecture, improved reliability
- **v2.4.0** - Branch selection + persistent storage  
- **v2.3.0** - Tree-based substitutions management
- **v2.0.0** - TreeDataProvider (Cursor compatibility fix)

Built for developers who want seamless Google Cloud Build integration! 🚀