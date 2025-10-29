#!/bin/bash

# Load configuration
source ./test-config.sh

echo -e "${BLUE}🗳️  Voting Scenario 2: 3 YES vs 4 NO${NC}"
echo -e "${GREEN}Players 1,2,3 voting YES${NC}"
echo -e "${RED}Players 4,5,6,7 voting NO${NC}"
echo -e "${YELLOW}Minority (YES) should win this round${NC}"
echo "============================================"

# Function to vote YES
vote_yes() {
    local player=$1
    local player_num=$2
    
    echo -e "${GREEN}Player $player_num voting YES...${NC}"
    
    cd ../
    flow transactions send cadence/transactions/SubmitVote.cdc \
        $GAME_ID true \
        --network $NETWORK --signer $player > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Player $player_num voted YES${NC}"
    else
        echo -e "${RED}❌ Player $player_num YES vote failed${NC}"
    fi
}

# Function to vote NO
vote_no() {
    local player=$1
    local player_num=$2
    
    echo -e "${RED}Player $player_num voting NO...${NC}"
    
    cd ../
    flow transactions send cadence/transactions/SubmitVote.cdc \
        $GAME_ID false \
        --network $NETWORK --signer $player > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Player $player_num voted NO${NC}"
    else
        echo -e "${RED}❌ Player $player_num NO vote failed${NC}"
    fi
}

# YES voters (Players 1,2,3) in parallel
vote_yes $PLAYER1 1 &
vote_yes $PLAYER2 2 &
vote_yes $PLAYER3 3 &

# NO voters (Players 4,5,6,7) in parallel  
vote_no $PLAYER4 4 &
vote_no $PLAYER5 5 &
vote_no $PLAYER6 6 &
vote_no $PLAYER7 7 &

# Wait for all votes to complete
wait

echo ""
echo -e "${BLUE}📊 Vote Summary:${NC}"
echo -e "${GREEN}YES votes: 3 (Players 1,2,3)${NC}"
echo -e "${RED}NO votes: 4 (Players 4,5,6,7)${NC}"
echo -e "${YELLOW}Expected winners: Players 1,2,3 (minority)${NC}"