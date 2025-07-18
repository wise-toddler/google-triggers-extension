#!/usr/bin/env node

// Test script to verify shell escaping functionality
const GCloudService = require('./src/gcloudService');

// Test data similar to the problematic SSH key
const testData = {
    simple: 'simple-value',
    withSpaces: 'value with spaces',
    withQuotes: 'value with "quotes" and \'single quotes\'',
    multiLine: `-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAABlwAAAAdzc2gtcn
NhAAAAAwEAAQAAAYEAwNEkxbvBqh3EkxwrVkU+GNTlEwt9j5XvyUq6ORf47gnVmniVeP/H
-----END OPENSSH PRIVATE KEY-----`,
    withSpecialChars: 'value with $pecial @nd &weird *chars!'
};

const gcloudService = new GCloudService();

console.log('🧪 Testing shell escaping functionality...\n');

Object.entries(testData).forEach(([key, value]) => {
    console.log(`📝 Testing "${key}":`);
    console.log(`   Original: ${JSON.stringify(value)}`);
    console.log(`   Escaped:  ${gcloudService.escapeShellArg(value)}`);
    console.log('');
});

// Test the full substitutions string creation
console.log('🔧 Testing full substitutions string creation:');
const mockSubstitutions = {
    '_CLUSTER': 'emergent-1-cluster',
    '_LOCATION': 'us-central1',
    '_PRIVATE_KEY': testData.multiLine,
    '_PUBLIC_KEY': 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQDA0STFu8GqHc...'
};

console.log('\n📊 Mock substitutions:');
const subsString = Object.entries(mockSubstitutions)
    .map(([key, value]) => `${key}=${gcloudService.escapeShellArg(value)}`)
    .join(',');

console.log('Substitutions string length:', subsString.length);
console.log('First 200 chars:', subsString.substring(0, 200) + '...');

// Test command construction
console.log('\n🚀 Testing command construction:');
const mockCommand = `gcloud builds triggers run test-trigger --project=test-project --format=json --region=us-central1 --branch=main --substitutions=${gcloudService.escapeShellArg(subsString)}`;

console.log('Command preview (first 300 chars):');
console.log(mockCommand.substring(0, 300) + '...');

console.log('\n✅ Shell escaping test completed!');