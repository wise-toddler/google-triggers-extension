// State management for persistent storage
const { STORAGE_KEYS, DEFAULTS } = require('./constants');

class StateManager {
    constructor(context) {
        this.context = context;
    }

    // Load saved state from storage
    loadState() {
        return {
            selectedProject: this.context.globalState.get(STORAGE_KEYS.SELECTED_PROJECT, null),
            selectedRegion: this.context.globalState.get(STORAGE_KEYS.SELECTED_REGION, DEFAULTS.REGION),
            selectedBranch: this.context.globalState.get(STORAGE_KEYS.SELECTED_BRANCH, DEFAULTS.BRANCH),
            substitutions: this.context.globalState.get(STORAGE_KEYS.SUBSTITUTIONS, {}),
            pinnedTriggers: this.context.globalState.get(STORAGE_KEYS.PINNED_TRIGGERS, [])
        };
    }

    // Save current state to persistent storage
    async saveState(state) {
        await this.context.globalState.update(STORAGE_KEYS.SELECTED_PROJECT, state.selectedProject);
        await this.context.globalState.update(STORAGE_KEYS.SELECTED_REGION, state.selectedRegion);
        await this.context.globalState.update(STORAGE_KEYS.SELECTED_BRANCH, state.selectedBranch);
        await this.context.globalState.update(STORAGE_KEYS.SUBSTITUTIONS, state.substitutions);
        console.log('💾 State saved to persistent storage');
    }

    // Save individual state properties
    async saveProject(projectId) {
        await this.context.globalState.update(STORAGE_KEYS.SELECTED_PROJECT, projectId);
    }

    async saveRegion(regionId) {
        await this.context.globalState.update(STORAGE_KEYS.SELECTED_REGION, regionId);
    }

    async saveBranch(branchName) {
        await this.context.globalState.update(STORAGE_KEYS.SELECTED_BRANCH, branchName);
    }

    async saveSubstitutions(substitutions) {
        await this.context.globalState.update(STORAGE_KEYS.SUBSTITUTIONS, substitutions);
    }

    // Clear all saved state
    async clearState() {
        await this.context.globalState.update(STORAGE_KEYS.SELECTED_PROJECT, undefined);
        await this.context.globalState.update(STORAGE_KEYS.SELECTED_REGION, DEFAULTS.REGION);
        await this.context.globalState.update(STORAGE_KEYS.SELECTED_BRANCH, DEFAULTS.BRANCH);
        await this.context.globalState.update(STORAGE_KEYS.SUBSTITUTIONS, {});
        console.log('🗑️ State cleared');
    }
}

module.exports = StateManager;