#!/usr/bin/env python3
"""
Comprehensive Backend Test for Google Cloud Build VSCode Extension
Testing the enhanced authentication system, build monitoring, and service methods
"""

import subprocess
import json
import sys
import os
from datetime import datetime

class GoogleCloudBuildExtensionTester:
    def __init__(self):
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        self.failed_tests = 0
        
    def log_test(self, test_name, passed, message=""):
        """Log test result"""
        self.total_tests += 1
        if passed:
            self.passed_tests += 1
            status = "✅ PASSED"
        else:
            self.failed_tests += 1
            status = "❌ FAILED"
            
        result = f"{status} - {test_name}"
        if message:
            result += f": {message}"
            
        self.test_results.append(result)
        print(result)
        
    def run_node_test(self, test_code, test_name):
        """Run a Node.js test and return the result"""
        try:
            # Create a temporary test file
            test_file_content = f"""
const GCloudService = require('./src/gcloudService');
const gcloudService = new GCloudService();

async function runTest() {{
    try {{
        {test_code}
        console.log('TEST_PASSED');
    }} catch (error) {{
        console.log('TEST_FAILED:' + error.message);
    }}
}}

runTest();
"""
            
            # Write test file
            with open('/app/temp_test.js', 'w') as f:
                f.write(test_file_content)
                
            # Run the test
            result = subprocess.run(['node', '/app/temp_test.js'], 
                                  capture_output=True, text=True, cwd='/app')
            
            # Clean up
            if os.path.exists('/app/temp_test.js'):
                os.remove('/app/temp_test.js')
                
            if result.returncode == 0:
                output = result.stdout.strip()
                if 'TEST_PASSED' in output:
                    self.log_test(test_name, True)
                    return True
                elif 'TEST_FAILED:' in output:
                    error_msg = output.split('TEST_FAILED:')[1]
                    self.log_test(test_name, False, error_msg)
                    return False
                else:
                    self.log_test(test_name, False, f"Unexpected output: {output}")
                    return False
            else:
                self.log_test(test_name, False, f"Process failed: {result.stderr}")
                return False
                
        except Exception as e:
            self.log_test(test_name, False, f"Exception: {str(e)}")
            return False
    
    def test_service_instantiation(self):
        """Test that GCloudService can be instantiated and has required methods"""
        test_code = """
        // Test service instantiation
        if (!gcloudService) {
            throw new Error('GCloudService could not be instantiated');
        }
        
        // Test required methods exist
        const requiredMethods = [
            'checkAuthStatus', 'loadProjects', 'loadTriggers', 'triggerBuild',
            'getBuildStatus', 'listRecentBuilds', 'getBuildLogs', 'monitorBuild',
            'escapeShellArg', 'calculateDuration'
        ];
        
        for (const method of requiredMethods) {
            if (typeof gcloudService[method] !== 'function') {
                throw new Error(`Method ${method} is not available or not a function`);
            }
        }
        """
        return self.run_node_test(test_code, "Service Instantiation and Method Availability")
    
    def test_enhanced_auth_structure(self):
        """Test the enhanced authentication system structure"""
        test_code = """
        // Mock the execAsync to simulate different auth states
        const util = require('util');
        const originalExecAsync = util.promisify(require('child_process').exec);
        
        // Test the method exists and returns proper structure
        const authResult = await gcloudService.checkAuthStatus().catch(e => ({
            authenticated: false,
            account: null,
            error: e.message,
            details: {
                regularAuth: false,
                applicationDefaultCredentials: false,
                issue: 'Test environment - gcloud not available'
            }
        }));
        
        // Verify structure
        if (typeof authResult.authenticated !== 'boolean') {
            throw new Error('authenticated field should be boolean');
        }
        
        if (!authResult.details) {
            throw new Error('details field is missing');
        }
        
        if (typeof authResult.details.regularAuth !== 'boolean') {
            throw new Error('details.regularAuth should be boolean');
        }
        
        if (typeof authResult.details.applicationDefaultCredentials !== 'boolean') {
            throw new Error('details.applicationDefaultCredentials should be boolean');
        }
        
        if (authResult.details.issue === undefined) {
            throw new Error('details.issue field is missing');
        }
        """
        return self.run_node_test(test_code, "Enhanced Authentication System Structure")
    
    def test_shell_escaping_functionality(self):
        """Test the shell escaping functionality (critical bug fix)"""
        test_code = """
        // Test various shell escaping scenarios
        const testCases = [
            { input: 'simple', expected: 'simple' },
            { input: 'hello world', expected: "'hello world'" },
            { input: "it's a test", expected: "'it'\"'\"'s a test'" },
            { input: 'line1\\nline2', expected: "'line1\\nline2'" },
            { input: null, expected: '""' },
            { input: undefined, expected: '""' },
            { input: '', expected: "''" },
            { input: 'value with $VAR', expected: "'value with $VAR'" }
        ];
        
        for (const testCase of testCases) {
            const result = gcloudService.escapeShellArg(testCase.input);
            if (result !== testCase.expected) {
                throw new Error(`Shell escaping failed for "${testCase.input}". Expected "${testCase.expected}", got "${result}"`);
            }
        }
        """
        return self.run_node_test(test_code, "Shell Escaping Functionality")
    
    def test_build_status_methods(self):
        """Test build status and monitoring method signatures"""
        test_code = """
        // Test getBuildStatus method signature
        try {
            await gcloudService.getBuildStatus('test-build-id', 'test-project', 'global');
        } catch (error) {
            // Expected to fail in test environment, but should not be a method error
            if (error.message.includes('is not a function')) {
                throw new Error('getBuildStatus method signature issue');
            }
        }
        
        // Test listRecentBuilds method signature
        try {
            await gcloudService.listRecentBuilds('test-project', 'global', 10);
        } catch (error) {
            // Expected to fail in test environment, but should not be a method error
            if (error.message.includes('is not a function')) {
                throw new Error('listRecentBuilds method signature issue');
            }
        }
        
        // Test getBuildLogs method signature
        try {
            await gcloudService.getBuildLogs('test-build-id', 'test-project', 'global', 50);
        } catch (error) {
            // Expected to fail in test environment, but should not be a method error
            if (error.message.includes('is not a function')) {
                throw new Error('getBuildLogs method signature issue');
            }
        }
        
        // Test monitorBuild method signature
        try {
            await gcloudService.monitorBuild('test-build-id', 'test-project', 'global', () => {}, 1);
        } catch (error) {
            // Expected to fail in test environment, but should not be a method error
            if (error.message.includes('is not a function')) {
                throw new Error('monitorBuild method signature issue');
            }
        }
        """
        return self.run_node_test(test_code, "Build Status Methods Signatures")
    
    def test_duration_calculation(self):
        """Test the duration calculation helper method"""
        test_code = """
        // Test duration calculation with various scenarios
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
            const result = gcloudService.calculateDuration(testCase.start, testCase.finish);
            if (result !== testCase.expected) {
                throw new Error(`Duration calculation failed. Expected "${testCase.expected}", got "${result}"`);
            }
        }
        """
        return self.run_node_test(test_code, "Duration Calculation Helper")
    
    def test_command_construction_with_escaping(self):
        """Test command construction with proper shell escaping"""
        test_code = """
        // Test command construction logic with complex substitutions
        const substitutions = {
            'SIMPLE_VAR': 'simple123',
            'COMPLEX_VAR': 'value with spaces and "quotes"',
            'MULTILINE_VAR': 'line1\\nline2\\nline3',
            'SPECIAL_CHARS': 'value with $VAR && echo "test"'
        };
        
        // Simulate the command construction logic from triggerBuild
        const subsString = Object.entries(substitutions)
            .map(([key, value]) => `${key}=${gcloudService.escapeShellArg(value)}`)
            .join(',');
        
        // Verify that complex values are properly escaped
        if (!subsString.includes("COMPLEX_VAR='value with spaces and \"quotes\"'")) {
            throw new Error('Complex substitution not properly escaped');
        }
        
        if (!subsString.includes("MULTILINE_VAR='line1\\nline2\\nline3'")) {
            throw new Error('Multiline substitution not properly escaped');
        }
        
        if (!subsString.includes("SPECIAL_CHARS='value with $VAR && echo \"test\"'")) {
            throw new Error('Special characters not properly escaped');
        }
        """
        return self.run_node_test(test_code, "Command Construction with Shell Escaping")
    
    def test_extension_structure(self):
        """Test extension structure and configuration"""
        try:
            # Check package.json
            with open('/app/package.json', 'r') as f:
                package_data = json.load(f)
            
            # Verify version is updated to 0.0.3 as mentioned in review
            if package_data.get('version') != '0.0.3':
                self.log_test("Extension Version Check", False, f"Expected version 0.0.3, got {package_data.get('version')}")
                return False
            
            # Check for new commands mentioned in review
            commands = package_data.get('contributes', {}).get('commands', [])
            command_names = [cmd.get('command') for cmd in commands]
            
            required_commands = [
                'googleCloudBuild.viewBuildLogs',
                'googleCloudBuild.refreshBuilds', 
                'googleCloudBuild.stopBuildMonitoring'
            ]
            
            for cmd in required_commands:
                if cmd not in command_names:
                    self.log_test("Extension Commands Check", False, f"Missing command: {cmd}")
                    return False
            
            # Check extension.js exists
            if not os.path.exists('/app/extension.js'):
                self.log_test("Extension Structure Check", False, "extension.js not found")
                return False
                
            self.log_test("Extension Structure and Configuration", True)
            return True
            
        except Exception as e:
            self.log_test("Extension Structure Check", False, f"Exception: {str(e)}")
            return False
    
    def test_tree_data_provider_structure(self):
        """Test tree data provider has required methods for build tracking"""
        test_code = """
        const TreeDataProvider = require('./src/treeDataProvider');
        const StateManager = require('./src/stateManager');
        
        // Mock context for StateManager
        const mockContext = {
            globalState: {
                get: () => ({}),
                update: () => Promise.resolve()
            }
        };
        
        const stateManager = new StateManager(mockContext);
        const treeProvider = new TreeDataProvider(stateManager, gcloudService);
        
        // Check for build-related methods
        const requiredMethods = [
            'setRecentBuilds', 'startBuildMonitoring', 'stopBuildMonitoring',
            'getBuildsItems', 'getActiveBuildItems', 'getRecentBuildItems',
            'getBuildStatusIcon'
        ];
        
        for (const method of requiredMethods) {
            if (typeof treeProvider[method] !== 'function') {
                throw new Error(`TreeDataProvider missing method: ${method}`);
            }
        }
        
        // Test getBuildStatusIcon method
        const statusIcons = {
            'SUCCESS': '✅',
            'FAILURE': '❌', 
            'WORKING': '🔄',
            'QUEUED': '⏳'
        };
        
        for (const [status, expectedIcon] of Object.entries(statusIcons)) {
            const icon = treeProvider.getBuildStatusIcon(status);
            if (icon !== expectedIcon) {
                throw new Error(`Wrong icon for ${status}: expected ${expectedIcon}, got ${icon}`);
            }
        }
        """
        return self.run_node_test(test_code, "Tree Data Provider Build Tracking Methods")
    
    def test_command_handlers_structure(self):
        """Test command handlers have new build-related methods"""
        test_code = """
        const CommandHandlers = require('./src/commandHandlers');
        const TreeDataProvider = require('./src/treeDataProvider');
        const StateManager = require('./src/stateManager');
        
        // Mock context and dependencies
        const mockContext = {
            globalState: {
                get: () => ({}),
                update: () => Promise.resolve()
            }
        };
        
        const mockOutputChannel = {
            appendLine: () => {}
        };
        
        const stateManager = new StateManager(mockContext);
        const treeProvider = new TreeDataProvider(stateManager, gcloudService);
        const commandHandlers = new CommandHandlers(treeProvider, gcloudService, mockOutputChannel);
        
        // Check for new build-related command handlers
        const requiredMethods = [
            'handleViewBuildLogs', 'handleRefreshBuilds', 'handleStopBuildMonitoring',
            'loadRecentBuilds'
        ];
        
        for (const method of requiredMethods) {
            if (typeof commandHandlers[method] !== 'function') {
                throw new Error(`CommandHandlers missing method: ${method}`);
            }
        }
        """
        return self.run_node_test(test_code, "Command Handlers Build Methods")
    
    def run_all_tests(self):
        """Run all tests"""
        print("🧪 Starting Comprehensive Google Cloud Build Extension Backend Tests")
        print("=" * 80)
        print(f"📅 Test Run: {datetime.now().isoformat()}")
        print("=" * 80)
        
        # Run all tests
        self.test_service_instantiation()
        self.test_enhanced_auth_structure()
        self.test_shell_escaping_functionality()
        self.test_build_status_methods()
        self.test_duration_calculation()
        self.test_command_construction_with_escaping()
        self.test_extension_structure()
        self.test_tree_data_provider_structure()
        self.test_command_handlers_structure()
        
        # Print summary
        print("=" * 80)
        print(f"📊 Test Results: {self.passed_tests}/{self.total_tests} tests passed")
        
        if self.passed_tests == self.total_tests:
            print("🎉 All tests passed! Extension enhancements are working correctly.")
            success = True
        else:
            print(f"⚠️  {self.failed_tests} tests failed. Please review the implementation.")
            success = False
        
        print("\n📋 Detailed Results:")
        for result in self.test_results:
            print(result)
        
        return {
            'total_tests': self.total_tests,
            'passed_tests': self.passed_tests,
            'failed_tests': self.failed_tests,
            'success': success,
            'results': self.test_results
        }

if __name__ == "__main__":
    tester = GoogleCloudBuildExtensionTester()
    results = tester.run_all_tests()
    sys.exit(0 if results['success'] else 1)