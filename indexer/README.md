# Minority Rule Game Indexer

A dedicated blockchain indexer service for the Minority Rule game built with Express.js and Flow blockchain integration.

## Purpose

This service solves the duplicate key constraint violations that occur when multiple clients try to write to the database simultaneously. It provides a single point of truth for all blockchain event processing and database updates.

## Architecture

```
indexer/
├── src/
│   ├── server.js              # Express server with health endpoints
│   ├── database/
│   │   ├── types.js           # JSDoc type definitions from SQL schema
│   │   └── client.js          # Supabase client with UPSERT operations
│   ├── flow/
│   │   └── eventListener.js   # Flow blockchain event processing
│   ├── processors/
│   │   └── gameEventProcessor.js # Game state processing logic
│   └── utils/
│       └── logger.js          # Winston logging configuration
└── package.json
```

## Features

- **Single Database Writer**: Prevents race conditions and duplicate key errors
- **UPSERT Operations**: Handles concurrent writes gracefully using database-level conflict resolution
- **Flow Event Processing**: Listens to all game events (GameCreated, PlayerJoined, VoteCommitted, etc.)
- **Health Monitoring**: REST endpoints for service health and database connectivity
- **Comprehensive Logging**: Winston-based logging with multiple transports
- **Type Safety**: JSDoc annotations for IDE support in JavaScript

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Required Environment Variables**
   ```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   FLOW_NETWORK=emulator
   FLOW_ACCESS_NODE=http://localhost:8888
   FLOW_CONTRACT_ADDRESS=0x01
   PORT=3001
   ```

## Development

```bash
# Development with auto-reload
npm run dev

# Production
npm start
```

## Health Endpoints

- `GET /health` - Overall service health
- `GET /health/database` - Database connectivity
- `GET /status` - Service information

## Database Types

The service uses JSDoc type annotations that mirror your SQL schema exactly:

```javascript
/**
 * @typedef {Object} Game
 * @property {number} game_id
 * @property {string} question_text  
 * @property {number} entry_fee
 * // ... rest of properties
 */
```

This provides IDE support and type checking while maintaining JavaScript simplicity.

## Event Processing

The indexer listens for these Flow blockchain events:

- **GameCreated** → Creates game record and adds creator as player
- **PlayerJoined** → Adds player to game and updates statistics  
- **VoteCommitted** → Stores vote commitment hash
- **VoteRevealed** → Stores revealed vote and salt
- **RoundProcessed** → Creates round record with voting results
- **GameCompleted** → Updates game state and distributes prizes

## Deployment

### Local Development
- Runs alongside your Next.js frontend
- Uses same Supabase database
- Connects to Flow emulator

### Production (Vercel)
- Deploy as separate service
- Configure environment variables
- Ensure database access permissions

The indexer service ensures data consistency and eliminates the race conditions that were causing duplicate key errors in your frontend application.