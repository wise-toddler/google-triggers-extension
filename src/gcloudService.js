// Google Cloud service interactions
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class GCloudService {
    // Enhanced authentication check with application default credentials validation
    async checkAuthStatus() {
        try {
            // Check both regular auth and application default credentials
            const [authResult, adcResult] = await Promise.allSettled([
                execAsync('gcloud auth list --filter=status:ACTIVE --format=json'),
                execAsync('gcloud auth application-default print-access-token')
            ]);
            
            let regularAuth = { authenticated: false, account: null };
            let adcAuth = { authenticated: false };
            
            // Check regular authentication
            if (authResult.status === 'fulfilled') {
                const accounts = JSON.parse(authResult.value.stdout);
                if (accounts && accounts.length > 0) {
                    regularAuth = {
                        authenticated: true,
                        account: accounts[0].account
                    };
                }
            }
            
            // Check application default credentials
            if (adcResult.status === 'fulfilled') {
                adcAuth.authenticated = true;
            }
            
            return {
                authenticated: regularAuth.authenticated && adcAuth.authenticated,
                account: regularAuth.account,
                details: {
                    regularAuth: regularAuth.authenticated,
                    applicationDefaultCredentials: adcAuth.authenticated,
                    issue: !regularAuth.authenticated ? 'No active gcloud auth' :
                           !adcAuth.authenticated ? 'No application default credentials' : null
                }
            };
        } catch (error) {
            return {
                authenticated: false,
                account: null,
                error: error.message,
                details: {
                    regularAuth: false,
                    applicationDefaultCredentials: false,
                    issue: 'Authentication check failed'
                }
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

    // Helper method to escape shell arguments
    escapeShellArg(arg) {
        // Handle null/undefined values
        if (arg == null) {
            return '""';
        }
        
        // Convert to string
        const str = String(arg);
        
        // If the string is simple (alphanumeric, hyphens, underscores, dots), no escaping needed
        if (/^[a-zA-Z0-9._-]+$/.test(str)) {
            return str;
        }
        
        // For complex strings, wrap in single quotes and escape any single quotes
        return "'" + str.replace(/'/g, "'\"'\"'") + "'";
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
            
            // Add substitutions (comma-separated format with proper escaping)
            if (Object.keys(substitutions).length > 0) {
                const subsString = Object.entries(substitutions)
                    .map(([key, value]) => `${key}=${this.escapeShellArg(value)}`)
                    .join(',');
                command += ` --substitutions=${this.escapeShellArg(subsString)}`;
            }
            
            // Detailed logging
            console.log('🚀 ===== EXECUTING GCLOUD BUILD COMMAND =====');
            console.log('📝 Command:', command);
            console.log('🎯 Trigger ID:', triggerId);
            console.log('📂 Project:', projectId);
            console.log('🌍 Region:', region);
            console.log('🌿 Branch:', branch);
            console.log('⚙️ Substitutions:', substitutions);
            console.log('===============================================');
            
            const { stdout } = await execAsync(command);
            const result = JSON.parse(stdout);
            
            const buildId = result.name ? result.name.split('/').pop() : 'unknown';
            
            return {
                success: true,
                buildId: buildId,
                result: result,
                fullName: result.name // Full resource name for status tracking
            };
        } catch (error) {
            console.error('Failed to trigger build:', error);
            throw new Error(`Failed to trigger build: ${error.message}`);
        }
    }

    // Get specific build status
    async getBuildStatus(buildId, projectId, region = 'global') {
        try {
            let command = `gcloud builds describe ${buildId} --project=${projectId} --format=json`;
            
            if (region && region !== 'global') {
                command += ` --region=${region}`;
            }
            
            const { stdout } = await execAsync(command);
            const build = JSON.parse(stdout);
            
            return {
                id: build.id,
                status: build.status,
                createTime: build.createTime,
                startTime: build.startTime,
                finishTime: build.finishTime,
                duration: this.calculateDuration(build.startTime, build.finishTime),
                logUrl: build.logUrl,
                sourceProvenanceHash: build.sourceProvenance?.resolvedRepoSource?.commitSha?.substring(0, 7) || 'unknown',
                steps: build.steps ? build.steps.length : 0,
                triggerName: build.substitutions?._TRIGGER_NAME || 'Manual',
                branch: build.substitutions?._BRANCH_NAME || build.substitutions?.BRANCH_NAME || 'unknown'
            };
        } catch (error) {
            console.error('Failed to get build status:', error);
            throw new Error(`Failed to get build status: ${error.message}`);
        }
    }

    // Helper to calculate duration
    calculateDuration(startTime, finishTime) {
        if (!startTime || !finishTime) return 'In progress...';
        
        const start = new Date(startTime);
        const finish = new Date(finishTime);
        const diffMs = finish - start;
        
        const minutes = Math.floor(diffMs / 60000);
        const seconds = Math.floor((diffMs % 60000) / 1000);
        
        if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        }
        return `${seconds}s`;
    }

    // List recent builds for a project with enhanced details
    async listRecentBuilds(projectId, region = 'global', limit = 20) {
        try {
            let command = `gcloud builds list --project=${projectId} --limit=${limit} --format=json`;
            
            if (region && region !== 'global') {
                command += ` --region=${region}`;
            }
            
            const { stdout } = await execAsync(command);
            const builds = JSON.parse(stdout);
            
            return builds.map(b => ({
                id: b.id,
                status: b.status,
                createTime: b.createTime,
                startTime: b.startTime,
                finishTime: b.finishTime,
                duration: this.calculateDuration(b.startTime, b.finishTime),
                logUrl: b.logUrl,
                sourceProvenanceHash: b.sourceProvenance?.resolvedRepoSource?.commitSha?.substring(0, 7) || 'unknown',
                triggerName: b.substitutions?._TRIGGER_NAME || 'Manual',
                branch: b.substitutions?._BRANCH_NAME || b.substitutions?.BRANCH_NAME || 'unknown',
                region: region
            }));
        } catch (error) {
            console.error('Failed to list recent builds:', error);
            throw new Error(`Failed to list recent builds: ${error.message}`);
        }
    }

    // Get build logs (first 50 lines)
    async getBuildLogs(buildId, projectId, region = 'global', lines = 50) {
        try {
            let command = `gcloud builds log ${buildId} --project=${projectId}`;
            
            if (region && region !== 'global') {
                command += ` --region=${region}`;
            }
            
            // Add limit to avoid overwhelming output
            command += ` | head -${lines}`;
            
            const { stdout } = await execAsync(command);
            return stdout;
        } catch (error) {
            console.error('Failed to get build logs:', error);
            return `Failed to retrieve logs: ${error.message}`;
        }
    }

    // Stream build status updates (for monitoring active builds)
    async monitorBuild(buildId, projectId, region, onStatusUpdate, maxChecks = 60) {
        let checkCount = 0;
        const checkInterval = 10000; // 10 seconds
        
        return new Promise((resolve, reject) => {
            const monitor = setInterval(async () => {
                try {
                    checkCount++;
                    const status = await this.getBuildStatus(buildId, projectId, region);
                    
                    onStatusUpdate(status);
                    
                    // Stop monitoring if build is complete or failed
                    if (['SUCCESS', 'FAILURE', 'TIMEOUT', 'CANCELLED'].includes(status.status)) {
                        clearInterval(monitor);
                        resolve(status);
                        return;
                    }
                    
                    // Stop after max checks to prevent infinite monitoring
                    if (checkCount >= maxChecks) {
                        clearInterval(monitor);
                        resolve(status);
                    }
                } catch (error) {
                    clearInterval(monitor);
                    reject(error);
                }
            }, checkInterval);
        });
    }
}

module.exports = GCloudService;