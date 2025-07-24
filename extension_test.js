// Test extension loading and basic functionality
const path = require('path');

async function testExtensionLoading() {
    console.log('🔌 Testing VSCode Extension Loading and Core Functionality...\n');
    
    try {
        // Test if main extension file exists and can be loaded
        const extensionPath = path.join(__dirname, 'extension.js');
        console.log('📁 Extension path:', extensionPath);
        
        // Check if extension.js exists
        const fs = require('fs');
        if (fs.existsSync(extensionPath)) {
            console.log('✅ Extension main file exists');
            
            // Try to load the extension module (without VSCode context)
            try {
                const extension = require('./extension.js');
                console.log('✅ Extension module can be loaded');
                
                // Check if activate function exists
                if (typeof extension.activate === 'function') {
                    console.log('✅ Extension has activate function');
                } else {
                    console.log('⚠️  Extension missing activate function');
                }
                
                // Check if deactivate function exists
                if (typeof extension.deactivate === 'function') {
                    console.log('✅ Extension has deactivate function');
                } else {
                    console.log('ℹ️  Extension has no deactivate function (optional)');
                }
                
            } catch (error) {
                console.log('⚠️  Extension module loading failed (expected without VSCode context):', error.message);
            }
        } else {
            console.log('❌ Extension main file not found');
        }
        
        // Test individual service modules
        console.log('\n🔧 Testing individual service modules...');
        
        const services = [
            'gcloudService.js',
            'stateManager.js',
            'treeDataProvider.js',
            'commandHandlers.js',
            'pinManager.js'
        ];
        
        for (const service of services) {
            try {
                const servicePath = path.join(__dirname, 'src', service);
                if (fs.existsSync(servicePath)) {
                    const serviceModule = require(servicePath);
                    console.log(`✅ ${service} can be loaded`);
                    
                    // Special check for GCloudService
                    if (service === 'gcloudService.js') {
                        const GCloudService = serviceModule;
                        const instance = new GCloudService();
                        if (typeof instance.escapeShellArg === 'function') {
                            console.log('  ✅ escapeShellArg method available');
                        }
                        if (typeof instance.triggerBuild === 'function') {
                            console.log('  ✅ triggerBuild method available');
                        }
                    }
                } else {
                    console.log(`❌ ${service} not found`);
                }
            } catch (error) {
                console.log(`⚠️  ${service} loading failed:`, error.message);
            }
        }
        
        // Test package.json configuration
        console.log('\n📦 Testing package.json configuration...');
        const packageJson = require('./package.json');
        
        if (packageJson.version === '0.0.2') {
            console.log('✅ Version correctly updated to 0.0.2');
        } else {
            console.log(`❌ Version is ${packageJson.version}, expected 0.0.2`);
        }
        
        if (packageJson.main === './extension.js') {
            console.log('✅ Main entry point correctly set');
        } else {
            console.log(`❌ Main entry point is ${packageJson.main}, expected ./extension.js`);
        }
        
        if (packageJson.engines && packageJson.engines.vscode) {
            console.log('✅ VSCode engine requirement specified');
        } else {
            console.log('❌ VSCode engine requirement missing');
        }
        
        console.log('\n🎯 Extension loading test completed!');
        
    } catch (error) {
        console.error('❌ Extension loading test failed:', error);
    }
}

// Run the test
testExtensionLoading().catch(console.error);