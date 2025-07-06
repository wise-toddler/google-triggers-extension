const vscode = require('vscode');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

function activate(context) {
    console.log('🚀 Google Cloud Build Extension v2.0 - TreeView Approach');
    
    // Create tree data provider
    const treeDataProvider = new GoogleCloudBuildTreeDataProvider();
    
    // Register tree data provider
    vscode.window.registerTreeDataProvider('googleCloudBuildTree', treeDataProvider);
    
    // Register commands
    const commands = [
        vscode.commands.registerCommand('googleCloudBuild.refresh', () => {
            console.log('🔄 Refreshing tree');
            treeDataProvider.refresh();
            vscode.window.showInformationMessage('Google Cloud Build refreshed');
        }),
        
        vscode.commands.registerCommand('googleCloudBuild.checkAuth', async () => {
            console.log('🔐 Checking authentication');
            await treeDataProvider.checkAuthStatus();
        }),
        
        vscode.commands.registerCommand('googleCloudBuild.selectRegion', async () => {
            console.log('🌍 Selecting region');
            await treeDataProvider.selectRegion();
        }),
        
        vscode.commands.registerCommand('googleCloudBuild.triggerBuild', async (trigger) => {
            console.log('⚡ Triggering build for:', trigger.label);
            await treeDataProvider.triggerBuild(trigger);
        }),
        
        vscode.commands.registerCommand('googleCloudBuild.openWebPanel', async () => {
            console.log('🌐 Opening web panel');
            await openWebPanel(context);
        })
    ];
    
    // Add all commands to subscriptions
    commands.forEach(command => context.subscriptions.push(command));
    
    console.log('✅ Google Cloud Build Extension activated successfully');
    vscode.window.showInformationMessage('Google Cloud Build Extension activated! 🚀');
}

class GoogleCloudBuildTreeDataProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.authStatus = null;
        this.selectedProject = null;
        this.selectedRegion = 'global';
        this.triggers = [];
        this.projects = [];
        this.regions = [
            { id: 'global', name: 'Global' },
            { id: 'us-central1', name: 'US Central 1 (Iowa)' },
            { id: 'us-east1', name: 'US East 1 (South Carolina)' },
            { id: 'us-east4', name: 'US East 4 (Northern Virginia)' },
            { id: 'us-west1', name: 'US West 1 (Oregon)' },
            { id: 'us-west2', name: 'US West 2 (Los Angeles)' },
            { id: 'us-west3', name: 'US West 3 (Salt Lake City)' },
            { id: 'us-west4', name: 'US West 4 (Las Vegas)' },
            { id: 'europe-west1', name: 'Europe West 1 (Belgium)' },
            { id: 'europe-west2', name: 'Europe West 2 (London)' },
            { id: 'europe-west3', name: 'Europe West 3 (Frankfurt)' },
            { id: 'europe-west4', name: 'Europe West 4 (Netherlands)' },
            { id: 'europe-west6', name: 'Europe West 6 (Zurich)' },
            { id: 'asia-east1', name: 'Asia East 1 (Taiwan)' },
            { id: 'asia-northeast1', name: 'Asia Northeast 1 (Tokyo)' },
            { id: 'asia-southeast1', name: 'Asia Southeast 1 (Singapore)' },
            { id: 'asia-south1', name: 'Asia South 1 (Mumbai)' },
            { id: 'australia-southeast1', name: 'Australia Southeast 1 (Sydney)' }
        ];
    }

    refresh() {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element) {
        return element;
    }

    getChildren(element) {
        if (!element) {
            // Root level
            return this.getRootItems();
        }
        
        if (element.contextValue === 'projectsGroup') {
            return this.getProjectItems();
        }
        
        if (element.contextValue === 'triggersGroup') {
            return this.getTriggerItems();
        }
        
        return [];
    }

    getRootItems() {
        const items = [];
        
        // Authentication status
        const authItem = new vscode.TreeItem(
            this.authStatus ? `✅ Authenticated: ${this.authStatus}` : '🔒 Not Authenticated',
            vscode.TreeItemCollapsibleState.None
        );
        authItem.contextValue = 'authStatus';
        authItem.command = {
            command: 'googleCloudBuild.checkAuth',
            title: 'Check Authentication'
        };
        items.push(authItem);

        // Selected project
        if (this.selectedProject) {
            const projectItem = new vscode.TreeItem(
                `📂 Project: ${this.selectedProject}`,
                vscode.TreeItemCollapsibleState.None
            );
            projectItem.contextValue = 'selectedProject';
            items.push(projectItem);
        } else {
            const selectProjectItem = new vscode.TreeItem(
                '📂 Select Project',
                vscode.TreeItemCollapsibleState.None
            );
            selectProjectItem.contextValue = 'selectProject';
            selectProjectItem.command = {
                command: 'googleCloudBuild.selectProject',
                title: 'Select Project'
            };
            items.push(selectProjectItem);
        }

        // Selected region
        const regionName = this.regions.find(r => r.id === this.selectedRegion)?.name || this.selectedRegion;
        const regionItem = new vscode.TreeItem(
            `🌍 Region: ${regionName}`,
            vscode.TreeItemCollapsibleState.None
        );
        regionItem.contextValue = 'selectedRegion';
        regionItem.command = {
            command: 'googleCloudBuild.selectRegion',
            title: 'Select Region'
        };
        items.push(regionItem);

        // Triggers group
        if (this.selectedProject) {
            const triggersGroup = new vscode.TreeItem(
                `🎯 Build Triggers (${this.triggers.length})`,
                vscode.TreeItemCollapsibleState.Expanded
            );
            triggersGroup.contextValue = 'triggersGroup';
            items.push(triggersGroup);
        }

        return items;
    }

    getProjectItems() {
        return this.projects.map(project => {
            const item = new vscode.TreeItem(project.name, vscode.TreeItemCollapsibleState.None);
            item.description = project.id;
            item.contextValue = 'project';
            return item;
        });
    }

    getTriggerItems() {
        return this.triggers.map(trigger => {
            const item = new vscode.TreeItem(trigger.name, vscode.TreeItemCollapsibleState.None);
            item.description = trigger.id;
            item.contextValue = 'trigger';
            item.command = {
                command: 'googleCloudBuild.triggerBuild',
                title: 'Trigger Build',
                arguments: [trigger]
            };
            item.iconPath = new vscode.ThemeIcon('play');
            return item;
        });
    }

    async checkAuthStatus() {
        try {
            vscode.window.showInformationMessage('Checking authentication...');
            const { stdout } = await execAsync('gcloud auth list --filter=status:ACTIVE --format=json');
            const accounts = JSON.parse(stdout);
            
            if (accounts && accounts.length > 0) {
                this.authStatus = accounts[0].account;
                vscode.window.showInformationMessage(`✅ Authenticated as: ${this.authStatus}`);
                await this.loadProjects();
            } else {
                this.authStatus = null;
                vscode.window.showWarningMessage('❌ Not authenticated. Run: gcloud auth application-default login');
            }
        } catch (error) {
            this.authStatus = null;
            vscode.window.showErrorMessage(`Authentication check failed: ${error.message}`);
        }
        
        this.refresh();
    }

    async loadProjects() {
        try {
            const { stdout } = await execAsync('gcloud projects list --format=json');
            this.projects = JSON.parse(stdout).map(p => ({
                id: p.projectId,
                name: p.name
            }));
            console.log(`✅ Loaded ${this.projects.length} projects`);
        } catch (error) {
            console.error('Failed to load projects:', error);
            vscode.window.showErrorMessage(`Failed to load projects: ${error.message}`);
        }
    }

    async selectRegion() {
        const regionItems = this.regions.map(r => ({
            label: r.name,
            description: r.id,
            region: r
        }));

        const selected = await vscode.window.showQuickPick(regionItems, {
            placeHolder: 'Select a Google Cloud region for build triggers'
        });

        if (selected) {
            this.selectedRegion = selected.region.id;
            vscode.window.showInformationMessage(`Selected region: ${selected.region.name}`);
            
            // Reload triggers for the new region if project is selected
            if (this.selectedProject) {
                await this.loadTriggers();
            }
            
            this.refresh();
        }
    }

    async selectProject() {
        if (!this.authStatus) {
            vscode.window.showWarningMessage('Please authenticate first');
            return;
        }

        if (this.projects.length === 0) {
            await this.loadProjects();
        }

        const projectItems = this.projects.map(p => ({
            label: p.name,
            description: p.id,
            project: p
        }));

        const selected = await vscode.window.showQuickPick(projectItems, {
            placeHolder: 'Select a Google Cloud project'
        });

        if (selected) {
            this.selectedProject = selected.project.id;
            vscode.window.showInformationMessage(`Selected project: ${selected.project.name}`);
            await this.loadTriggers();
            this.refresh();
        }
    }

    async loadTriggers() {
        if (!this.selectedProject) return;

        try {
            vscode.window.showInformationMessage(`Loading build triggers for ${this.selectedRegion}...`);
            
            let command = `gcloud builds triggers list --project=${this.selectedProject} --format=json`;
            
            // Add region parameter if not global
            if (this.selectedRegion && this.selectedRegion !== 'global') {
                command += ` --region=${this.selectedRegion}`;
            }
            
            console.log('🔧 Loading triggers with command:', command);
            
            const { stdout } = await execAsync(command);
            const triggersData = JSON.parse(stdout);
            
            this.triggers = triggersData.map(t => ({
                id: t.id,
                name: t.name,
                description: t.description || '',
                github_repo: t.github?.name || null,
                branch: t.github?.push?.branch || null,
                disabled: t.disabled || false,
                region: this.selectedRegion
            }));
            
            const regionName = this.regions.find(r => r.id === this.selectedRegion)?.name || this.selectedRegion;
            vscode.window.showInformationMessage(`✅ Loaded ${this.triggers.length} build triggers from ${regionName}`);
            
        } catch (error) {
            console.error('Failed to load triggers:', error);
            vscode.window.showErrorMessage(`Failed to load triggers: ${error.message}`);
            this.triggers = []; // Clear triggers on error
        }
    }

    async triggerBuild(trigger) {
        if (!this.selectedProject || !trigger) return;

        const confirm = await vscode.window.showQuickPick(['Yes', 'No'], {
            placeHolder: `Trigger build for "${trigger.name}"?`
        });

        if (confirm !== 'Yes') return;

        try {
            vscode.window.showInformationMessage(`Triggering build: ${trigger.name}...`);
            
            const command = `gcloud builds triggers run ${trigger.id} --project=${this.selectedProject} --format=json`;
            const { stdout } = await execAsync(command);
            const result = JSON.parse(stdout);
            
            const buildId = result.name ? result.name.split('/').pop() : 'unknown';
            vscode.window.showInformationMessage(`✅ Build triggered successfully! Build ID: ${buildId}`);
            
        } catch (error) {
            console.error('Failed to trigger build:', error);
            vscode.window.showErrorMessage(`Failed to trigger build: ${error.message}`);
        }
    }
}

async function openWebPanel(context) {
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

    // Set the webview's initial html content
    panel.webview.html = getWebviewContent();

    // Handle messages from the webview
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

function getWebviewContent() {
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
        .container {
            max-width: 800px;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .icon {
            font-size: 64px;
            margin-bottom: 20px;
        }
        h1 {
            color: var(--vscode-titleBar-activeForeground);
            margin-bottom: 10px;
        }
        .description {
            color: var(--vscode-descriptionForeground);
            margin-bottom: 30px;
        }
        .actions {
            display: flex;
            gap: 15px;
            justify-content: center;
            flex-wrap: wrap;
        }
        .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            text-decoration: none;
            display: inline-block;
        }
        .btn:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .btn-secondary {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        .section {
            margin: 30px 0;
            padding: 20px;
            background-color: var(--vscode-editorWidget-background);
            border-radius: 8px;
        }
        .feature {
            margin: 15px 0;
            padding: 10px 0;
        }
        .feature-title {
            font-weight: bold;
            margin-bottom: 5px;
        }
        .feature-desc {
            color: var(--vscode-descriptionForeground);
            font-size: 13px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="icon">☁️</div>
            <h1>Google Cloud Build Extension</h1>
            <div class="description">
                Manage your Google Cloud Build triggers directly from Cursor/VSCode
            </div>
        </div>

        <div class="actions">
            <button class="btn" onclick="openWebInterface()">
                🌐 Open Web Interface
            </button>
            <button class="btn btn-secondary" onclick="refreshTreeView()">
                🔄 Refresh Tree View
            </button>
        </div>

        <div class="section">
            <h2>🚀 Quick Start</h2>
            <div class="feature">
                <div class="feature-title">1. Authenticate</div>
                <div class="feature-desc">Run: gcloud auth application-default login</div>
            </div>
            <div class="feature">
                <div class="feature-title">2. Select Project</div>
                <div class="feature-desc">Use the tree view to select your Google Cloud project</div>
            </div>
            <div class="feature">
                <div class="feature-title">3. Trigger Builds</div>
                <div class="feature-desc">Click on any trigger in the tree view to start a build</div>
            </div>
        </div>

        <div class="section">
            <h2>✨ Features</h2>
            <div class="feature">
                <div class="feature-title">🔐 Authentication Status</div>
                <div class="feature-desc">Check your Google Cloud authentication status</div>
            </div>
            <div class="feature">
                <div class="feature-title">📂 Project Selection</div>
                <div class="feature-desc">Browse and select from your available projects</div>
            </div>
            <div class="feature">
                <div class="feature-title">🎯 Build Triggers</div>
                <div class="feature-desc">View and execute Cloud Build triggers</div>
            </div>
            <div class="feature">
                <div class="feature-title">🌐 Web Interface</div>
                <div class="feature-desc">Full-featured web interface for advanced features</div>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function openWebInterface() {
            vscode.postMessage({
                command: 'openInBrowser'
            });
        }

        function refreshTreeView() {
            vscode.postMessage({
                command: 'refresh'
            });
        }

        // Notify extension that webview is ready
        vscode.postMessage({ command: 'ready' });
    </script>
</body>
</html>`;
}

function deactivate() {
    console.log('🔴 Google Cloud Build Extension deactivated');
}

module.exports = {
    activate,
    deactivate
};