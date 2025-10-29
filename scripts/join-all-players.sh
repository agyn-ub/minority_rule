#!/bin/bash

# Load configuration
source ./test-config.sh

echo -e "${BLUE}🎮 Making all 7 players join Game ID: $GAME_ID${NC}"
echo "============================================"

# Function to join game for a player
join_player() {
    local player=$1
    local player_num=$2
    
    echo -e "${YELLOW}Player $player_num ($player) joining...${NC}"
    
    cd ../
    flow transactions send cadence/transactions/JoinGame.cdc \
        $GAME_ID \
        --network $NETWORK --signer $player > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Player $player_num joined successfully${NC}"
    else
        echo -e "${RED}❌ Player $player_num failed to join${NC}"
    fi
}

# Start all join transactions in parallel
join_player $PLAYER1 1 &
join_player $PLAYER2 2 &
join_player $PLAYER3 3 &
join_player $PLAYER4 4 &
join_player $PLAYER5 5 &
join_player $PLAYER6 6 &
join_player $PLAYER7 7 &

# Wait for all background jobs to complete
wait

echo ""
echo -e "${GREEN}🎉 All players have attempted to join Game $GAME_ID!${NC}"
echo -e "${BLUE}You can now run voting scripts.${NC}"