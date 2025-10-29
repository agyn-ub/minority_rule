#!/bin/bash

if [ -z "$1" ]; then
    echo "Usage: ./set-game-id.sh <gameId>"
    echo "Example: ./set-game-id.sh 5"
    exit 1
fi

NEW_GAME_ID=$1

# Update the GAME_ID in test-config.sh
sed -i '' "s/export GAME_ID=.*/export GAME_ID=$NEW_GAME_ID/" test-config.sh

echo -e "\033[0;32m✅ Game ID updated to: $NEW_GAME_ID\033[0m"
echo "You can now run join-all-players.sh and vote scripts with game ID $NEW_GAME_ID"