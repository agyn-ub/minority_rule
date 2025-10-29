const crypto = require('crypto');
const { keccak256 } = require('js-sha3');

// Function to generate commit hash using SHA3-256 (like the contract)
function generateCommitHash(vote, salt) {
    const voteString = vote ? "true" : "false";
    const combined = voteString + salt;
    return keccak256(combined); // SHA3-256
}

// Generate random 32-byte salt
function generateSalt() {
    return crypto.randomBytes(32).toString('hex');
}

// Players and their votes (5 YES, 2 NO - so NO wins)
const players = [
    { name: "two-account", vote: true },    // YES (creator)
    { name: "one-account", vote: true },   // YES
    { name: "three-account", vote: false }, // NO
    { name: "four-account", vote: true },   // YES
    { name: "five-account", vote: true },   // YES
    { name: "six-account", vote: false },   // NO  
    { name: "seven-account", vote: true }   // YES
];

console.log("🔒 COMMIT-REVEAL VOTING SIMULATION (SHA3-256)");
console.log("Question: Is the sky blue?");
console.log("Strategy: 5 YES, 2 NO (NO should win as minority)");
console.log("=====================================\n");

const commitData = [];

players.forEach((player, index) => {
    const salt = generateSalt();
    const hash = generateCommitHash(player.vote, salt);
    
    commitData.push({
        player: player.name,
        vote: player.vote,
        salt: salt,
        hash: hash
    });
    
    console.log(`${index + 1}. ${player.name}:`);
    console.log(`   Vote: ${player.vote ? 'YES' : 'NO'}`);
    console.log(`   Salt: ${salt}`);
    console.log(`   Hash: ${hash}`);
    console.log();
});

console.log("\n🎯 COMMIT TRANSACTIONS:");
commitData.forEach((data, index) => {
    console.log(`flow transactions send cadence/transactions/SubmitCommit.cdc 1 "${data.hash}" --network testnet --signer ${data.player}`);
});

console.log("\n🔓 REVEAL TRANSACTIONS (use after all commits):");
commitData.forEach((data, index) => {
    console.log(`flow transactions send cadence/transactions/SubmitReveal.cdc 1 ${data.vote} "${data.salt}" --network testnet --signer ${data.player}`);
});

console.log("\n📊 EXPECTED RESULTS:");
const yesVotes = commitData.filter(d => d.vote).length;
const noVotes = commitData.filter(d => !d.vote).length;
console.log(`YES votes: ${yesVotes}, NO votes: ${noVotes}`);
console.log(`Minority: ${yesVotes < noVotes ? 'YES' : 'NO'} (${Math.min(yesVotes, noVotes)} players advance)`);
console.log(`Advancing players:`, commitData.filter(d => d.vote === (yesVotes < noVotes)).map(d => d.player));