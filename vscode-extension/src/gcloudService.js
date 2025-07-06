// Google Cloud service interactions
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class GCloudService {
    // Check authentication status
    async checkAuthStatus() {
        try {
            const { stdout } = await execAsync('gcloud auth list --filter=status:ACTIVE --format=json');
            const accounts = JSON.parse(stdout);
            
            if (accounts && accounts.length > 0) {
                return {
                    authenticated: true,
                    account: accounts[0].account
                };
            } else {
                return {
                    authenticated: false,
                    account: null
                };
            }
        } catch (error) {
            return {
                authenticated: false,
                account: null,
                error: error.message
            };
        }
    }

    // Load Google Cloud projects
    async loadProjects() {
        try {
            const { stdout } = await execAsync('gcloud projects list --format=json');
            const projectsData = JSON.parse(stdout);
            
            return projectsData.map(p => ({
                id: p.projectId,
                name: p.name,
                projectNumber: p.projectNumber
            }));
        } catch (error) {
            console.error('Failed to load projects:', error);
            throw new Error(`Failed to load projects: ${error.message}`);
        }
    }

    // Load build triggers for a specific project and region
    async loadTriggers(projectId, region = 'global') {
        try {
            let command = `gcloud builds triggers list --project=${projectId} --format=json`;
            
            if (region && region !== 'global') {
                command += ` --region=${region}`;
            }
            
            console.log('🔧 Loading triggers with command:', command);
            
            const { stdout } = await execAsync(command);
            const triggersData = JSON.parse(stdout);
            
            return triggersData.map(t => ({
                id: t.id,
                name: t.name,
                description: t.description || '',
                github_repo: t.github?.name || null,
                branch: t.github?.push?.branch || null,
                disabled: t.disabled || false,
                region: region,
                substitutions: t.substitutions || {}
            }));
        } catch (error) {
            console.error('Failed to load triggers:', error);
            throw new Error(`Failed to load triggers: ${error.message}`);
        }
    }

    // Execute a build trigger
    async triggerBuild(triggerId, projectId, region, branch, substitutions = {}) {
        try {
            let command = `gcloud builds triggers run ${triggerId} --project=${projectId} --format=json`;
            
            // Add region parameter if not global
            if (region && region !== 'global') {
                command += ` --region=${region}`;
            }
            
            // Add branch parameter
            if (branch) {
                command += ` --branch=${branch}`;
            }
            
            // Add substitutions
            for (const [key, value] of Object.entries(substitutions)) {
                command += ` --substitutions=${key}=${value}`;
            }
            
            console.log('🚀 Executing build command:', command);
            
            const { stdout } = await execAsync(command);
            const result = JSON.parse(stdout);
            
            const buildId = result.name ? result.name.split('/').pop() : 'unknown';
            
            return {
                success: true,
                buildId: buildId,
                result: result
            };
        } catch (error) {
            console.error('Failed to trigger build:', error);
            throw new Error(`Failed to trigger build: ${error.message}`);
        }
    }

    // List recent builds for a project
    async listRecentBuilds(projectId, limit = 10) {
        try {
            const { stdout } = await execAsync(`gcloud builds list --project=${projectId} --limit=${limit} --format=json`);
            const builds = JSON.parse(stdout);
            
            return builds.map(b => ({
                id: b.id,
                status: b.status,
                logUrl: b.logUrl,
                createTime: b.createTime,
                duration: b.timing?.BUILD?.endTime || ''
            }));
        } catch (error) {
            console.error('Failed to list recent builds:', error);
            throw new Error(`Failed to list recent builds: ${error.message}`);
        }
    }
}

module.exports = GCloudService;