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
        this.recentBuilds = [];
        this.activeBuilds = new Map(); // Track builds being monitored
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

    getTriggerGroups() {
        const items = [];
        const pinStats = this.pinManager.getPinStats(this.triggers);
        
        // Pinned triggers group (only show if there are pinned triggers)
        if (pinStats.pinned > 0) {
            const pinnedGroup = new vscode.TreeItem(
                `📌 Pinned Triggers (${pinStats.pinned})`,
                vscode.TreeItemCollapsibleState.Expanded
            );
            pinnedGroup.contextValue = 'pinnedTriggersGroup';
            pinnedGroup.iconPath = new vscode.ThemeIcon('pinned');
            items.push(pinnedGroup);
        }
        
        // Regular triggers group (only show if there are unpinned triggers)
        if (pinStats.unpinned > 0) {
            const unpinnedGroup = new vscode.TreeItem(
                `🎯 Other Triggers (${pinStats.unpinned})`,
                vscode.TreeItemCollapsibleState.Expanded
            );
            unpinnedGroup.contextValue = 'unpinnedTriggersGroup';
            unpinnedGroup.iconPath = new vscode.ThemeIcon('list-unordered');
            items.push(unpinnedGroup);
        }
        
        // If no triggers at all, show empty message
        if (this.triggers.length === 0) {
            const emptyItem = new vscode.TreeItem(
                '📭 No triggers found',
                vscode.TreeItemCollapsibleState.None
            );
            emptyItem.contextValue = 'emptyTriggers';
            emptyItem.iconPath = new vscode.ThemeIcon('inbox');
            items.push(emptyItem);
        }
        
        return items;
    }

    getPinnedTriggerItems() {
        const pinnedTriggers = this.pinManager.getPinnedTriggers(this.triggers);
        return this.createTriggerItems(pinnedTriggers, true);
    }

    getUnpinnedTriggerItems() {
        const unpinnedTriggers = this.pinManager.getUnpinnedTriggers(this.triggers);
        return this.createTriggerItems(unpinnedTriggers, false);
    }

    createTriggerItems(triggers, isPinnedGroup) {
        return triggers.map(trigger => {
            const substitutions = this.substitutions[trigger.id] || {};
            const subsCount = Object.keys(substitutions).length;
            const isPinned = this.pinManager.isPinned(trigger.id);
            
            const item = new vscode.TreeItem(trigger.name, vscode.TreeItemCollapsibleState.Collapsed);
            
            // Enhanced description with pin status
            let description = trigger.id;
            if (subsCount > 0) {
                description += ` • ${subsCount} vars`;
            }
            if (isPinned && !isPinnedGroup) {
                description += ' • 📌';
            }
            item.description = description;
            
            item.contextValue = 'trigger';
            item.triggerId = trigger.id;
            item.isPinned = isPinned;
            
            // Enhanced icon based on pin status and substitutions
            if (isPinned) {
                item.iconPath = new vscode.ThemeIcon(subsCount > 0 ? 'pinned-dirty' : 'pinned');
            } else {
                item.iconPath = new vscode.ThemeIcon(subsCount > 0 ? 'settings-gear' : 'play');
            }
            
            item.tooltip = `Trigger: ${trigger.name}\nID: ${trigger.id}\nSubstitutions: ${subsCount}\nStatus: ${isPinned ? 'Pinned 📌' : 'Not Pinned'}`;
            
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

    // Pin management methods
    async toggleTriggerPin(triggerId) {
        const isPinned = await this.pinManager.togglePin(triggerId);
        this.refresh();
        return isPinned;
    }

    async clearAllPins() {
        await this.pinManager.clearAllPins();
        this.refresh();
    }

    isPinned(triggerId) {
        return this.pinManager.isPinned(triggerId);
    }

    // Build status tracking methods
    async setRecentBuilds(builds) {
        this.recentBuilds = builds || [];
        this.refresh();
    }

    // Start monitoring a build
    startBuildMonitoring(buildId, projectId, region, onStatusUpdate) {
        if (this.activeBuilds.has(buildId)) {
            return; // Already monitoring
        }

        console.log(`🔍 Starting monitoring for build: ${buildId}`);
        
        const monitorPromise = this.gcloudService.monitorBuild(
            buildId, 
            projectId, 
            region, 
            (status) => {
                console.log(`📊 Build ${buildId} status: ${status.status}`);
                onStatusUpdate(status);
                this.refresh(); // Update tree view
            }
        );

        this.activeBuilds.set(buildId, {
            promise: monitorPromise,
            projectId,
            region,
            startTime: new Date()
        });

        // Clean up after monitoring completes
        monitorPromise.finally(() => {
            this.activeBuilds.delete(buildId);
            console.log(`✅ Stopped monitoring build: ${buildId}`);
        });

        return monitorPromise;
    }

    // Stop monitoring a specific build
    stopBuildMonitoring(buildId) {
        if (this.activeBuilds.has(buildId)) {
            this.activeBuilds.delete(buildId);
            console.log(`🛑 Manually stopped monitoring build: ${buildId}`);
        }
    }

    // Get builds section for tree view
    getBuildsItems() {
        const items = [];
        
        // Active builds section
        if (this.activeBuilds.size > 0) {
            const activeBuildsItem = new vscode.TreeItem(
                `🔄 Active Builds (${this.activeBuilds.size})`,
                vscode.TreeItemCollapsibleState.Expanded
            );
            activeBuildsItem.contextValue = 'activeBuildsGroup';
            items.push(activeBuildsItem);
        }

        // Recent builds section
        if (this.recentBuilds.length > 0) {
            const recentBuildsItem = new vscode.TreeItem(
                `📊 Recent Builds (${this.recentBuilds.length})`,
                vscode.TreeItemCollapsibleState.Collapsed
            );
            recentBuildsItem.contextValue = 'recentBuildsGroup';
            items.push(recentBuildsItem);
        }

        return items;
    }

    // Get active build items
    getActiveBuildItems() {
        const items = [];
        
        for (const [buildId, buildInfo] of this.activeBuilds) {
            const duration = Math.floor((new Date() - buildInfo.startTime) / 1000);
            const item = new vscode.TreeItem(
                `🔄 ${buildId} (${duration}s)`,
                vscode.TreeItemCollapsibleState.None
            );
            item.contextValue = 'activeBuild';
            item.buildId = buildId;
            item.tooltip = `Build ID: ${buildId}\nProject: ${buildInfo.projectId}\nRegion: ${buildInfo.region}\nRunning for: ${duration}s`;
            items.push(item);
        }
        
        return items;
    }

    // Get recent build items
    getRecentBuildItems() {
        return this.recentBuilds.slice(0, 10).map(build => {
            const statusIcon = this.getBuildStatusIcon(build.status);
            const item = new vscode.TreeItem(
                `${statusIcon} ${build.id} (${build.duration})`,
                vscode.TreeItemCollapsibleState.None
            );
            item.contextValue = 'recentBuild';
            item.buildId = build.id;
            item.buildStatus = build.status;
            item.tooltip = `Build: ${build.id}\nStatus: ${build.status}\nTrigger: ${build.triggerName}\nBranch: ${build.branch}\nCommit: ${build.sourceProvenanceHash}\nDuration: ${build.duration}`;
            
            // Add command to view logs
            item.command = {
                command: 'googleCloudBuild.viewBuildLogs',
                title: 'View Build Logs',
                arguments: [build]
            };
            
            return item;
        });
    }

    // Get build status icon
    getBuildStatusIcon(status) {
        switch (status) {
            case 'SUCCESS': return '✅';
            case 'FAILURE': return '❌';
            case 'WORKING': return '🔄';
            case 'QUEUED': return '⏳';
            case 'TIMEOUT': return '⏱️';
            case 'CANCELLED': return '🚫';
            default: return '❓';
        }
    }
}

module.exports = GoogleCloudBuildTreeDataProvider;