#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { sha3_256 } = require('js-sha3');

// Check command line arguments
if (process.argv.length !== 3) {
    console.log('Usage: node generate-salt.js <accountName>');
    console.log('Example: node generate-salt.js three-account');
    process.exit(1);
}

const accountName = process.argv[2];

function generateSalt() {
    return crypto.randomBytes(32).toString('hex');
}

function generateCommitHash(vote, salt) {
    const voteString = vote ? "true" : "false";
    const combinedString = voteString + salt;
    // Use SHA3_256 to match Flow contract: HashAlgorithm.SHA3_256.hash()
    return sha3_256(combinedString);
}

// Generate voting data
const salt = generateSalt();
const hashTrue = generateCommitHash(true, salt);
const hashFalse = generateCommitHash(false, salt);
const timestamp = new Date().toISOString();

// Create voting data object
const votingData = {
    account: accountName,
    timestamp: timestamp,
    salt: salt,
    hashes: {
        voteTrue: hashTrue,
        voteFalse: hashFalse
    },
    commands: {
        commitTrue: `flow transactions send cadence/transactions/SubmitCommit.cdc <GAME_ID> "${hashTrue}" --network testnet --signer ${accountName}`,
        commitFalse: `flow transactions send cadence/transactions/SubmitCommit.cdc <GAME_ID> "${hashFalse}" --network testnet --signer ${accountName}`,
        revealTrue: `flow transactions send cadence/transactions/SubmitReveal.cdc <GAME_ID> true "${salt}" --network testnet --signer ${accountName}`,
        revealFalse: `flow transactions send cadence/transactions/SubmitReveal.cdc <GAME_ID> false "${salt}" --network testnet --signer ${accountName}`
    }
};

// Create output directory if it doesn't exist
const outputDir = 'voting-data';
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

// Write voting data to JSON file
const dataFilename = `${outputDir}/${accountName}-voting-data.json`;
fs.writeFileSync(dataFilename, JSON.stringify(votingData, null, 2));

// Generate shell scripts
const commitTrueScript = `#!/bin/bash
echo "Committing vote=TRUE for account ${accountName}"
echo "Replace <GAME_ID> with your actual game ID"
${votingData.commands.commitTrue}
`;

const commitFalseScript = `#!/bin/bash
echo "Committing vote=FALSE for account ${accountName}"
echo "Replace <GAME_ID> with your actual game ID"
${votingData.commands.commitFalse}
`;

const revealTrueScript = `#!/bin/bash
echo "Revealing vote=TRUE for account ${accountName}"
echo "Replace <GAME_ID> with your actual game ID"
${votingData.commands.revealTrue}
`;

const revealFalseScript = `#!/bin/bash
echo "Revealing vote=FALSE for account ${accountName}"
echo "Replace <GAME_ID> with your actual game ID"
${votingData.commands.revealFalse}
`;

// Write script files
const scriptsDir = `${outputDir}/scripts`;
if (!fs.existsSync(scriptsDir)) {
    fs.mkdirSync(scriptsDir);
}

const scriptPrefix = `${accountName}`;
fs.writeFileSync(`${scriptsDir}/${scriptPrefix}-commit-true.sh`, commitTrueScript);
fs.writeFileSync(`${scriptsDir}/${scriptPrefix}-commit-false.sh`, commitFalseScript);
fs.writeFileSync(`${scriptsDir}/${scriptPrefix}-reveal-true.sh`, revealTrueScript);
fs.writeFileSync(`${scriptsDir}/${scriptPrefix}-reveal-false.sh`, revealFalseScript);

// Make scripts executable
const scriptFiles = [
    `${scriptsDir}/${scriptPrefix}-commit-true.sh`,
    `${scriptsDir}/${scriptPrefix}-commit-false.sh`,
    `${scriptsDir}/${scriptPrefix}-reveal-true.sh`,
    `${scriptsDir}/${scriptPrefix}-reveal-false.sh`
];

scriptFiles.forEach(file => {
    fs.chmodSync(file, '755');
});

// Display results
console.log(`✅ Generated voting data for Account: ${accountName}`);
console.log('');
console.log('📊 Voting Information:');
console.log(`Salt: ${salt}`);
console.log(`Hash for TRUE:  ${hashTrue}`);
console.log(`Hash for FALSE: ${hashFalse}`);
console.log('');
console.log('📁 Files Created:');
console.log(`Data: ${dataFilename}`);
console.log(`Scripts: ${scriptsDir}/${scriptPrefix}-*.sh`);
console.log('');
console.log('🚀 Usage:');
console.log('1. Edit the scripts to replace <GAME_ID> with your actual game ID');
console.log('2. Choose your vote and run the appropriate commit script:');
console.log(`   ./${scriptsDir}/${scriptPrefix}-commit-true.sh     # To vote YES`);
console.log(`   ./${scriptsDir}/${scriptPrefix}-commit-false.sh    # To vote NO`);
console.log('');
console.log('3. After reveal phase starts, run the matching reveal script:');
console.log(`   ./${scriptsDir}/${scriptPrefix}-reveal-true.sh     # If you voted YES`);
console.log(`   ./${scriptsDir}/${scriptPrefix}-reveal-false.sh    # If you voted NO`);
console.log('');
console.log('⚠️  IMPORTANT: Remember which vote you committed to!');
console.log('💡 TIP: The salt is game-independent and can be reused across different games.');