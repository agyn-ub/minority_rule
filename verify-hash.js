const crypto = require('crypto');

// Test the hash format exactly as the contract does it
function generateCommitHash(vote, salt) {
    const voteString = vote ? "true" : "false";
    const combined = voteString + salt;
    return crypto.createHash('sha256').update(combined, 'utf8').digest('hex');
}

// Test data from our generation
const testVote = true;
const testSalt = "31a44903c205a04b2a0eb076d77602e6bc72c6c18ed250c1664bac914290877d";
const expectedHash = "c4657d5a514885f2dc375479b5dff3a76aa1e18e61e52ed44b17486a34c63119";

const calculatedHash = generateCommitHash(testVote, testSalt);

console.log("Testing hash generation:");
console.log("Vote:", testVote);
console.log("Salt:", testSalt);
console.log("Combined string:", (testVote ? "true" : "false") + testSalt);
console.log("Expected hash:", expectedHash);
console.log("Calculated hash:", calculatedHash);
console.log("Match:", expectedHash === calculatedHash);

// Test with different orders/formats
console.log("\nTesting variations:");
console.log("1. Contract format (vote + salt):", generateCommitHash(testVote, testSalt));
console.log("2. Reverse (salt + vote):", crypto.createHash('sha256').update(testSalt + (testVote ? "true" : "false"), 'utf8').digest('hex'));
console.log("3. With spaces:", crypto.createHash('sha256').update((testVote ? "true" : "false") + " " + testSalt, 'utf8').digest('hex'));

// Let's check all our hashes match what we expect
console.log("\nChecking all player hashes:");
const players = [
    { name: "two-account", vote: true, salt: "31a44903c205a04b2a0eb076d77602e6bc72c6c18ed250c1664bac914290877d", expectedHash: "c4657d5a514885f2dc375479b5dff3a76aa1e18e61e52ed44b17486a34c63119" },
    { name: "one-account", vote: true, salt: "4a353314ad7229f91d0702c658176254106d1d2ea7243bd46cde69b3d3126e8a", expectedHash: "8e90ab20ee1a0402aca775100dd8544381c7d4ca033862d75e0907a541925e69" },
    { name: "three-account", vote: false, salt: "2225b1b8a41bdf1c9fb584de92ee4cb39a3fc381bd3df85cfb72e29a93a7f2dd", expectedHash: "a46e1942007d603244bd61d7f14ec883cd4c917a567229c31b17cf7ac7c094e5" }
];

players.forEach(player => {
    const calculated = generateCommitHash(player.vote, player.salt);
    console.log(`${player.name}: ${calculated === player.expectedHash ? '✅' : '❌'} ${calculated}`);
});