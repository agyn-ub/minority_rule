import { sha3_256 } from 'js-sha3';

/**
 * Generate a cryptographically random 64-character hex salt
 */
export function generateSalt(): string {
  // Generate 32 random bytes and convert to hex
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate commit hash using SHA3_256 (matches Flow contract)
 * @param vote - Boolean vote (true or false)
 * @param salt - 64-character hex salt
 * @returns SHA3_256 hash as hex string
 */
export function generateCommitHash(vote: boolean, salt: string): string {
  if (salt.length !== 64) {
    throw new Error('Salt must be exactly 64 characters (32 bytes hex)');
  }
  
  const voteString = vote ? 'true' : 'false';
  const combinedString = voteString + salt;
  
  // Use SHA3_256 to match Flow contract: HashAlgorithm.SHA3_256.hash()
  return sha3_256(combinedString);
}

/**
 * Generate complete voting data for a player
 * @param salt - Optional salt, will generate if not provided
 * @returns Complete voting data with hashes and commands
 */
export function generateVotingData(salt?: string) {
  const actualSalt = salt || generateSalt();
  const hashTrue = generateCommitHash(true, actualSalt);
  const hashFalse = generateCommitHash(false, actualSalt);
  
  return {
    salt: actualSalt,
    hashes: {
      voteTrue: hashTrue,
      voteFalse: hashFalse
    },
    // For debugging/verification
    debug: {
      trueString: 'true' + actualSalt,
      falseString: 'false' + actualSalt,
      algorithm: 'SHA3_256'
    }
  };
}

/**
 * Verify that a vote and salt combination produces the expected hash
 * @param vote - The vote value
 * @param salt - The salt used
 * @param expectedHash - The hash to verify against
 * @returns True if hash matches, false otherwise
 */
export function verifyVoteHash(vote: boolean, salt: string, expectedHash: string): boolean {
  try {
    const calculatedHash = generateCommitHash(vote, salt);
    return calculatedHash.toLowerCase() === expectedHash.toLowerCase();
  } catch (error) {
    console.error('Hash verification failed:', error);
    return false;
  }
}

/**
 * Store voting data in localStorage for later retrieval
 * @param gameId - Game ID
 * @param votingData - Voting data to store
 */
export function storeVotingData(gameId: string, votingData: ReturnType<typeof generateVotingData>) {
  const key = `voting_data_${gameId}`;
  localStorage.setItem(key, JSON.stringify({
    ...votingData,
    timestamp: new Date().toISOString(),
    gameId
  }));
}

/**
 * Retrieve voting data from localStorage
 * @param gameId - Game ID
 * @returns Stored voting data or null if not found
 */
export function getStoredVotingData(gameId: string) {
  const key = `voting_data_${gameId}`;
  const stored = localStorage.getItem(key);
  if (!stored) return null;
  
  try {
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to parse stored voting data:', error);
    return null;
  }
}