#!/bin/bash

# Load configuration
source ./test-config.sh

# Check if transaction ID was provided
if [ $# -eq 0 ]; then
    echo -e "${RED}❌ Error: Please provide a transaction ID${NC}"
    echo -e "${YELLOW}Usage: $0 <transaction_id>${NC}"
    echo -e "${BLUE}Example: $0 12345${NC}"
    exit 1
fi

TRANSACTION_ID=$1

echo -e "${BLUE}🔍 Checking status of scheduled transaction ID: $TRANSACTION_ID${NC}"
echo "============================================"

# Change to parent directory to run flow command
cd ../

# Execute the Cadence script
echo -e "${YELLOW}Querying transaction status...${NC}"
RESULT=$(flow scripts execute cadence/scripts/GetScheduledTransactionStatus.cdc $TRANSACTION_ID --network $NETWORK 2>&1)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Transaction status retrieved successfully${NC}"
    echo ""
    echo -e "${BLUE}Result:${NC}"
    echo "$RESULT" | jq '.' 2>/dev/null || echo "$RESULT"
else
    echo -e "${RED}❌ Failed to retrieve transaction status${NC}"
    echo -e "${YELLOW}Error details:${NC}"
    echo "$RESULT"
    exit 1
fi

echo ""
echo -e "${BLUE}Status Codes:${NC}"
echo -e "  0 = pending"
echo -e "  1 = executing" 
echo -e "  2 = executed"
echo -e "  3 = cancelled"
echo -e "  4 = failed"