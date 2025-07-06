const vscode = require('vscode');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

function activate(context) {
    console.log('🚀 Google Cloud Build Extension - DEBUG VERSION ACTIVATING');
    
    // Show info message
    vscode.window.showInformationMessage('Google Cloud Build Extension Activated! Check logs for details.');
    
    try {
        // Register debug command
        const debugCommand = vscode.commands.registerCommand('googleCloudBuild.debug', () => {
            vscode.window.showInformationMessage('Debug: Extension is working! Provider should be registered.');
            console.log('🔧 DEBUG: Extension activated successfully');
        });
        context.subscriptions.push(debugCommand);

        // Register the webview view provider with detailed logging
        console.log('🔧 Registering webview provider for view: googleCloudBuildView');
        
        const provider = new GoogleCloudBuildViewProvider(context.extensionUri);
        
        const providerDisposable = vscode.window.registerWebviewViewProvider(
            'googleCloudBuildView', 
            provider,
            {
                webviewOptions: {
                    retainContextWhenHidden: true,
                }
            }
        );
        
        context.subscriptions.push(providerDisposable);
        console.log('✅ Webview provider registered successfully');

        // Register refresh command
        const refreshCommand = vscode.commands.registerCommand('googleCloudBuild.refresh', () => {
            console.log('🔄 Refresh command triggered');
            provider.refresh();
            vscode.window.showInformationMessage('Google Cloud Build refreshed');
        });
        context.subscriptions.push(refreshCommand);

        console.log('✅ All commands and providers registered successfully');
        
    } catch (error) {
        console.error('❌ Error during activation:', error);
        vscode.window.showErrorMessage(`Extension activation failed: ${error.message}`);
    }
}

class GoogleCloudBuildViewProvider {
    constructor(extensionUri) {
        this._extensionUri = extensionUri;
        this._view = undefined;
        console.log('🏗️ GoogleCloudBuildViewProvider created');
    }

    refresh() {
        console.log('🔄 Refreshing webview');
        if (this._view) {
            this._view.webview.html = this._getHtmlForWebview(this._view.webview);
            console.log('✅ Webview refreshed');
        } else {
            console.log('⚠️ No webview to refresh');
        }
    }

    resolveWebviewView(webviewView, context, _token) {
        console.log('🔧 resolveWebviewView called');
        
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        console.log('🎨 Setting webview HTML');
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(
            async (message) => {
                console.log('📨 Received message from webview:', message.command);
                try {
                    switch (message.command) {
                        case 'ready':
                            console.log('✅ Webview is ready');
                            await this.checkAuthStatus(webviewView.webview);
                            break;
                        case 'checkAuth':
                            console.log('🔐 Checking auth status');
                            await this.checkAuthStatus(webviewView.webview);
                            break;
                        case 'listProjects':
                            console.log('📋 Listing projects');
                            await this.listProjects(webviewView.webview);
                            break;
                        case 'listTriggers':
                            console.log('🎯 Listing triggers');
                            await this.listTriggers(webviewView.webview, message.projectId, message.region);
                            break;
                        case 'executeTrigger':
                            console.log('⚡ Executing trigger');
                            await this.executeTrigger(webviewView.webview, message.data);
                            break;
                        case 'listRecentBuilds':
                            console.log('📊 Listing recent builds');
                            await this.listRecentBuilds(webviewView.webview, message.projectId);
                            break;
                    }
                } catch (error) {
                    console.error('❌ Error handling message:', error);
                    webviewView.webview.postMessage({
                        command: 'error',
                        data: { message: `Error: ${error.message}` }
                    });
                }
            },
            undefined,
            context.subscriptions
        );

        console.log('✅ Webview fully configured');
    }

    async checkAuthStatus(webview) {
        console.log('🔐 Checking gcloud auth status...');
        try {
            const { stdout, stderr } = await execAsync('gcloud auth list --filter=status:ACTIVE --format=json');
            const accounts = JSON.parse(stdout);
            
            if (accounts && accounts.length > 0) {
                console.log('✅ User is authenticated:', accounts[0].account);
                webview.postMessage({
                    command: 'authStatus',
                    data: { authenticated: true, account: accounts[0].account }
                });
            } else {
                console.log('❌ User is not authenticated');
                webview.postMessage({
                    command: 'authStatus',
                    data: { authenticated: false, account: null }
                });
            }
        } catch (error) {
            console.error('❌ Auth check failed:', error.message);
            webview.postMessage({
                command: 'authStatus',
                data: { authenticated: false, account: null, error: error.message }
            });
        }
    }

    async listProjects(webview) {
        console.log('📋 Fetching projects...');
        try {
            const { stdout, stderr } = await execAsync('gcloud projects list --format=json');
            const projects = JSON.parse(stdout);
            console.log(`✅ Found ${projects.length} projects`);
            
            webview.postMessage({
                command: 'projects',
                data: projects.map(p => ({
                    id: p.projectId,
                    name: p.name,
                    project_number: p.projectNumber
                }))
            });
        } catch (error) {
            console.error('❌ Failed to list projects:', error.message);
            webview.postMessage({
                command: 'error',
                data: { message: `Failed to list projects: ${error.message}` }
            });
        }
    }

    async listTriggers(webview, projectId, region) {
        console.log(`🎯 Fetching triggers for project: ${projectId}, region: ${region}`);
        try {
            let command = `gcloud builds triggers list --project=${projectId} --format=json`;
            if (region && region !== 'global') {
                command += ` --region=${region}`;
            }
            
            const { stdout, stderr } = await execAsync(command);
            const triggers = JSON.parse(stdout);
            console.log(`✅ Found ${triggers.length} triggers`);
            
            webview.postMessage({
                command: 'triggers',
                data: triggers.map(t => ({
                    id: t.id,
                    name: t.name,
                    description: t.description || '',
                    github_repo: t.github?.name || null,
                    branch: t.github?.push?.branch || null,
                    disabled: t.disabled || false
                }))
            });
        } catch (error) {
            console.error('❌ Failed to list triggers:', error.message);
            webview.postMessage({
                command: 'error',
                data: { message: `Failed to list triggers: ${error.message}` }
            });
        }
    }

    async executeTrigger(webview, data) {
        console.log('⚡ Executing trigger:', data.trigger_id);
        try {
            let command = `gcloud builds triggers run ${data.trigger_id} --project=${data.project_id}`;
            
            if (data.region && data.region !== 'global') {
                command += ` --region=${data.region}`;
            }
            
            if (data.branch) {
                command += ` --branch=${data.branch}`;
            }
            
            for (const [key, value] of Object.entries(data.substitutions || {})) {
                command += ` --substitutions=${key}=${value}`;
            }
            
            command += ' --format=json';
            console.log('🚀 Executing command:', command);
            
            const { stdout, stderr } = await execAsync(command);
            const result = JSON.parse(stdout);
            
            const buildId = result.name ? result.name.split('/').pop() : null;
            console.log('✅ Build triggered successfully, ID:', buildId);
            
            webview.postMessage({
                command: 'triggerExecuted',
                data: {
                    success: true,
                    build_id: buildId,
                    message: 'Build triggered successfully'
                }
            });
        } catch (error) {
            console.error('❌ Failed to execute trigger:', error.message);
            webview.postMessage({
                command: 'error',
                data: { message: `Failed to execute trigger: ${error.message}` }
            });
        }
    }

    async listRecentBuilds(webview, projectId) {
        console.log('📊 Fetching recent builds for project:', projectId);
        try {
            const { stdout, stderr } = await execAsync(`gcloud builds list --project=${projectId} --limit=10 --format=json`);
            const builds = JSON.parse(stdout);
            console.log(`✅ Found ${builds.length} recent builds`);
            
            webview.postMessage({
                command: 'recentBuilds',
                data: builds.map(b => ({
                    id: b.id,
                    status: b.status,
                    log_url: b.logUrl,
                    create_time: b.createTime,
                    duration: b.timing?.BUILD?.endTime || ''
                }))
            });
        } catch (error) {
            console.error('❌ Failed to list recent builds:', error.message);
            webview.postMessage({
                command: 'error',
                data: { message: `Failed to list recent builds: ${error.message}` }
            });
        }
    }

    _getHtmlForWebview(webview) {
        console.log('🎨 Generating HTML for webview');
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Google Cloud Build DEBUG</title>
    <style>
        body {
            padding: 10px;
            margin: 0;
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }
        .debug-info {
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            padding: 8px;
            border-radius: 4px;
            margin-bottom: 10px;
            font-size: 12px;
        }
        .loading {
            text-align: center;
            padding: 20px;
            color: var(--vscode-descriptionForeground);
        }
        .section {
            margin-bottom: 15px;
        }
        .section-title {
            font-weight: bold;
            margin-bottom: 5px;
            color: var(--vscode-titleBar-activeForeground);
        }
        select, input, button {
            width: 100%;
            padding: 4px 8px;
            margin-bottom: 5px;
            background-color: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            color: var(--vscode-input-foreground);
            font-size: var(--vscode-font-size);
        }
        button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            cursor: pointer;
            padding: 8px;
        }
        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .auth-container {
            text-align: center;
            padding: 20px;
        }
        .auth-command {
            background-color: var(--vscode-textBlockQuote-background);
            padding: 8px;
            border-radius: 4px;
            font-family: var(--vscode-editor-font-family);
            font-size: 12px;
            color: var(--vscode-textPreformat-foreground);
            margin: 10px 0;
        }
        .message {
            padding: 8px;
            margin: 5px 0;
            border-radius: 4px;
            font-size: 12px;
            background-color: var(--vscode-input-background);
        }
        .hidden { display: none; }
    </style>
</head>
<body>
    <div class="debug-info">
        🐛 DEBUG VERSION - Extension Active
        <br>Check VSCode Developer Console for detailed logs
    </div>

    <div id="loadingContainer">
        <div class="loading">
            <p>🔄 Loading Google Cloud Build Extension...</p>
            <p>Checking authentication status...</p>
        </div>
    </div>

    <div id="authRequired" class="auth-container hidden">
        <div style="font-size: 48px; margin-bottom: 10px;">🔒</div>
        <h3>Authentication Required</h3>
        <p>Please authenticate with Google Cloud to continue.</p>
        <div class="auth-command">gcloud auth application-default login</div>
        <button onclick="checkAuth()">Check Again</button>
    </div>

    <div id="mainPanel" class="hidden">
        <div class="section">
            <div class="section-title">✅ Connected to Google Cloud</div>
            <p id="userInfo" style="font-size: 12px; color: var(--vscode-descriptionForeground);"></p>
        </div>

        <div class="section">
            <div class="section-title">Project</div>
            <select id="projectSelect">
                <option value="">Select a project</option>
            </select>
        </div>

        <div class="section">
            <div class="section-title">Region</div>
            <select id="regionSelect">
                <option value="global">Global</option>
                <option value="us-central1">US Central 1</option>
                <option value="europe-west1">Europe West 1</option>
            </select>
        </div>

        <div class="section">
            <div class="section-title">Trigger</div>
            <select id="triggerSelect">
                <option value="">Select a trigger</option>
            </select>
        </div>

        <div class="section">
            <button onclick="testConnection()">🧪 Test Connection</button>
        </div>

        <div id="message" class="message hidden"></div>
    </div>

    <script>
        console.log('🎨 Webview script loaded');
        const vscode = acquireVsCodeApi();
        
        function hideLoading() {
            document.getElementById('loadingContainer').classList.add('hidden');
        }

        function checkAuth() {
            console.log('🔐 Requesting auth check');
            vscode.postMessage({ command: 'checkAuth' });
        }

        function testConnection() {
            console.log('🧪 Testing connection');
            vscode.postMessage({ command: 'checkAuth' });
            showMessage('Testing connection...', 'info');
        }

        function showMessage(text, type = 'info') {
            const messageDiv = document.getElementById('message');
            messageDiv.textContent = text;
            messageDiv.classList.remove('hidden');
            setTimeout(() => {
                messageDiv.classList.add('hidden');
            }, 3000);
        }

        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            console.log('📨 Received message from extension:', message.command, message.data);
            
            switch (message.command) {
                case 'authStatus':
                    hideLoading();
                    if (message.data.authenticated) {
                        document.getElementById('authRequired').classList.add('hidden');
                        document.getElementById('mainPanel').classList.remove('hidden');
                        document.getElementById('userInfo').textContent = 'Authenticated as: ' + message.data.account;
                        vscode.postMessage({ command: 'listProjects' });
                    } else {
                        document.getElementById('authRequired').classList.remove('hidden');
                        document.getElementById('mainPanel').classList.add('hidden');
                    }
                    break;

                case 'projects':
                    const projectSelect = document.getElementById('projectSelect');
                    projectSelect.innerHTML = '<option value="">Select a project</option>';
                    message.data.forEach(project => {
                        const option = document.createElement('option');
                        option.value = project.id;
                        option.textContent = project.name + ' (' + project.id + ')';
                        projectSelect.appendChild(option);
                    });
                    showMessage('Projects loaded: ' + message.data.length, 'info');
                    break;

                case 'triggers':
                    const triggerSelect = document.getElementById('triggerSelect');
                    triggerSelect.innerHTML = '<option value="">Select a trigger</option>';
                    message.data.forEach(trigger => {
                        const option = document.createElement('option');
                        option.value = trigger.id;
                        option.textContent = trigger.name;
                        triggerSelect.appendChild(option);
                    });
                    showMessage('Triggers loaded: ' + message.data.length, 'info');
                    break;

                case 'error':
                    showMessage('❌ ' + message.data.message, 'error');
                    break;
            }
        });

        // Event listeners
        document.getElementById('projectSelect').addEventListener('change', function() {
            if (this.value) {
                vscode.postMessage({
                    command: 'listTriggers',
                    projectId: this.value,
                    region: document.getElementById('regionSelect').value
                });
            }
        });

        // Initialize
        console.log('🚀 Webview initializing...');
        vscode.postMessage({ command: 'ready' });
        setTimeout(() => {
            console.log('⏰ Auto-checking auth after 2 seconds');
            checkAuth();
        }, 2000);
    </script>
</body>
</html>`;
    }
}

function deactivate() {
    console.log('🔴 Google Cloud Build Extension deactivated');
}

module.exports = {
    activate,
    deactivate
};