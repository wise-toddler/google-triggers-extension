// Enhanced Backend Test for Google Cloud Build Extension - New Features Testing
// Testing the new build monitoring and enhanced authentication features

const GCloudService = require('./src/gcloudService');

class EnhancedTestRunner {
    constructor() {
        this.gcloudService = new GCloudService();
        this.testResults = [];
        this.totalTests = 0;
        this.passedTests = 0;
    }

    // Helper method to run a test
    runTest(testName, testFunction) {
        this.totalTests++;
        try {
            const result = testFunction();
            if (result === true) {
                this.passedTests++;
                this.testResults.push(`✅ ${testName}: PASSED`);
                console.log(`✅ ${testName}: PASSED`);
            } else {
                this.testResults.push(`❌ ${testName}: FAILED - ${result}`);
                console.log(`❌ ${testName}: FAILED - ${result}`);
            }
        } catch (error) {
            this.testResults.push(`❌ ${testName}: ERROR - ${error.message}`);
            console.log(`❌ ${testName}: ERROR - ${error.message}`);
        }
    }

    // Test 1: Enhanced Authentication Method Structure
    testEnhancedAuthStructure() {
        // Test that checkAuthStatus method exists and has the right signature
        if (typeof this.gcloudService.checkAuthStatus !== 'function') {
            return 'checkAuthStatus method is not available';
        }

        // Since we can't actually run gcloud commands in test environment,
        // we'll test the method structure by examining the code
        const methodString = this.gcloudService.checkAuthStatus.toString();
        
        // Check for dual authentication validation logic
        if (!methodString.includes('gcloud auth list') || !methodString.includes('application-default')) {
            return 'Enhanced authentication logic not found - missing dual auth validation';
        }

        // Check for proper return structure
        if (!methodString.includes('regularAuth') || !methodString.includes('applicationDefaultCredentials')) {
            return 'Enhanced authentication return structure not found';
        }

        return true;
    }

    // Test 2: New Build Status Methods Availability
    testNewBuildMethods() {
        const requiredMethods = [
            'getBuildStatus',
            'listRecentBuilds', 
            'getBuildLogs',
            'monitorBuild',
            'calculateDuration'
        ];

        for (const method of requiredMethods) {
            if (typeof this.gcloudService[method] !== 'function') {
                return `New build method ${method} is not available`;
            }
        }

        return true;
    }

    // Test 3: Duration Calculation Helper
    testDurationCalculation() {
        const testCases = [
            {
                start: '2024-01-01T10:00:00Z',
                finish: '2024-01-01T10:02:30Z',
                expected: '2m 30s'
            },
            {
                start: '2024-01-01T10:00:00Z',
                finish: '2024-01-01T10:00:45Z',
                expected: '45s'
            },
            {
                start: null,
                finish: '2024-01-01T10:00:45Z',
                expected: 'In progress...'
            },
            {
                start: '2024-01-01T10:00:00Z',
                finish: null,
                expected: 'In progress...'
            }
        ];

        for (const testCase of testCases) {
            const result = this.gcloudService.calculateDuration(testCase.start, testCase.finish);
            if (result !== testCase.expected) {
                return `Duration calculation failed for start: ${testCase.start}, finish: ${testCase.finish}. Expected "${testCase.expected}", got "${result}"`;
            }
        }

        return true;
    }

    // Test 4: Build Status Method Signatures
    testBuildMethodSignatures() {
        // Test getBuildStatus method signature
        const getBuildStatusString = this.gcloudService.getBuildStatus.toString();
        if (!getBuildStatusString.includes('buildId') || !getBuildStatusString.includes('projectId')) {
            return 'getBuildStatus method signature is incorrect';
        }

        // Test listRecentBuilds method signature  
        const listRecentBuildsString = this.gcloudService.listRecentBuilds.toString();
        if (!listRecentBuildsString.includes('projectId') || !listRecentBuildsString.includes('limit')) {
            return 'listRecentBuilds method signature is incorrect';
        }

        // Test getBuildLogs method signature
        const getBuildLogsString = this.gcloudService.getBuildLogs.toString();
        if (!getBuildLogsString.includes('buildId') || !getBuildLogsString.includes('lines')) {
            return 'getBuildLogs method signature is incorrect';
        }

        // Test monitorBuild method signature
        const monitorBuildString = this.gcloudService.monitorBuild.toString();
        if (!monitorBuildString.includes('onStatusUpdate') || !monitorBuildString.includes('maxChecks')) {
            return 'monitorBuild method signature is incorrect';
        }

        return true;
    }

    // Test 5: Enhanced Command Construction Logic
    testEnhancedCommandConstruction() {
        // Test the triggerBuild method has enhanced logic
        const triggerBuildString = this.gcloudService.triggerBuild.toString();
        
        // Check for enhanced logging
        if (!triggerBuildString.includes('EXECUTING GCLOUD BUILD COMMAND')) {
            return 'Enhanced logging not found in triggerBuild method';
        }

        // Check for proper substitution handling with escaping
        if (!triggerBuildString.includes('escapeShellArg')) {
            return 'Shell escaping not used in triggerBuild method';
        }

        // Check for build result handling
        if (!triggerBuildString.includes('buildId') || !triggerBuildString.includes('fullName')) {
            return 'Enhanced build result handling not found';
        }

        return true;
    }

    // Test 6: Build Status Return Structure
    testBuildStatusStructure() {
        // Test the getBuildStatus method return structure
        const getBuildStatusString = this.gcloudService.getBuildStatus.toString();
        
        const requiredFields = [
            'id', 'status', 'createTime', 'startTime', 'finishTime',
            'duration', 'logUrl', 'triggerName', 'branch'
        ];

        for (const field of requiredFields) {
            if (!getBuildStatusString.includes(field)) {
                return `getBuildStatus missing required field: ${field}`;
            }
        }

        return true;
    }

    // Test 7: Monitor Build Logic
    testMonitorBuildLogic() {
        const monitorBuildString = this.gcloudService.monitorBuild.toString();
        
        // Check for polling mechanism
        if (!monitorBuildString.includes('setInterval')) {
            return 'Monitor build polling mechanism not found';
        }

        // Check for status completion detection
        const completionStates = ['SUCCESS', 'FAILURE', 'TIMEOUT', 'CANCELLED'];
        for (const state of completionStates) {
            if (!monitorBuildString.includes(state)) {
                return `Monitor build missing completion state: ${state}`;
            }
        }

        // Check for callback mechanism
        if (!monitorBuildString.includes('onStatusUpdate')) {
            return 'Monitor build callback mechanism not found';
        }

        return true;
    }

    // Test 8: Package.json Configuration
    testPackageConfiguration() {
        try {
            const fs = require('fs');
            const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
            
            // Check version is updated to 0.0.3
            if (packageJson.version !== '0.0.3') {
                return `Package version should be 0.0.3, found ${packageJson.version}`;
            }

            // Check for new commands
            const commands = packageJson.contributes.commands;
            const commandIds = commands.map(cmd => cmd.command);
            
            const requiredCommands = [
                'googleCloudBuild.viewBuildLogs',
                'googleCloudBuild.refreshBuilds',
                'googleCloudBuild.stopBuildMonitoring'
            ];

            for (const requiredCmd of requiredCommands) {
                if (!commandIds.includes(requiredCmd)) {
                    return `Missing required command: ${requiredCmd}`;
                }
            }

            return true;
        } catch (error) {
            return `Package.json test failed: ${error.message}`;
        }
    }

    // Test 9: Extension Structure
    testExtensionStructure() {
        const fs = require('fs');
        
        // Check main files exist
        const requiredFiles = [
            './extension.js',
            './src/gcloudService.js',
            './src/commandHandlers.js',
            './src/treeDataProvider.js',
            './src/stateManager.js',
            './src/pinManager.js',
            './src/constants.js'
        ];

        for (const file of requiredFiles) {
            if (!fs.existsSync(file)) {
                return `Required file missing: ${file}`;
            }
        }

        // Check extension.js has proper structure
        const extensionContent = fs.readFileSync('./extension.js', 'utf8');
        if (!extensionContent.includes('Google Cloud Build Extension v3.0')) {
            return 'Extension version not updated in extension.js';
        }

        return true;
    }

    // Run all enhanced tests
    async runAllTests() {
        console.log('🧪 Starting Enhanced Google Cloud Build Extension Tests - New Features');
        console.log('=' .repeat(80));

        this.runTest('Enhanced Authentication Structure', () => this.testEnhancedAuthStructure());
        this.runTest('New Build Methods Availability', () => this.testNewBuildMethods());
        this.runTest('Duration Calculation Helper', () => this.testDurationCalculation());
        this.runTest('Build Method Signatures', () => this.testBuildMethodSignatures());
        this.runTest('Enhanced Command Construction', () => this.testEnhancedCommandConstruction());
        this.runTest('Build Status Return Structure', () => this.testBuildStatusStructure());
        this.runTest('Monitor Build Logic', () => this.testMonitorBuildLogic());
        this.runTest('Package Configuration', () => this.testPackageConfiguration());
        this.runTest('Extension Structure', () => this.testExtensionStructure());

        console.log('=' .repeat(80));
        console.log(`📊 Enhanced Test Results: ${this.passedTests}/${this.totalTests} tests passed`);
        
        if (this.passedTests === this.totalTests) {
            console.log('🎉 All enhanced tests passed! New features are working correctly.');
        } else {
            console.log('⚠️  Some enhanced tests failed. Please review the implementation.');
        }

        console.log('\n📋 Enhanced Test Results:');
        this.testResults.forEach(result => console.log(result));

        return {
            totalTests: this.totalTests,
            passedTests: this.passedTests,
            success: this.passedTests === this.totalTests,
            results: this.testResults
        };
    }
}

// Run the enhanced tests if this file is executed directly
if (require.main === module) {
    const testRunner = new EnhancedTestRunner();
    testRunner.runAllTests().then(results => {
        process.exit(results.success ? 0 : 1);
    }).catch(error => {
        console.error('Enhanced test execution failed:', error);
        process.exit(1);
    });
}

module.exports = EnhancedTestRunner;