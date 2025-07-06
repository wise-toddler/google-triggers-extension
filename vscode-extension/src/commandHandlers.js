// Command handlers for the extension
const vscode = require('vscode');
const { REGIONS, COMMON_BRANCHES } = require('./constants');

class CommandHandlers {
    constructor(treeDataProvider, gcloudService) {
        this.treeDataProvider = treeDataProvider;
        this.gcloudService = gcloudService;
    }

    // Register all commands
    registerCommands(context) {
        const commands = [
            vscode.commands.registerCommand('googleCloudBuild.refresh', () => this.handleRefresh()),
            vscode.commands.registerCommand('googleCloudBuild.checkAuth', () => this.handleCheckAuth()),
            vscode.commands.registerCommand('googleCloudBuild.selectProject', () => this.handleSelectProject()),
            vscode.commands.registerCommand('googleCloudBuild.selectRegion', () => this.handleSelectRegion()),
            vscode.commands.registerCommand('googleCloudBuild.triggerBuild', (trigger) => this.handleTriggerBuild(trigger)),
            vscode.commands.registerCommand('googleCloudBuild.addSubstitution', (trigger) => this.handleAddSubstitution(trigger)),
            vscode.commands.registerCommand('googleCloudBuild.editSubstitution', (substitution) => this.handleEditSubstitution(substitution)),
            vscode.commands.registerCommand('googleCloudBuild.deleteSubstitution', (substitution) => this.handleDeleteSubstitution(substitution)),
            vscode.commands.registerCommand('googleCloudBuild.togglePin', (trigger) => this.handleTogglePin(trigger)),
            vscode.commands.registerCommand('googleCloudBuild.clearAllPins', () => this.handleClearAllPins()),
            vscode.commands.registerCommand('googleCloudBuild.openWebPanel', () => this.handleOpenWebPanel(context))
        ];

        commands.forEach(command => context.subscriptions.push(command));
        console.log('✅ All commands registered successfully');
    }

    async handleRefresh() {
        console.log('🔄 Refreshing tree');
        this.treeDataProvider.refresh();
        vscode.window.showInformationMessage('Google Cloud Build refreshed');
    }

    async handleCheckAuth() {
        try {
            console.log('🔐 Checking authentication');
            vscode.window.showInformationMessage('Checking authentication...');
            
            const authResult = await this.gcloudService.checkAuthStatus();
            
            if (authResult.authenticated) {
                this.treeDataProvider.setAuthStatus(authResult.account);
                vscode.window.showInformationMessage(`✅ Authenticated as: ${authResult.account}`);
                
                // Auto-load projects after authentication
                await this.loadProjects();
                
                // If project was previously selected, auto-load triggers
                if (this.treeDataProvider.selectedProject) {
                    console.log(`🔄 Auto-loading triggers for previously selected project: ${this.treeDataProvider.selectedProject}`);
                    await this.loadTriggers();
                }
                
            } else {
                this.treeDataProvider.setAuthStatus(null);
                this.treeDataProvider.setProjects([]);
                this.treeDataProvider.setTriggers([]);
                vscode.window.showWarningMessage('❌ Not authenticated. Run: gcloud auth application-default login');
            }
        } catch (error) {
            console.error('Authentication check failed:', error);
            this.treeDataProvider.setAuthStatus(null);
            this.treeDataProvider.setProjects([]);
            this.treeDataProvider.setTriggers([]);
            vscode.window.showErrorMessage(`Authentication check failed: ${error.message}`);
        }
    }

    async loadProjects() {
        try {
            const projects = await this.gcloudService.loadProjects();
            this.treeDataProvider.setProjects(projects);
            console.log(`✅ Loaded ${projects.length} projects`);
        } catch (error) {
            console.error('Failed to load projects:', error);
            vscode.window.showErrorMessage(`Failed to load projects: ${error.message}`);
        }
    }

    async handleSelectProject() {
        try {
            console.log('📂 Selecting project');
            
            if (!this.treeDataProvider.authStatus) {
                vscode.window.showWarningMessage('Please authenticate first');
                return;
            }

            if (this.treeDataProvider.projects.length === 0) {
                await this.loadProjects();
            }

            const projectItems = this.treeDataProvider.projects.map(p => ({
                label: p.name,
                description: p.id,
                project: p
            }));

            const selected = await vscode.window.showQuickPick(projectItems, {
                placeHolder: 'Select a Google Cloud project'
            });

            if (selected) {
                await this.treeDataProvider.setSelectedProject(selected.project.id);
                vscode.window.showInformationMessage(`Selected project: ${selected.project.name}`);
                await this.loadTriggers();
            }
        } catch (error) {
            console.error('Failed to select project:', error);
            vscode.window.showErrorMessage(`Failed to select project: ${error.message}`);
        }
    }

    async handleSelectRegion() {
        console.log('🌍 Selecting region');
        
        const regionItems = REGIONS.map(r => ({
            label: r.name,
            description: r.id,
            region: r
        }));

        const selected = await vscode.window.showQuickPick(regionItems, {
            placeHolder: 'Select a Google Cloud region for build triggers'
        });

        if (selected) {
            await this.treeDataProvider.setSelectedRegion(selected.region.id);
            vscode.window.showInformationMessage(`Selected region: ${selected.region.name}`);
            
            // Reload triggers for the new region if project is selected
            if (this.treeDataProvider.selectedProject) {
                await this.loadTriggers();
            }
        }
    }

    async handleSelectBranch() {
        console.log('🌿 Selecting branch');
        
        const selected = await vscode.window.showQuickPick(COMMON_BRANCHES, {
            placeHolder: `Current branch: ${this.treeDataProvider.selectedBranch}. Select a new branch:`
        });

        if (selected) {
            if (selected.label.includes('Custom...')) {
                const customBranch = await vscode.window.showInputBox({
                    prompt: 'Enter branch name',
                    value: this.treeDataProvider.selectedBranch,
                    placeHolder: 'feature/my-branch'
                });
                
                if (customBranch) {
                    await this.treeDataProvider.setSelectedBranch(customBranch);
                    vscode.window.showInformationMessage(`Selected branch: ${customBranch}`);
                }
            } else {
                await this.treeDataProvider.setSelectedBranch(selected.label);
                vscode.window.showInformationMessage(`Selected branch: ${selected.label}`);
            }
        }
    }

    async loadTriggers() {
        if (!this.treeDataProvider.selectedProject) return;

        try {
            const regionName = REGIONS.find(r => r.id === this.treeDataProvider.selectedRegion)?.name || this.treeDataProvider.selectedRegion;
            vscode.window.showInformationMessage(`Loading build triggers for ${regionName}...`);
            
            const triggers = await this.gcloudService.loadTriggers(
                this.treeDataProvider.selectedProject,
                this.treeDataProvider.selectedRegion
            );
            
            this.treeDataProvider.setTriggers(triggers);
            vscode.window.showInformationMessage(`✅ Loaded ${triggers.length} build triggers from ${regionName}`);
            
        } catch (error) {
            console.error('Failed to load triggers:', error);
            vscode.window.showErrorMessage(`Failed to load triggers: ${error.message}`);
            this.treeDataProvider.setTriggers([]);
        }
    }

    async handleTriggerBuild(trigger) {
        if (!this.treeDataProvider.selectedProject || !trigger) return;

        try {
            // Step 1: Ask for branch selection when triggering build
            const branchInput = await vscode.window.showInputBox({
                prompt: `Enter branch name for "${trigger.name}"`,
                value: this.treeDataProvider.selectedBranch || 'main',
                placeHolder: 'main, develop, feature/my-branch...',
                validateInput: (value) => {
                    if (!value || !value.trim()) {
                        return 'Branch name cannot be empty';
                    }
                    return null;
                }
            });

            if (!branchInput) return; // User cancelled

            const branchName = branchInput.trim();
            const regionName = REGIONS.find(r => r.id === this.treeDataProvider.selectedRegion)?.name || this.treeDataProvider.selectedRegion;
            const substitutions = this.treeDataProvider.substitutions[trigger.id] || {};
            const subsCount = Object.keys(substitutions).length;
            
            let confirmMessage = `Trigger build for "${trigger.name}"?`;
            confirmMessage += `\nBranch: ${branchName}`;
            confirmMessage += `\nRegion: ${regionName}`;
            if (subsCount > 0) {
                const subsPreview = Object.entries(substitutions)
                    .map(([k, v]) => `${k}=${v}`)
                    .join(', ');
                confirmMessage += `\nSubstitutions (${subsCount}): ${subsPreview}`;
            }

            const confirm = await vscode.window.showQuickPick(['Yes', 'No'], {
                placeHolder: confirmMessage
            });

            if (confirm !== 'Yes') return;

            vscode.window.showInformationMessage(`Triggering build: ${trigger.name} (${branchName}) in ${regionName}...`);
            
            const result = await this.gcloudService.triggerBuild(
                trigger.id,
                this.treeDataProvider.selectedProject,
                this.treeDataProvider.selectedRegion,
                branchName, // Use the branch entered by user
                substitutions
            );
            
            let successMessage = `✅ Build triggered successfully! Build ID: ${result.buildId}`;
            successMessage += `\nBranch: ${branchName} | Region: ${regionName}`;
            if (subsCount > 0) {
                successMessage += ` | ${subsCount} substitution(s)`;
            }
            vscode.window.showInformationMessage(successMessage);
            
        } catch (error) {
            console.error('Failed to trigger build:', error);
            vscode.window.showErrorMessage(`Failed to trigger build: ${error.message}`);
        }
    }

    async handleAddSubstitution(trigger) {
        const triggerId = trigger.triggerId || trigger.id;
        if (!triggerId) return;

        try {
            const key = await vscode.window.showInputBox({
                prompt: 'Enter substitution key (e.g., _ENV, _VERSION)',
                placeHolder: '_MY_VAR',
                validateInput: (value) => {
                    if (!value.trim()) return 'Key cannot be empty';
                    if (value.includes('=')) return 'Key cannot contain = symbol';
                    return null;
                }
            });

            if (!key) return;

            const value = await vscode.window.showInputBox({
                prompt: `Enter value for "${key}"`,
                placeHolder: 'production',
                validateInput: (value) => {
                    if (value === undefined || value === null) return 'Value cannot be empty';
                    return null;
                }
            });

            if (value === undefined) return;

            await this.treeDataProvider.addSubstitution(triggerId, key, value);
            vscode.window.showInformationMessage(`✅ Added substitution: ${key} = ${value}`);
            
        } catch (error) {
            console.error('Failed to add substitution:', error);
            vscode.window.showErrorMessage(`Failed to add substitution: ${error.message}`);
        }
    }

    async handleEditSubstitution(substitution) {
        try {
            const triggerId = substitution.triggerId;
            const key = substitution.substitutionKey;
            const currentValue = substitution.substitutionValue;

            const newValue = await vscode.window.showInputBox({
                prompt: `Edit value for "${key}"`,
                value: currentValue,
                placeHolder: 'Enter new value...',
                validateInput: (value) => {
                    if (value === undefined || value === null) return 'Value cannot be empty';
                    return null;
                }
            });

            if (newValue === undefined || newValue === currentValue) return;

            await this.treeDataProvider.addSubstitution(triggerId, key, newValue);
            vscode.window.showInformationMessage(`✅ Updated ${key} = ${newValue}`);
            
        } catch (error) {
            console.error('Failed to edit substitution:', error);
            vscode.window.showErrorMessage(`Failed to edit substitution: ${error.message}`);
        }
    }

    async handleDeleteSubstitution(substitution) {
        try {
            const triggerId = substitution.triggerId;
            const key = substitution.substitutionKey;
            const isDefault = substitution.isDefault;

            if (isDefault) {
                const confirm = await vscode.window.showQuickPick(['Yes', 'No'], {
                    placeHolder: `Reset "${key}" to default value?`
                });
                
                if (confirm === 'Yes') {
                    await this.treeDataProvider.removeSubstitution(triggerId, key);
                    vscode.window.showInformationMessage(`✅ Reset "${key}" to default value`);
                }
            } else {
                const confirm = await vscode.window.showQuickPick(['Yes', 'No'], {
                    placeHolder: `Delete substitution "${key}"?`
                });
                
                if (confirm === 'Yes') {
                    await this.treeDataProvider.removeSubstitution(triggerId, key);
                    vscode.window.showInformationMessage(`✅ Deleted substitution "${key}"`);
                }
            }
        } catch (error) {
            console.error('Failed to delete substitution:', error);
            vscode.window.showErrorMessage(`Failed to delete substitution: ${error.message}`);
        }
    }

    async handleTogglePin(trigger) {
        try {
            const triggerId = trigger.triggerId || trigger.id;
            if (!triggerId) return;

            const isPinned = await this.treeDataProvider.toggleTriggerPin(triggerId);
            const triggerName = trigger.label || trigger.name || triggerId;
            
            if (isPinned) {
                vscode.window.showInformationMessage(`📌 Pinned trigger: ${triggerName}`);
            } else {
                vscode.window.showInformationMessage(`📌 Unpinned trigger: ${triggerName}`);
            }
            
        } catch (error) {
            console.error('Failed to toggle pin:', error);
            vscode.window.showErrorMessage(`Failed to toggle pin: ${error.message}`);
        }
    }

    async handleClearAllPins() {
        try {
            const confirm = await vscode.window.showQuickPick(['Yes', 'No'], {
                placeHolder: 'Clear all pinned triggers? This will unpin all currently pinned triggers.'
            });
            
            if (confirm === 'Yes') {
                await this.treeDataProvider.clearAllPins();
                vscode.window.showInformationMessage('📌 Cleared all pinned triggers');
            }
            
        } catch (error) {
            console.error('Failed to clear pins:', error);
            vscode.window.showErrorMessage(`Failed to clear pins: ${error.message}`);
        }
    }

    async handleOpenWebPanel(context) {
        // Create and show a webview panel
        const panel = vscode.window.createWebviewPanel(
            'googleCloudBuildPanel',
            'Google Cloud Build',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        panel.webview.html = this.getWebviewContent();

        panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'ready':
                        console.log('Webview ready');
                        break;
                    case 'openInBrowser':
                        vscode.env.openExternal(vscode.Uri.parse('http://localhost:3000'));
                        break;
                }
            },
            undefined,
            context.subscriptions
        );
    }



    getWebviewContent() {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Google Cloud Build</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            margin: 0;
        }
        .container { max-width: 800px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 30px; }
        .icon { font-size: 64px; margin-bottom: 20px; }
        h1 { color: var(--vscode-titleBar-activeForeground); margin-bottom: 10px; }
        .description { color: var(--vscode-descriptionForeground); margin-bottom: 30px; }
        .actions { display: flex; gap: 15px; justify-content: center; flex-wrap: wrap; }
        .btn {
            padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer;
            font-size: 14px; background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground); text-decoration: none; display: inline-block;
        }
        .btn:hover { background-color: var(--vscode-button-hoverBackground); }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="icon">☁️</div>
            <h1>Google Cloud Build Extension</h1>
            <div class="description">Manage your Google Cloud Build triggers directly from Cursor/VSCode</div>
        </div>
        <div class="actions">
            <button class="btn" onclick="openWebInterface()">🌐 Open Web Interface</button>
            <button class="btn" onclick="refreshTreeView()">🔄 Refresh Tree View</button>
        </div>
    </div>
    <script>
        const vscode = acquireVsCodeApi();
        function openWebInterface() {
            vscode.postMessage({ command: 'openInBrowser' });
        }
        function refreshTreeView() {
            vscode.postMessage({ command: 'refresh' });
        }
        vscode.postMessage({ command: 'ready' });
    </script>
</body>
</html>`;
    }
}

module.exports = CommandHandlers;