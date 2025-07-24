// Test file for Google Cloud Build Extension - Shell Escaping Functionality
// Testing the critical bug fix for shell escaping of substitution values

const GCloudService = require('./src/gcloudService');

class TestRunner {
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

    // Test 1: Simple alphanumeric strings should remain unescaped
    testSimpleStrings() {
        const testCases = [
            'simple',
            'test123',
            'my-value',
            'my_value',
            'version1.2.3',
            'abc-123_def.456'
        ];

        for (const testCase of testCases) {
            const result = this.gcloudService.escapeShellArg(testCase);
            if (result !== testCase) {
                return `Simple string "${testCase}" should remain unescaped, got "${result}"`;
            }
        }
        return true;
    }

    // Test 2: Strings with spaces should be quoted
    testStringsWithSpaces() {
        const testCases = [
            { input: 'hello world', expected: "'hello world'" },
            { input: 'my test value', expected: "'my test value'" },
            { input: 'value with spaces', expected: "'value with spaces'" }
        ];

        for (const testCase of testCases) {
            const result = this.gcloudService.escapeShellArg(testCase.input);
            if (result !== testCase.expected) {
                return `String with spaces "${testCase.input}" should be "${testCase.expected}", got "${result}"`;
            }
        }
        return true;
    }

    // Test 3: Multi-line strings should be quoted and preserve newlines
    testMultiLineStrings() {
        const testCases = [
            {
                input: 'line1\nline2',
                expected: "'line1\nline2'"
            },
            {
                input: 'first line\nsecond line\nthird line',
                expected: "'first line\nsecond line\nthird line'"
            },
            {
                input: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----',
                expected: "'-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----'"
            }
        ];

        for (const testCase of testCases) {
            const result = this.gcloudService.escapeShellArg(testCase.input);
            if (result !== testCase.expected) {
                return `Multi-line string should be properly quoted and preserve newlines. Expected "${testCase.expected}", got "${result}"`;
            }
        }
        return true;
    }

    // Test 4: Strings with quotes should escape quotes properly
    testStringsWithQuotes() {
        const testCases = [
            {
                input: "hello 'world'",
                expected: "'hello '\"'\"'world'\"'\"''"
            },
            {
                input: "it's a test",
                expected: "'it'\"'\"'s a test'"
            },
            {
                input: "'quoted'",
                expected: "''\"'\"'quoted'\"'\"''"
            },
            {
                input: "multiple 'quotes' in 'string'",
                expected: "'multiple '\"'\"'quotes'\"'\"' in '\"'\"'string'\"'\"''"
            }
        ];

        for (const testCase of testCases) {
            const result = this.gcloudService.escapeShellArg(testCase.input);
            if (result !== testCase.expected) {
                return `String with quotes "${testCase.input}" should be properly escaped. Expected "${testCase.expected}", got "${result}"`;
            }
        }
        return true;
    }

    // Test 5: Null and undefined values should be handled
    testNullAndUndefinedValues() {
        const nullResult = this.gcloudService.escapeShellArg(null);
        const undefinedResult = this.gcloudService.escapeShellArg(undefined);

        if (nullResult !== '""') {
            return `Null value should return '""', got "${nullResult}"`;
        }

        if (undefinedResult !== '""') {
            return `Undefined value should return '""', got "${undefinedResult}"`;
        }

        return true;
    }

    // Test 6: Special characters should be properly escaped
    testSpecialCharacters() {
        const testCases = [
            {
                input: 'value with $VAR',
                expected: "'value with $VAR'"
            },
            {
                input: 'command && echo "test"',
                expected: "'command && echo \"test\"'"
            },
            {
                input: 'path/to/file; rm -rf /',
                expected: "'path/to/file; rm -rf /'"
            },
            {
                input: 'value with `backticks`',
                expected: "'value with `backticks`'"
            }
        ];

        for (const testCase of testCases) {
            const result = this.gcloudService.escapeShellArg(testCase.input);
            if (result !== testCase.expected) {
                return `Special characters in "${testCase.input}" should be properly escaped. Expected "${testCase.expected}", got "${result}"`;
            }
        }
        return true;
    }

    // Test 7: Test command construction with substitutions
    testCommandConstruction() {
        // Mock the execAsync to avoid actual gcloud calls
        const originalExecAsync = require('util').promisify(require('child_process').exec);
        
        // Test substitutions formatting
        const substitutions = {
            'SIMPLE_VAR': 'simple123',
            'VAR_WITH_SPACES': 'hello world',
            'MULTILINE_VAR': 'line1\nline2\nline3',
            'VAR_WITH_QUOTES': "it's a 'test'",
            'SPECIAL_VAR': 'value with $VAR && echo "test"'
        };

        // Test the substitutions string construction logic
        const subsString = Object.entries(substitutions)
            .map(([key, value]) => `${key}=${this.gcloudService.escapeShellArg(value)}`)
            .join(',');

        const expectedParts = [
            'SIMPLE_VAR=simple123',
            "VAR_WITH_SPACES='hello world'",
            "MULTILINE_VAR='line1\nline2\nline3'",
            "VAR_WITH_QUOTES='it'\"'\"'s a '\"'\"'test'\"'\"''",
            "SPECIAL_VAR='value with $VAR && echo \"test\"'"
        ];

        const expectedSubsString = expectedParts.join(',');

        if (subsString !== expectedSubsString) {
            return `Substitutions string construction failed. Expected "${expectedSubsString}", got "${subsString}"`;
        }

        return true;
    }

    // Test 8: Test edge cases
    testEdgeCases() {
        const testCases = [
            {
                input: '',
                expected: "''"
            },
            {
                input: ' ',
                expected: "' '"
            },
            {
                input: '\n',
                expected: "'\n'"
            },
            {
                input: '\t',
                expected: "'\t'"
            },
            {
                input: 0,
                expected: '0'
            },
            {
                input: 123,
                expected: '123'
            },
            {
                input: true,
                expected: 'true'
            },
            {
                input: false,
                expected: 'false'
            }
        ];

        for (const testCase of testCases) {
            const result = this.gcloudService.escapeShellArg(testCase.input);
            if (result !== testCase.expected) {
                return `Edge case "${testCase.input}" (${typeof testCase.input}) should return "${testCase.expected}", got "${result}"`;
            }
        }
        return true;
    }

    // Test 9: Test service instantiation and method availability
    testServiceInstantiation() {
        if (!this.gcloudService) {
            return 'GCloudService could not be instantiated';
        }

        if (typeof this.gcloudService.escapeShellArg !== 'function') {
            return 'escapeShellArg method is not available';
        }

        if (typeof this.gcloudService.triggerBuild !== 'function') {
            return 'triggerBuild method is not available';
        }

        if (typeof this.gcloudService.checkAuthStatus !== 'function') {
            return 'checkAuthStatus method is not available';
        }

        if (typeof this.gcloudService.loadProjects !== 'function') {
            return 'loadProjects method is not available';
        }

        if (typeof this.gcloudService.loadTriggers !== 'function') {
            return 'loadTriggers method is not available';
        }

        return true;
    }

    // Run all tests
    async runAllTests() {
        console.log('🧪 Starting Google Cloud Build Extension Tests - Shell Escaping Functionality');
        console.log('=' .repeat(80));

        this.runTest('Service Instantiation', () => this.testServiceInstantiation());
        this.runTest('Simple Strings (Unescaped)', () => this.testSimpleStrings());
        this.runTest('Strings with Spaces', () => this.testStringsWithSpaces());
        this.runTest('Multi-line Strings', () => this.testMultiLineStrings());
        this.runTest('Strings with Quotes', () => this.testStringsWithQuotes());
        this.runTest('Null and Undefined Values', () => this.testNullAndUndefinedValues());
        this.runTest('Special Characters', () => this.testSpecialCharacters());
        this.runTest('Command Construction', () => this.testCommandConstruction());
        this.runTest('Edge Cases', () => this.testEdgeCases());

        console.log('=' .repeat(80));
        console.log(`📊 Test Results: ${this.passedTests}/${this.totalTests} tests passed`);
        
        if (this.passedTests === this.totalTests) {
            console.log('🎉 All tests passed! Shell escaping functionality is working correctly.');
        } else {
            console.log('⚠️  Some tests failed. Please review the implementation.');
        }

        console.log('\n📋 Detailed Results:');
        this.testResults.forEach(result => console.log(result));

        return {
            totalTests: this.totalTests,
            passedTests: this.passedTests,
            success: this.passedTests === this.totalTests,
            results: this.testResults
        };
    }
}

// Run the tests if this file is executed directly
if (require.main === module) {
    const testRunner = new TestRunner();
    testRunner.runAllTests().then(results => {
        process.exit(results.success ? 0 : 1);
    }).catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = TestRunner;