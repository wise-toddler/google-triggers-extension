// Tree data provider for VSCode extension
const vscode = require('vscode');
const { REGIONS } = require('./constants');
const PinManager = require('./pinManager');

class GoogleCloudBuildTreeDataProvider {
    constructor(stateManager, gcloudService) {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        
        this.stateManager = stateManager;
        this.gcloudService = gcloudService;
        this.pinManager = new PinManager(stateManager);
        
        // Load saved state
        const state = this.stateManager.loadState();
        this.authStatus = null;
        this.selectedProject = state.selectedProject;
        this.selectedRegion = state.selectedRegion;
        this.selectedBranch = state.selectedBranch;
        this.substitutions = state.substitutions;
        
        this.triggers = [];
        this.projects = [];
    }

    refresh() {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element) {
        return element;
    }

    getChildren(element) {
        if (!element) {
            return this.getRootItems();
        }
        
        if (element.contextValue === 'projectsGroup') {
            return this.getProjectItems();
        }
        
        if (element.contextValue === 'triggersGroup') {
            return this.getTriggerGroups();
        }
        
        if (element.contextValue === 'pinnedTriggersGroup') {
            return this.getPinnedTriggerItems();
        }
        
        if (element.contextValue === 'unpinnedTriggersGroup') {
            return this.getUnpinnedTriggerItems();
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
        const regionName = REGIONS.find(r => r.id === this.selectedRegion)?.name || this.selectedRegion;
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
            const pinStats = this.pinManager.getPinStats(this.triggers);
            const triggersGroup = new vscode.TreeItem(
                `🎯 Build Triggers (${pinStats.total})`,
                vscode.TreeItemCollapsibleState.Expanded
            );
            triggersGroup.contextValue = 'triggersGroup';
            triggersGroup.tooltip = `Total: ${pinStats.total} | Pinned: ${pinStats.pinned} | Unpinned: ${pinStats.unpinned}`;
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
            const substitutions = this.substitutions[trigger.id] || {};
            const subsCount = Object.keys(substitutions).length;
            
            const item = new vscode.TreeItem(trigger.name, vscode.TreeItemCollapsibleState.Collapsed);
            item.description = subsCount > 0 ? 
                `${trigger.id} • ${subsCount} vars` : 
                trigger.id;
            item.contextValue = 'trigger';
            item.triggerId = trigger.id;
            item.iconPath = new vscode.ThemeIcon(subsCount > 0 ? 'settings-gear' : 'play');
            item.tooltip = `Trigger: ${trigger.name}\nID: ${trigger.id}\nSubstitutions: ${subsCount}`;
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
        
        // Get substitutions for this trigger
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

    // Update methods
    setAuthStatus(status) {
        this.authStatus = status;
        this.refresh();
    }

    setProjects(projects) {
        this.projects = projects;
        this.refresh();
    }

    setTriggers(triggers) {
        this.triggers = triggers;
        this.refresh();
    }

    async setSelectedProject(projectId) {
        this.selectedProject = projectId;
        await this.stateManager.saveProject(projectId);
        this.refresh();
    }

    async setSelectedRegion(regionId) {
        this.selectedRegion = regionId;
        await this.stateManager.saveRegion(regionId);
        this.refresh();
    }

    async setSelectedBranch(branchName) {
        this.selectedBranch = branchName;
        await this.stateManager.saveBranch(branchName);
        this.refresh();
    }

    async updateSubstitutions(triggerId, substitutions) {
        this.substitutions[triggerId] = substitutions;
        await this.stateManager.saveSubstitutions(this.substitutions);
        this.refresh();
    }

    async addSubstitution(triggerId, key, value) {
        if (!this.substitutions[triggerId]) {
            this.substitutions[triggerId] = {};
        }
        this.substitutions[triggerId][key] = value;
        await this.stateManager.saveSubstitutions(this.substitutions);
        this.refresh();
    }

    async removeSubstitution(triggerId, key) {
        if (this.substitutions[triggerId]) {
            delete this.substitutions[triggerId][key];
            if (Object.keys(this.substitutions[triggerId]).length === 0) {
                delete this.substitutions[triggerId];
            }
            await this.stateManager.saveSubstitutions(this.substitutions);
            this.refresh();
        }
    }
}

module.exports = GoogleCloudBuildTreeDataProvider;