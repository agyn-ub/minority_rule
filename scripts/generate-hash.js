#!/usr/bin/env node

// Generate SHA3-256 hash compatible with Flow's Cadence contract
// Usage: node generate-hash.js <vote> <salt>

const { sha3_256 } = require('js-sha3');

function generateFlowHash(vote, salt) {
    // Match Flow's exact implementation:
    // let voteString = vote ? "true" : "false"
    // let combinedString = voteString.concat(salt)
    // let calculatedHash = String.encodeHex(HashAlgorithm.SHA3_256.hash(combinedString.utf8))
    
    const voteString = vote === true || vote === 'true' ? 'true' : 'false';
    const combinedString = voteString + salt;
    
    // js-sha3 automatically handles UTF-8 encoding and returns lowercase hex
    const hash = sha3_256(combinedString);
    
    return hash;
}

// Generate a 64-character random salt
function generateSalt() {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < 64; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Main execution
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length < 1) {
        console.log('Usage: node generate-hash.js <vote> [salt]');
        console.log('Examples:');
        console.log('  node generate-hash.js true');
        console.log('  node generate-hash.js false abc123...');
        process.exit(1);
    }
    
    const vote = args[0];
    const salt = args[1] || generateSalt();
    
    if (salt.length !== 64) {
        console.error('Error: Salt must be exactly 64 characters');
        process.exit(1);
    }
    
    const hash = generateFlowHash(vote, salt);
    
    console.log('=== Flow Commit-Reveal Hash Generation ===');
    console.log(`Vote: ${vote}`);
    console.log(`Salt: ${salt}`);
    console.log(`Hash: ${hash}`);
    console.log('');
    console.log('For Flow CLI:');
    console.log(`Commit: ${hash}`);
    console.log(`Reveal: vote=${vote}, salt="${salt}"`);
}

module.exports = { generateFlowHash, generateSalt };