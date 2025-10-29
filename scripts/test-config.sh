#!/bin/bash

# Game Configuration - CHANGE THIS FOR EACH TEST
export GAME_ID=1

# Network Configuration
export NETWORK="testnet"
export CONTRACT_ADDRESS="0x73c003cd6de60fd4"

# Account Names (from flow.json)
export PLAYER1="one-account"
export PLAYER2="two-account" 
export PLAYER3="three-account"
export PLAYER4="four-account"
export PLAYER5="five-account"
export PLAYER6="six-account"
export PLAYER7="seven-account"

# Colors for output
export RED='\033[0;31m'
export GREEN='\033[0;32m'
export YELLOW='\033[1;33m'
export BLUE='\033[0;34m'
export NC='\033[0m' # No Color

echo -e "${BLUE}Test Configuration Loaded:${NC}"
echo -e "Game ID: ${YELLOW}$GAME_ID${NC}"
echo -e "Network: ${YELLOW}$NETWORK${NC}"
echo -e "Contract: ${YELLOW}$CONTRACT_ADDRESS${NC}"