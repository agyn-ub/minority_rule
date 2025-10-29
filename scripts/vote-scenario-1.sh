#!/bin/bash

# Load configuration
source ./test-config.sh

echo -e "${BLUE}🗳️  Voting Scenario 1: 2 YES vs 5 NO${NC}"
echo -e "${GREEN}Player 1 voting YES (you vote YES from browser)${NC}"
echo -e "${RED}Players 2,3,4,5,6 voting NO${NC}"
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

# YES voters (Only Player 1, you vote from browser)
vote_yes $PLAYER1 1 &

# NO voters (Players 2,3,4,5,6) in parallel  
vote_no $PLAYER2 2 &
vote_no $PLAYER3 3 &
vote_no $PLAYER4 4 &
vote_no $PLAYER5 5 &
vote_no $PLAYER6 6 &

# Wait for all votes to complete
wait

echo ""
echo -e "${BLUE}📊 Vote Summary:${NC}"
echo -e "${GREEN}YES votes: 2 (Player 1 + your browser vote)${NC}"
echo -e "${RED}NO votes: 5 (Players 2,3,4,5,6)${NC}"
echo -e "${YELLOW}Expected winners: Player 1 + your account (minority YES)${NC}"