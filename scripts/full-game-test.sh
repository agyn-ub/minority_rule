#!/bin/bash

# Load configuration
source ./test-config.sh

echo -e "${BLUE}🎮 FULL GAME TEST - Game ID: $GAME_ID${NC}"
echo "=========================================="
echo ""

# Step 1: Join all players
echo -e "${YELLOW}Step 1: Making all players join the game...${NC}"
./join-all-players.sh

echo ""
echo -e "${YELLOW}Waiting 10 seconds for join transactions to process...${NC}"
sleep 10

# Step 2: First round voting
echo ""
echo -e "${YELLOW}Step 2: First round voting (Scenario 1)...${NC}"
./vote-scenario-1.sh

echo ""
echo -e "${YELLOW}Waiting 15 seconds for vote transactions to process...${NC}"
sleep 15

# Step 3: Check game status
echo ""
echo -e "${YELLOW}Step 3: Checking game status...${NC}"
cd ../
flow scripts execute cadence/scripts/GetGameInfo.cdc $GAME_ID $CONTRACT_ADDRESS --network $NETWORK

echo ""
echo -e "${GREEN}🎉 Full game test completed!${NC}"
echo -e "${BLUE}Check your web app to see the results.${NC}"
echo ""
echo -e "${YELLOW}If the game continues to next round, you can run:${NC}"
echo -e "  ./vote-scenario-2.sh (for different voting pattern)"
echo -e "  ./vote-tie.sh (to test tie scenarios)"