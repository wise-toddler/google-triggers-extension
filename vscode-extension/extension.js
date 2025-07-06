const vscode = require('vscode');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

function activate(context) {
    console.log('🚀 Google Cloud Build Extension v2.0 - TreeView Approach');
    
    // Create tree data provider
    const treeDataProvider = new GoogleCloudBuildTreeDataProvider(context);
    
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
        
        vscode.commands.registerCommand('googleCloudBuild.selectBranch', async () => {
            console.log('🌿 Selecting branch');
            await treeDataProvider.selectBranch();
        }),
        
        vscode.commands.registerCommand('googleCloudBuild.selectProject', async () => {
            console.log('📂 Selecting project');
            await treeDataProvider.selectProject();
        }),
        
        vscode.commands.registerCommand('googleCloudBuild.triggerBuild', async (trigger) => {
            console.log('⚡ Triggering build for:', trigger.label);
            await treeDataProvider.triggerBuild(trigger);
        }),
        
        vscode.commands.registerCommand('googleCloudBuild.addSubstitution', async (trigger) => {
            console.log('➕ Adding substitution for:', trigger.label);
            await treeDataProvider.addSubstitution(trigger);
        }),
        
        vscode.commands.registerCommand('googleCloudBuild.editSubstitution', async (substitution) => {
            console.log('✏️ Editing substitution:', substitution.label);
            await treeDataProvider.editSubstitution(substitution);
        }),
        
        vscode.commands.registerCommand('googleCloudBuild.deleteSubstitution', async (substitution) => {
            console.log('🗑️ Deleting substitution:', substitution.label);
            await treeDataProvider.deleteSubstitution(substitution);
        }),
        
        vscode.commands.registerCommand('googleCloudBuild.openWebPanel', async () => {
            console.log('🌐 Opening web panel');
            await openWebPanel(context);
        }),
    ];
    
    // Add all commands to subscriptions
    commands.forEach(command => context.subscriptions.push(command));
    
    console.log('✅ Google Cloud Build Extension activated successfully');
    vscode.window.showInformationMessage('Google Cloud Build Extension activated! 🚀');
}

class GoogleCloudBuildTreeDataProvider {
    constructor(context) {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.context = context; // Store context for state management
        
        // Load saved state
        this.authStatus = null;
        this.selectedProject = context.globalState.get('selectedProject', null);
        this.selectedRegion = context.globalState.get('selectedRegion', 'global');
        this.selectedBranch = context.globalState.get('selectedBranch', 'main');
        this.triggers = [];
        this.projects = [];
        this.substitutions = context.globalState.get('substitutions', {}); // Persistent substitutions
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
        
        if (element.contextValue === 'trigger') {
            return this.getSubstitutionItems(element.triggerId);
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

        // Selected branch
        const branchItem = new vscode.TreeItem(
            `🌿 Branch: ${this.selectedBranch}`,
            vscode.TreeItemCollapsibleState.None
        );
        branchItem.contextValue = 'selectedBranch';
        branchItem.command = {
            command: 'googleCloudBuild.selectBranch',
            title: 'Select Branch'
        };
        items.push(branchItem);

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

    getSubstitutionItems(triggerId) {
        const items = [];
        
        // Add "Trigger Build" item at the top
        const triggerBuildItem = new vscode.TreeItem('▶️ Trigger Build', vscode.TreeItemCollapsibleState.None);
        triggerBuildItem.contextValue = 'triggerBuild';
        triggerBuildItem.triggerId = triggerId;
        triggerBuildItem.command = {
            command: 'googleCloudBuild.triggerBuild',
            title: 'Trigger Build',
            arguments: [this.triggers.find(t => t.id === triggerId)]
        };
        triggerBuildItem.iconPath = new vscode.ThemeIcon('play');
        items.push(triggerBuildItem);
        
        // Get substitutions for this trigger (merge defaults + user-defined)
        const trigger = this.triggers.find(t => t.id === triggerId);
        const defaultSubstitutions = trigger?.substitutions || {};
        const userSubstitutions = this.substitutions[triggerId] || {};
        const allSubstitutions = { ...defaultSubstitutions, ...userSubstitutions };
        
        // Add substitution items
        Object.entries(allSubstitutions).forEach(([key, value]) => {
            const isDefault = defaultSubstitutions.hasOwnProperty(key);
            const isModified = userSubstitutions.hasOwnProperty(key);
            
            const item = new vscode.TreeItem(`${key} = ${value}`, vscode.TreeItemCollapsibleState.None);
            item.contextValue = 'substitution';
            item.triggerId = triggerId;
            item.substitutionKey = key;
            item.substitutionValue = value;
            item.isDefault = isDefault;
            
            if (isDefault && !isModified) {
                item.description = '(default)';
                item.iconPath = new vscode.ThemeIcon('symbol-constant');
            } else if (isModified) {
                item.description = isDefault ? '(modified)' : '(custom)';
                item.iconPath = new vscode.ThemeIcon('edit');
            } else {
                item.iconPath = new vscode.ThemeIcon('symbol-variable');
            }
            
            item.tooltip = `${key} = ${value}\nType: ${isDefault ? 'Default' : 'Custom'}${isModified ? ' (Modified)' : ''}`;
            items.push(item);
        });
        
        // Add "Add Substitution" item at the bottom
        const addItem = new vscode.TreeItem('➕ Add Substitution', vscode.TreeItemCollapsibleState.None);
        addItem.contextValue = 'addSubstitution';
        addItem.triggerId = triggerId;
        addItem.command = {
            command: 'googleCloudBuild.addSubstitution',
            title: 'Add Substitution',
            arguments: [{ triggerId: triggerId }]
        };
        addItem.iconPath = new vscode.ThemeIcon('add');
        items.push(addItem);
        
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
            const substitutions = this.substitutions[trigger.id] || {};
            const subsCount = Object.keys(substitutions).length;
            
            const item = new vscode.TreeItem(trigger.name, vscode.TreeItemCollapsibleState.Collapsed);
            item.description = subsCount > 0 ? 
                `${trigger.id} • ${subsCount} vars` : 
                trigger.id;
            item.contextValue = 'trigger';
            item.triggerId = trigger.id; // Store trigger ID for substitutions
            item.iconPath = new vscode.ThemeIcon(subsCount > 0 ? 'settings-gear' : 'play');
            item.tooltip = `Trigger: ${trigger.name}\nID: ${trigger.id}\nSubstitutions: ${subsCount}`;
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

    async selectBranch() {
        const commonBranches = [
            { label: 'main', description: 'Main branch' },
            { label: 'master', description: 'Master branch' },
            { label: 'develop', description: 'Development branch' },
            { label: 'staging', description: 'Staging branch' },
            { label: 'production', description: 'Production branch' },
            { label: '$(edit) Custom...', description: 'Enter custom branch name' }
        ];

        const selected = await vscode.window.showQuickPick(commonBranches, {
            placeHolder: `Current branch: ${this.selectedBranch}. Select a new branch:`
        });

        if (selected) {
            if (selected.label.includes('Custom...')) {
                const customBranch = await vscode.window.showInputBox({
                    prompt: 'Enter branch name',
                    value: this.selectedBranch,
                    placeHolder: 'feature/my-branch'
                });
                
                if (customBranch) {
                    this.selectedBranch = customBranch;
                    this.saveState();
                    vscode.window.showInformationMessage(`Selected branch: ${customBranch}`);
                    this.refresh();
                }
            } else {
                this.selectedBranch = selected.label;
                this.saveState();
                vscode.window.showInformationMessage(`Selected branch: ${selected.label}`);
                this.refresh();
            }
        }
    }

    saveState() {
        // Save current state to persistent storage
        this.context.globalState.update('selectedProject', this.selectedProject);
        this.context.globalState.update('selectedRegion', this.selectedRegion);
        this.context.globalState.update('selectedBranch', this.selectedBranch);
        this.context.globalState.update('substitutions', this.substitutions);
        console.log('💾 State saved to persistent storage');
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
            this.saveState();
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
            this.saveState();
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
                region: this.selectedRegion,
                substitutions: t.substitutions || {} // Store default substitutions
            }));
            
            const regionName = this.regions.find(r => r.id === this.selectedRegion)?.name || this.selectedRegion;
            vscode.window.showInformationMessage(`✅ Loaded ${this.triggers.length} build triggers from ${regionName}`);
            
        } catch (error) {
            console.error('Failed to load triggers:', error);
            vscode.window.showErrorMessage(`Failed to load triggers: ${error.message}`);
            this.triggers = []; // Clear triggers on error
        }
    }

    async configureSubstitutions(trigger) {
        if (!trigger) return;

        const currentSubs = this.substitutions[trigger.id] || {};
        const currentSubsText = Object.entries(currentSubs)
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');

        const input = await vscode.window.showInputBox({
            title: `Configure Substitutions for "${trigger.name}"`,
            prompt: 'Enter substitutions as KEY=VALUE pairs (one per line)',
            value: currentSubsText,
            placeHolder: 'Example:\n_BRANCH=main\n_ENV=production\n_VERSION=1.0.0',
            ignoreFocusOut: true,
            validateInput: (value) => {
                if (!value.trim()) return null; // Empty is OK
                
                const lines = value.split('\n').filter(line => line.trim());
                for (const line of lines) {
                    if (!line.includes('=')) {
                        return `Invalid format: "${line}". Use KEY=VALUE format.`;
                    }
                    const [key] = line.split('=');
                    if (!key.trim()) {
                        return `Invalid key in: "${line}". Key cannot be empty.`;
                    }
                }
                return null;
            }
        });

        if (input !== undefined) {
            // Parse substitutions
            const newSubs = {};
            if (input.trim()) {
                const lines = input.split('\n').filter(line => line.trim());
                for (const line of lines) {
                    const [key, ...valueParts] = line.split('=');
                    const value = valueParts.join('='); // Join back in case value contains =
                    if (key.trim() && value !== undefined) {
                        newSubs[key.trim()] = value;
                    }
                }
            }

            this.substitutions[trigger.id] = newSubs;
            
            const count = Object.keys(newSubs).length;
            if (count > 0) {
                const subsPreview = Object.entries(newSubs)
                    .map(([k, v]) => `${k}=${v}`)
                    .join(', ');
                vscode.window.showInformationMessage(
                    `✅ Configured ${count} substitution(s) for "${trigger.name}": ${subsPreview}`
                );
            } else {
                vscode.window.showInformationMessage(`🗑️ Cleared substitutions for "${trigger.name}"`);
            }
            
            this.refresh();
        }
    }

    async addSubstitution(trigger) {
        const triggerId = trigger.triggerId || trigger.id;
        if (!triggerId) return;

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

        // Add to substitutions
        if (!this.substitutions[triggerId]) {
            this.substitutions[triggerId] = {};
        }
        this.substitutions[triggerId][key] = value;

        this.saveState();
        vscode.window.showInformationMessage(`✅ Added substitution: ${key} = ${value}`);
        this.refresh();
    }

    async editSubstitution(substitution) {
        const triggerId = substitution.triggerId;
        const key = substitution.substitutionKey;
        const currentValue = substitution.substitutionValue;

        const newValue = await vscode.window.showInputBox({
            prompt: `Edit value for "${key}"`,
            value: currentValue,
            validateInput: (value) => {
                if (value === undefined || value === null) return 'Value cannot be empty';
                return null;
            }
        });

        if (newValue === undefined || newValue === currentValue) return;

        // Update substitution
        if (!this.substitutions[triggerId]) {
            this.substitutions[triggerId] = {};
        }
        this.substitutions[triggerId][key] = newValue;

        this.saveState();
        vscode.window.showInformationMessage(`✅ Updated ${key} = ${newValue}`);
        this.refresh();
    }

    async deleteSubstitution(substitution) {
        const triggerId = substitution.triggerId;
        const key = substitution.substitutionKey;
        const isDefault = substitution.isDefault;

        if (isDefault) {
            // For default substitutions, we can't delete them, but we can reset to default
            const confirm = await vscode.window.showQuickPick(['Yes', 'No'], {
                placeHolder: `Reset "${key}" to default value?`
            });
            
            if (confirm === 'Yes') {
                // Remove from user substitutions to reset to default
                if (this.substitutions[triggerId]) {
                    delete this.substitutions[triggerId][key];
                    if (Object.keys(this.substitutions[triggerId]).length === 0) {
                        delete this.substitutions[triggerId];
                    }
                }
                vscode.window.showInformationMessage(`✅ Reset "${key}" to default value`);
            }
        } else {
            // For custom substitutions, we can delete them
            const confirm = await vscode.window.showQuickPick(['Yes', 'No'], {
                placeHolder: `Delete substitution "${key}"?`
            });
            
            if (confirm === 'Yes') {
                if (this.substitutions[triggerId]) {
                    delete this.substitutions[triggerId][key];
                    if (Object.keys(this.substitutions[triggerId]).length === 0) {
                        delete this.substitutions[triggerId];
                    }
                }
                vscode.window.showInformationMessage(`✅ Deleted substitution "${key}"`);
            }
        }

        this.refresh();
    }

    async triggerBuild(trigger) {
        if (!this.selectedProject || !trigger) return;

        const regionName = this.regions.find(r => r.id === this.selectedRegion)?.name || this.selectedRegion;
        const substitutions = this.substitutions[trigger.id] || {};
        const subsCount = Object.keys(substitutions).length;
        
        let confirmMessage = `Trigger build for "${trigger.name}" in ${regionName}?`;
        confirmMessage += `\nBranch: ${this.selectedBranch}`;
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

        try {
            vscode.window.showInformationMessage(`Triggering build: ${trigger.name} in ${regionName}...`);
            
            let command = `gcloud builds triggers run ${trigger.id} --project=${this.selectedProject} --format=json`;
            
            // Add region parameter if not global
            if (this.selectedRegion && this.selectedRegion !== 'global') {
                command += ` --region=${this.selectedRegion}`;
            }
            
            // Add substitutions
            for (const [key, value] of Object.entries(substitutions)) {
                command += ` --substitutions=${key}=${value}`;
            }
            
            console.log('🚀 Executing build command:', command);
            
            const { stdout } = await execAsync(command);
            const result = JSON.parse(stdout);
            
            const buildId = result.name ? result.name.split('/').pop() : 'unknown';
            let successMessage = `✅ Build triggered successfully! Build ID: ${buildId} (${regionName})`;
            if (subsCount > 0) {
                successMessage += ` with ${subsCount} substitution(s)`;
            }
            vscode.window.showInformationMessage(successMessage);
            
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