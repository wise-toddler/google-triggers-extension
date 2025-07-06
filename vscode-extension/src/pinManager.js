// Pin Manager - Handle trigger pinning functionality
class PinManager {
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.pinnedTriggers = new Set();
        this.loadPinnedTriggers();
    }

    // Load pinned triggers from storage
    loadPinnedTriggers() {
        const savedPins = this.stateManager.getPinnedTriggers();
        this.pinnedTriggers = new Set(savedPins);
    }

    // Save pinned triggers to storage
    async savePinnedTriggers() {
        const pinnedArray = Array.from(this.pinnedTriggers);
        await this.stateManager.savePinnedTriggers(pinnedArray);
    }

    // Check if trigger is pinned
    isPinned(triggerId) {
        return this.pinnedTriggers.has(triggerId);
    }

    // Pin a trigger
    async pinTrigger(triggerId) {
        this.pinnedTriggers.add(triggerId);
        await this.savePinnedTriggers();
        console.log(`📌 Pinned trigger: ${triggerId}`);
    }

    // Unpin a trigger
    async unpinTrigger(triggerId) {
        this.pinnedTriggers.delete(triggerId);
        await this.savePinnedTriggers();
        console.log(`📌 Unpinned trigger: ${triggerId}`);
    }

    // Toggle pin status
    async togglePin(triggerId) {
        if (this.isPinned(triggerId)) {
            await this.unpinTrigger(triggerId);
            return false; // Now unpinned
        } else {
            await this.pinTrigger(triggerId);
            return true; // Now pinned
        }
    }

    // Get pinned triggers from a list
    getPinnedTriggers(triggers) {
        return triggers.filter(trigger => this.isPinned(trigger.id));
    }

    // Get unpinned triggers from a list
    getUnpinnedTriggers(triggers) {
        return triggers.filter(trigger => !this.isPinned(trigger.id));
    }

    // Sort triggers with pinned first
    sortTriggersWithPinnedFirst(triggers) {
        const pinned = this.getPinnedTriggers(triggers);
        const unpinned = this.getUnpinnedTriggers(triggers);
        
        // Sort pinned by name
        pinned.sort((a, b) => a.name.localeCompare(b.name));
        
        // Sort unpinned by name
        unpinned.sort((a, b) => a.name.localeCompare(b.name));
        
        return [...pinned, ...unpinned];
    }

    // Get pin statistics
    getPinStats(triggers) {
        const totalTriggers = triggers.length;
        const pinnedCount = this.getPinnedTriggers(triggers).length;
        
        return {
            total: totalTriggers,
            pinned: pinnedCount,
            unpinned: totalTriggers - pinnedCount
        };
    }

    // Clear all pins
    async clearAllPins() {
        this.pinnedTriggers.clear();
        await this.savePinnedTriggers();
        console.log('📌 Cleared all pinned triggers');
    }
}

module.exports = PinManager;