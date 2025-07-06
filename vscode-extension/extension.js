// Google Cloud Build Extension - Main Entry Point
const vscode = require('vscode');

// Import modular components
const StateManager = require('./src/stateManager');
const GCloudService = require('./src/gcloudService');
const GoogleCloudBuildTreeDataProvider = require('./src/treeDataProvider');
const CommandHandlers = require('./src/commandHandlers');

function activate(context) {
    console.log('🚀 Google Cloud Build Extension v3.0 - Modular Architecture');
    
    try {
        // Initialize services
        const stateManager = new StateManager(context);
        const gcloudService = new GCloudService();
        
        // Create tree data provider
        const treeDataProvider = new GoogleCloudBuildTreeDataProvider(stateManager, gcloudService);
        
        // Register tree data provider
        vscode.window.registerTreeDataProvider('googleCloudBuildTree', treeDataProvider);
        
        // Create command handlers
        const commandHandlers = new CommandHandlers(treeDataProvider, gcloudService);
        
        // Register all commands
        commandHandlers.registerCommands(context);
        
        console.log('✅ Google Cloud Build Extension activated successfully');
        vscode.window.showInformationMessage('Google Cloud Build Extension v3.0 activated! 🚀');
        
        // Auto-load previous state if available
        if (treeDataProvider.selectedProject) {
            console.log(`📂 Restored project: ${treeDataProvider.selectedProject}`);
            console.log(`🌍 Restored region: ${treeDataProvider.selectedRegion}`);
            console.log(`🌿 Restored branch: ${treeDataProvider.selectedBranch}`);
        }
        
    } catch (error) {
        console.error('❌ Extension activation failed:', error);
        vscode.window.showErrorMessage(`Extension activation failed: ${error.message}`);
    }
}

function deactivate() {
    console.log('🔴 Google Cloud Build Extension deactivated');
}

module.exports = {
    activate,
    deactivate
};