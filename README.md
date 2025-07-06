# Google Cloud Build Extension for Cursor/VSCode

A comprehensive extension for managing Google Cloud Build triggers directly from your IDE.

## 🚀 Features

- **🔐 Authentication Management** - Check and manage Google Cloud authentication status
- **📂 Project Selection** - Browse and select from your Google Cloud projects  
- **🌍 Region Selection** - Support for 18+ Google Cloud regions
- **🌿 Branch Selection** - Choose from common branches or enter custom branch names
- **🎯 Build Triggers** - View and execute Cloud Build triggers with one click
- **⚙️ Substitutions Management** - Configure build substitutions in tree view
- **💾 Persistent Storage** - Remembers your settings across IDE restarts
- **🌳 Tree View Interface** - Organized, expandable tree structure

## 📦 Installation

Install the latest extension package:

```bash
code --install-extension ./vscode-extension/google-cloud-build-extension-3.0.0.vsix
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
🔒 Authentication Status
📂 Project: my-gcp-project  
🌍 Region: US Central 1 (Iowa)
🌿 Branch: main
🎯 Build Triggers (5)
├── 📦 my-app-trigger
│   ├── ▶️ Trigger Build
│   ├── _BRANCH = main (default)
│   ├── _ENV = staging (modified) 
│   ├── _VERSION = 1.0.0 (custom)
│   └── ➕ Add Substitution
└── 🚀 deploy-trigger
    └── ...
```

### Workflow:
1. **Check Authentication** → Verify gcloud login
2. **Select Project** → Choose your GCP project
3. **Select Region** → Pick appropriate region (Global, US, Europe, Asia)
4. **Select Branch** → Choose branch for builds
5. **Configure Substitutions** → Set custom variables per trigger
6. **Trigger Builds** → Execute with confirmation dialog

### Substitutions Management:
- **View defaults** → See existing trigger substitutions
- **Edit inline** → Click edit icon to modify values
- **Add custom** → Use "➕ Add Substitution" 
- **Delete/Reset** → Right-click to remove or reset to defaults

## 🏗️ Architecture

### Modular Design (v3.0):
- **`constants.js`** - Configuration and constants
- **`stateManager.js`** - Persistent storage management
- **`gcloudService.js`** - Google Cloud CLI interactions
- **`treeDataProvider.js`** - Tree view logic
- **`commandHandlers.js`** - User interaction handling
- **`extension.js`** - Main entry point

### Supported Regions:
- **Global** (default)
- **US**: Central1, East1, East4, West1-4
- **Europe**: West1-6 (Belgium, London, Frankfurt, etc.)
- **Asia**: East1, Northeast1, Southeast1, South1  
- **Australia**: Southeast1

## 🔧 Development

### Project Structure:
```
/app/
├── vscode-extension/          # VSCode extension (main deliverable)
│   ├── src/                   # Modular source code
│   ├── extension.js           # Entry point
│   ├── package.json           # Extension manifest
│   └── *.vsix                 # Packaged extension
├── tests/                     # Test files
└── README.md                  # Project documentation
```

### Building:
```bash
cd vscode-extension
npm install -g vsce
vsce package
```

## 📋 Requirements

- **VSCode** or **Cursor** IDE
- **Google Cloud CLI** (gcloud) installed and authenticated
- **Node.js** (for development)

## 🎯 Use Cases

- **CI/CD Management** - Trigger builds from your IDE
- **Development Workflow** - Test builds with different branches/substitutions
- **Multi-Project Management** - Switch between GCP projects easily
- **Region-Specific Builds** - Deploy to different regions
- **Parameter Testing** - Quickly test different substitution values

## ✨ Version History

- **v3.0.0** - Modular architecture, improved stability
- **v2.4.0** - Branch selection + persistent storage
- **v2.3.0** - Tree-based substitutions management
- **v2.0.0** - TreeDataProvider approach (Cursor compatibility)
- **v1.0.0** - Initial WebviewViewProvider version

## 🤝 Contributing

This extension was built to solve the problem of context switching when managing Google Cloud Build triggers. Feel free to contribute improvements!

## 📄 License

MIT License - feel free to use and modify as needed.