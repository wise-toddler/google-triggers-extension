const vscode = require('vscode');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    console.log('Google Cloud Build extension is now active!');

    // Register command to open the panel
    let disposable = vscode.commands.registerCommand('googleCloudBuild.openPanel', () => {
        GoogleCloudBuildPanel.createOrShow(context.extensionUri);
    });

    context.subscriptions.push(disposable);

    // Register the webview view provider
    const provider = new GoogleCloudBuildViewProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(GoogleCloudBuildViewProvider.viewType, provider)
    );
}

class GoogleCloudBuildViewProvider {
    static viewType = 'googleCloudBuildView';

    constructor(extensionUri) {
        this._extensionUri = extensionUri;
        this._view = undefined;
    }

    resolveWebviewView(webviewView, context, _token) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        
        // Initial auth check
        this.checkAuthStatus(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'checkAuth':
                        await this.checkAuthStatus(webviewView.webview);
                        break;
                    case 'listProjects':
                        await this.listProjects(webviewView.webview);
                        break;
                    case 'listTriggers':
                        await this.listTriggers(webviewView.webview, message.projectId, message.region);
                        break;
                    case 'executeTrigger':
                        await this.executeTrigger(webviewView.webview, message.data);
                        break;
                    case 'listRecentBuilds':
                        await this.listRecentBuilds(webviewView.webview, message.projectId);
                        break;
                }
            },
            undefined,
            context.subscriptions
        );
    }

    async checkAuthStatus(webview) {
        try {
            const { stdout, stderr } = await execAsync('gcloud auth list --filter=status:ACTIVE --format=json');
            const accounts = JSON.parse(stdout);
            
            if (accounts && accounts.length > 0) {
                webview.postMessage({
                    command: 'authStatus',
                    data: { authenticated: true, account: accounts[0].account }
                });
            } else {
                webview.postMessage({
                    command: 'authStatus',
                    data: { authenticated: false, account: null }
                });
            }
        } catch (error) {
            webview.postMessage({
                command: 'authStatus',
                data: { authenticated: false, account: null, error: error.message }
            });
        }
    }

    async listProjects(webview) {
        try {
            const { stdout, stderr } = await execAsync('gcloud projects list --format=json');
            const projects = JSON.parse(stdout);
            
            webview.postMessage({
                command: 'projects',
                data: projects.map(p => ({
                    id: p.projectId,
                    name: p.name,
                    project_number: p.projectNumber
                }))
            });
        } catch (error) {
            webview.postMessage({
                command: 'error',
                data: { message: `Failed to list projects: ${error.message}` }
            });
        }
    }

    async listTriggers(webview, projectId, region) {
        try {
            let command = `gcloud builds triggers list --project=${projectId} --format=json`;
            if (region && region !== 'global') {
                command += ` --region=${region}`;
            }
            
            const { stdout, stderr } = await execAsync(command);
            const triggers = JSON.parse(stdout);
            
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
            webview.postMessage({
                command: 'error',
                data: { message: `Failed to list triggers: ${error.message}` }
            });
        }
    }

    async executeTrigger(webview, data) {
        try {
            let command = `gcloud builds triggers run ${data.trigger_id} --project=${data.project_id}`;
            
            if (data.region && data.region !== 'global') {
                command += ` --region=${data.region}`;
            }
            
            if (data.branch) {
                command += ` --branch=${data.branch}`;
            }
            
            // Add substitutions
            for (const [key, value] of Object.entries(data.substitutions || {})) {
                command += ` --substitutions=${key}=${value}`;
            }
            
            command += ' --format=json';
            
            const { stdout, stderr } = await execAsync(command);
            const result = JSON.parse(stdout);
            
            const buildId = result.name ? result.name.split('/').pop() : null;
            
            webview.postMessage({
                command: 'triggerExecuted',
                data: {
                    success: true,
                    build_id: buildId,
                    message: 'Build triggered successfully'
                }
            });
        } catch (error) {
            webview.postMessage({
                command: 'error',
                data: { message: `Failed to execute trigger: ${error.message}` }
            });
        }
    }

    async listRecentBuilds(webview, projectId) {
        try {
            const { stdout, stderr } = await execAsync(`gcloud builds list --project=${projectId} --limit=10 --format=json`);
            const builds = JSON.parse(stdout);
            
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
            webview.postMessage({
                command: 'error',
                data: { message: `Failed to list recent builds: ${error.message}` }
            });
        }
    }

    _getHtmlForWebview(webview) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Google Cloud Build</title>
    <style>
        body {
            padding: 0;
            margin: 0;
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }
        .container {
            padding: 10px;
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
        button:disabled {
            background-color: var(--vscode-button-secondaryBackground);
            cursor: not-allowed;
        }
        .substitution-item {
            display: flex;
            align-items: center;
            margin-bottom: 5px;
            padding: 4px;
            background-color: var(--vscode-input-background);
            border-radius: 3px;
        }
        .substitution-text {
            flex: 1;
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }
        .substitution-remove {
            background-color: var(--vscode-errorForeground);
            color: white;
            border: none;
            padding: 2px 6px;
            font-size: 12px;
            cursor: pointer;
            width: auto;
            margin: 0 0 0 5px;
        }
        .auth-container {
            text-align: center;
            padding: 20px;
        }
        .auth-icon {
            font-size: 48px;
            margin-bottom: 10px;
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
        }
        .message.success {
            background-color: var(--vscode-testing-iconPassed);
            color: white;
        }
        .message.error {
            background-color: var(--vscode-testing-iconFailed);
            color: white;
        }
        .builds-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        .builds-table th, .builds-table td {
            padding: 4px;
            border: 1px solid var(--vscode-input-border);
            text-align: left;
            font-size: 11px;
        }
        .builds-table th {
            background-color: var(--vscode-input-background);
            font-weight: bold;
        }
        .status-success { color: var(--vscode-testing-iconPassed); }
        .status-failure { color: var(--vscode-testing-iconFailed); }
        .status-working { color: var(--vscode-testing-iconQueued); }
        .status-queued { color: var(--vscode-testing-iconSkipped); }
        .hidden { display: none; }
    </style>
</head>
<body>
    <div class="container">
        <div id="authRequired" class="auth-container hidden">
            <div class="auth-icon">🔒</div>
            <h3>Authentication Required</h3>
            <p>Please authenticate with Google Cloud to continue.</p>
            <div class="auth-command">gcloud auth application-default login</div>
            <button onclick="checkAuth()">Check Again</button>
        </div>

        <div id="mainPanel" class="hidden">
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
                    <option value="us-east1">US East 1</option>
                    <option value="us-east4">US East 4</option>
                    <option value="us-west1">US West 1</option>
                    <option value="us-west2">US West 2</option>
                    <option value="europe-west1">Europe West 1</option>
                    <option value="europe-west2">Europe West 2</option>
                    <option value="asia-east1">Asia East 1</option>
                    <option value="asia-northeast1">Asia Northeast 1</option>
                </select>
            </div>

            <div class="section">
                <div class="section-title">Trigger</div>
                <select id="triggerSelect">
                    <option value="">Select a trigger</option>
                </select>
            </div>

            <div class="section">
                <div class="section-title">Branch</div>
                <input type="text" id="branchInput" placeholder="main" value="main">
            </div>

            <div class="section">
                <div class="section-title">Substitutions</div>
                <div id="substitutions"></div>
                <button onclick="addSubstitution()">+ Add Substitution</button>
            </div>

            <div class="section">
                <button id="executeBtn" onclick="executeTrigger()" disabled>Execute Trigger</button>
            </div>

            <div id="message" class="message hidden"></div>

            <div class="section">
                <div class="section-title">Recent Builds</div>
                <div id="recentBuilds"></div>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let currentProject = '';
        let currentRegion = 'global';
        let substitutions = {};

        // Initialize
        checkAuth();

        function checkAuth() {
            vscode.postMessage({ command: 'checkAuth' });
        }

        function showMessage(text, type = 'success') {
            const messageDiv = document.getElementById('message');
            messageDiv.textContent = text;
            messageDiv.className = \`message \${type}\`;
            messageDiv.classList.remove('hidden');
            setTimeout(() => {
                messageDiv.classList.add('hidden');
            }, 5000);
        }

        function addSubstitution() {
            const key = prompt('Enter substitution key (e.g., _ENVIRONMENT):');
            if (key) {
                const value = prompt('Enter substitution value:');
                if (value !== null) {
                    substitutions[key] = value;
                    renderSubstitutions();
                }
            }
        }

        function removeSubstitution(key) {
            delete substitutions[key];
            renderSubstitutions();
        }

        function renderSubstitutions() {
            const container = document.getElementById('substitutions');
            container.innerHTML = '';
            
            for (const [key, value] of Object.entries(substitutions)) {
                const div = document.createElement('div');
                div.className = 'substitution-item';
                div.innerHTML = \`
                    <span class="substitution-text">\${key} = \${value}</span>
                    <button class="substitution-remove" onclick="removeSubstitution('\${key}')">×</button>
                \`;
                container.appendChild(div);
            }
        }

        function executeTrigger() {
            const projectId = document.getElementById('projectSelect').value;
            const region = document.getElementById('regionSelect').value;
            const triggerId = document.getElementById('triggerSelect').value;
            const branch = document.getElementById('branchInput').value;

            if (!triggerId) {
                showMessage('Please select a trigger first', 'error');
                return;
            }

            document.getElementById('executeBtn').disabled = true;
            document.getElementById('executeBtn').textContent = 'Executing...';

            vscode.postMessage({
                command: 'executeTrigger',
                data: {
                    project_id: projectId,
                    region: region,
                    trigger_id: triggerId,
                    substitutions: substitutions,
                    branch: branch
                }
            });
        }

        // Event listeners
        document.getElementById('projectSelect').addEventListener('change', function() {
            currentProject = this.value;
            if (currentProject) {
                vscode.postMessage({
                    command: 'listTriggers',
                    projectId: currentProject,
                    region: currentRegion
                });
                vscode.postMessage({
                    command: 'listRecentBuilds',
                    projectId: currentProject
                });
            }
        });

        document.getElementById('regionSelect').addEventListener('change', function() {
            currentRegion = this.value;
            if (currentProject) {
                vscode.postMessage({
                    command: 'listTriggers',
                    projectId: currentProject,
                    region: currentRegion
                });
            }
        });

        document.getElementById('triggerSelect').addEventListener('change', function() {
            document.getElementById('executeBtn').disabled = !this.value;
        });

        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.command) {
                case 'authStatus':
                    if (message.data.authenticated) {
                        document.getElementById('authRequired').classList.add('hidden');
                        document.getElementById('mainPanel').classList.remove('hidden');
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
                        option.textContent = \`\${project.name} (\${project.id})\`;
                        projectSelect.appendChild(option);
                    });
                    break;

                case 'triggers':
                    const triggerSelect = document.getElementById('triggerSelect');
                    triggerSelect.innerHTML = '<option value="">Select a trigger</option>';
                    message.data.forEach(trigger => {
                        const option = document.createElement('option');
                        option.value = trigger.id;
                        option.textContent = \`\${trigger.name}\${trigger.disabled ? ' (Disabled)' : ''}\`;
                        triggerSelect.appendChild(option);
                    });
                    break;

                case 'triggerExecuted':
                    document.getElementById('executeBtn').disabled = false;
                    document.getElementById('executeBtn').textContent = 'Execute Trigger';
                    showMessage(\`✅ \${message.data.message} (Build ID: \${message.data.build_id})\`, 'success');
                    // Refresh recent builds
                    if (currentProject) {
                        setTimeout(() => {
                            vscode.postMessage({
                                command: 'listRecentBuilds',
                                projectId: currentProject
                            });
                        }, 2000);
                    }
                    break;

                case 'recentBuilds':
                    const buildsContainer = document.getElementById('recentBuilds');
                    if (message.data.length === 0) {
                        buildsContainer.innerHTML = '<p>No recent builds found.</p>';
                        break;
                    }
                    
                    let tableHTML = \`
                        <table class="builds-table">
                            <thead>
                                <tr>
                                    <th>Build ID</th>
                                    <th>Status</th>
                                    <th>Created</th>
                                </tr>
                            </thead>
                            <tbody>
                    \`;
                    
                    message.data.forEach(build => {
                        const statusClass = \`status-\${build.status.toLowerCase()}\`;
                        const shortId = build.id.substring(0, 8);
                        const createTime = build.create_time ? new Date(build.create_time).toLocaleString() : '';
                        
                        tableHTML += \`
                            <tr>
                                <td>\${shortId}...</td>
                                <td><span class="\${statusClass}">\${build.status}</span></td>
                                <td>\${createTime}</td>
                            </tr>
                        \`;
                    });
                    
                    tableHTML += '</tbody></table>';
                    buildsContainer.innerHTML = tableHTML;
                    break;

                case 'error':
                    document.getElementById('executeBtn').disabled = false;
                    document.getElementById('executeBtn').textContent = 'Execute Trigger';
                    showMessage(\`❌ \${message.data.message}\`, 'error');
                    break;
            }
        });
    </script>
</body>
</html>`;
    }
}

class GoogleCloudBuildPanel {
    static currentPanel = undefined;
    static viewType = 'googleCloudBuild';

    static createOrShow(extensionUri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (GoogleCloudBuildPanel.currentPanel) {
            GoogleCloudBuildPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            GoogleCloudBuildPanel.viewType,
            'Google Cloud Build',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
            }
        );

        GoogleCloudBuildPanel.currentPanel = new GoogleCloudBuildPanel(panel, extensionUri);
    }

    constructor(panel, extensionUri) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._disposables = [];

        this._update();

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }

    dispose() {
        GoogleCloudBuildPanel.currentPanel = undefined;
        this._panel.dispose();
        
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    _update() {
        const webview = this._panel.webview;
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    _getHtmlForWebview(webview) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Google Cloud Build</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 20px;
        }
        h1 {
            color: var(--vscode-titleBar-activeForeground);
            text-align: center;
        }
        .info {
            text-align: center;
            padding: 20px;
            background-color: var(--vscode-input-background);
            border-radius: 8px;
            margin: 20px 0;
        }
        .code {
            background-color: var(--vscode-textBlockQuote-background);
            padding: 10px;
            border-radius: 4px;
            font-family: var(--vscode-editor-font-family);
            color: var(--vscode-textPreformat-foreground);
        }
    </style>
</head>
<body>
    <h1>Google Cloud Build Extension</h1>
    <div class="info">
        <p>This extension allows you to manage Google Cloud Build triggers directly from VSCode.</p>
        <p>The main interface is available in the <strong>Explorer</strong> sidebar under <strong>Google Cloud Build</strong>.</p>
        <p>Make sure you have the <strong>gcloud CLI</strong> installed and authenticated:</p>
        <div class="code">gcloud auth application-default login</div>
    </div>
</body>
</html>`;
    }
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};