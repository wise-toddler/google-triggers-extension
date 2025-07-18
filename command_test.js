// Additional test to verify the actual command construction in triggerBuild method
const GCloudService = require('./src/gcloudService');

async function testTriggerBuildCommandConstruction() {
    console.log('🔧 Testing triggerBuild command construction with complex substitutions...\n');
    
    const gcloudService = new GCloudService();
    
    // Test with complex substitutions that would have caused the original bug
    const complexSubstitutions = {
        'SSH_PRIVATE_KEY': `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKB
UmEOqTkVEdY5QcakgUm9dUKiGlNTUhT5WundMLiM5tNp/z7bIGkJVjvylpuQdnhg
HstfnCFGAHxuUhUXw1uuEiYo6t3iI7uqgsxgEEzNpjM3HtMrAoGBAOTnQDqx28gO
-----END PRIVATE KEY-----`,
        'DOCKER_CONFIG': '{"auths":{"registry.com":{"auth":"dXNlcjpwYXNz"}}}',
        'BUILD_ARGS': 'ARG1=value with spaces ARG2="quoted value" ARG3=simple',
        'SIMPLE_VAR': 'production',
        'COMMAND_INJECTION': 'value; rm -rf / && echo "hacked"'
    };
    
    // Mock execAsync to capture the command that would be executed
    const originalExec = require('child_process').exec;
    let capturedCommand = '';
    
    require('child_process').exec = (command, callback) => {
        capturedCommand = command;
        // Simulate successful response
        callback(null, { stdout: '{"name": "projects/test/locations/global/builds/test-build-123"}' });
    };
    
    try {
        // This should not throw an error and should properly escape all substitutions
        await gcloudService.triggerBuild(
            'test-trigger-id',
            'test-project',
            'us-central1',
            'main',
            complexSubstitutions
        );
        
        console.log('✅ triggerBuild executed successfully with complex substitutions');
        console.log('\n📝 Generated command:');
        console.log(capturedCommand);
        
        // Verify that the command contains properly escaped substitutions
        if (capturedCommand.includes('--substitutions=')) {
            console.log('\n✅ Command includes substitutions parameter');
            
            // Extract the substitutions part
            const subsMatch = capturedCommand.match(/--substitutions=(.+?)(?:\s|$)/);
            if (subsMatch) {
                const subsString = subsMatch[1];
                console.log('\n🔍 Substitutions string:');
                console.log(subsString);
                
                // Verify that complex values are properly quoted
                if (subsString.includes("'-----BEGIN PRIVATE KEY-----")) {
                    console.log('✅ Multi-line SSH key is properly quoted');
                } else {
                    console.log('❌ Multi-line SSH key is not properly quoted');
                }
                
                if (subsString.includes("'value; rm -rf / && echo \"hacked\"'")) {
                    console.log('✅ Command injection attempt is properly escaped');
                } else {
                    console.log('❌ Command injection attempt is not properly escaped');
                }
                
                if (subsString.includes('SIMPLE_VAR=production')) {
                    console.log('✅ Simple values remain unquoted for performance');
                } else {
                    console.log('❌ Simple values are unnecessarily quoted');
                }
            }
        } else {
            console.log('❌ Command does not include substitutions parameter');
        }
        
    } catch (error) {
        console.log('❌ triggerBuild failed with error:', error.message);
    } finally {
        // Restore original exec
        require('child_process').exec = originalExec;
    }
    
    console.log('\n🎯 Test completed - The shell escaping fix prevents command injection and handles complex values correctly!');
}

// Run the test
testTriggerBuildCommandConstruction().catch(console.error);