/**
 * Centralized transaction wrappers that automatically include contract address
 * Components can use these instead of importing individual transactions and managing contract addresses
 */

import { getMinorityRuleGameAddress } from './config';

// Import all transaction Cadence code
import { CREATE_GAME } from './cadence/transactions/CreateGame';
import { JOIN_GAME } from './cadence/transactions/JoinGame';
import { SUBMIT_COMMIT } from './cadence/transactions/SubmitCommit';
import { SUBMIT_REVEAL } from './cadence/transactions/SubmitReveal';
import { SET_COMMIT_DEADLINE } from './cadence/transactions/SetCommitDeadline';
import { SET_REVEAL_DEADLINE } from './cadence/transactions/SetRevealDeadline';
import { PROCESS_ROUND } from './cadence/transactions/ProcessRound';

/**
 * Create a new game
 */
export const createGameTransaction = (questionText: string, entryFee: string) => ({
  cadence: CREATE_GAME,
  args: (arg: any, t: any) => [
    arg(questionText, t.String),
    arg(entryFee, t.UFix64),
    arg(getMinorityRuleGameAddress(), t.Address)
  ]
});

/**
 * Join an existing game
 */
export const joinGameTransaction = (gameId: string) => ({
  cadence: JOIN_GAME,
  args: (arg: any, t: any) => [
    arg(gameId, t.UInt64),
    arg(getMinorityRuleGameAddress(), t.Address)
  ]
});

/**
 * Submit vote commitment (hash)
 */
export const submitCommitTransaction = (gameId: string, commitHash: string) => ({
  cadence: SUBMIT_COMMIT,
  args: (arg: any, t: any) => [
    arg(gameId, t.UInt64),
    arg(commitHash, t.String),
    arg(getMinorityRuleGameAddress(), t.Address)
  ]
});

/**
 * Reveal vote (actual vote + salt)
 */
export const submitRevealTransaction = (gameId: string, vote: boolean, salt: string) => ({
  cadence: SUBMIT_REVEAL,
  args: (arg: any, t: any) => [
    arg(gameId, t.UInt64),
    arg(vote, t.Bool),
    arg(salt, t.String),
    arg(getMinorityRuleGameAddress(), t.Address)
  ]
});

/**
 * Set commit deadline for a round
 */
export const setCommitDeadlineTransaction = (gameId: string, durationSeconds: string) => ({
  cadence: SET_COMMIT_DEADLINE,
  args: (arg: any, t: any) => [
    arg(gameId, t.UInt64),
    arg(durationSeconds, t.UFix64),
    arg(getMinorityRuleGameAddress(), t.Address)
  ]
});

/**
 * Set reveal deadline for a round
 */
export const setRevealDeadlineTransaction = (gameId: string, durationSeconds: string) => ({
  cadence: SET_REVEAL_DEADLINE,
  args: (arg: any, t: any) => [
    arg(gameId, t.UInt64),
    arg(durationSeconds, t.UFix64),
    arg(getMinorityRuleGameAddress(), t.Address)
  ]
});

/**
 * Process the current round
 */
export const processRoundTransaction = (gameId: string) => ({
  cadence: PROCESS_ROUND,
  args: (arg: any, t: any) => [
    arg(gameId, t.UInt64),
    arg(getMinorityRuleGameAddress(), t.Address)
  ]
});

/**
 * Common transaction options for convenience
 */
export const defaultTransactionOptions = {
  proposer: null as any, // Will be set to fcl.authz by caller
  payer: null as any,    // Will be set to fcl.authz by caller
  authorizations: [] as any[], // Will be set to [fcl.authz] by caller
  limit: 1000
};