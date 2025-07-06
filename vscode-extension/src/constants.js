// Constants and configuration for the extension

const REGIONS = [
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

const COMMON_BRANCHES = [
    { label: 'main', description: 'Main branch' },
    { label: 'master', description: 'Master branch' },
    { label: 'develop', description: 'Development branch' },
    { label: 'staging', description: 'Staging branch' },
    { label: 'production', description: 'Production branch' },
    { label: '$(edit) Custom...', description: 'Enter custom branch name' }
];

const STORAGE_KEYS = {
    SELECTED_PROJECT: 'selectedProject',
    SELECTED_REGION: 'selectedRegion',
    SELECTED_BRANCH: 'selectedBranch',
    SUBSTITUTIONS: 'substitutions'
};

const DEFAULTS = {
    REGION: 'global',
    BRANCH: 'main'
};

module.exports = {
    REGIONS,
    COMMON_BRANCHES,
    STORAGE_KEYS,
    DEFAULTS
};