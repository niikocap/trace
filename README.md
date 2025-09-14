# Rice Supply Chain Management System

A comprehensive rice supply chain management system with blockchain integration using Solana for transaction recording and traditional database for other entities.

## System Overview

This system provides:
- **Blockchain Integration (Solana)**: Records chain transactions on the blockchain
- **Database (SQLite)**: Stores chain actors, production seasons, milled rice, and rice batches
- **Backend (Node.js/Express)**: RESTful APIs for all operations
- **Frontend (HTML/CSS/JavaScript)**: Table-based UI with sidebar navigation

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Frontend     │    │     Backend     │    │   Blockchain    │
│  (HTML/CSS/JS)  │◄──►│  (Node.js/API)  │◄──►│    (Solana)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                        ┌─────────────────┐
                        │    Database     │
                        │    (SQLite)     │
                        └─────────────────┘
```

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Rust (for Solana program development)
- Anchor CLI (for Solana program deployment)
- Git

## Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd solana
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Initialize the database
npm run init-db

# Start the backend server
npm run dev
```

The backend server will start on `http://localhost:3000`

### 3. Solana Program Setup

```bash
# Navigate to solana-program directory
cd solana-program

# Install dependencies
npm install

# Build the program (requires Rust and Anchor)
anchor build

# Deploy to localnet (optional)
anchor deploy --provider.cluster localnet
```

### 4. Frontend Setup

The frontend is a static HTML application. You can:

**Option A: Use the backend's static file serving**
- The backend automatically serves the frontend from `http://localhost:3000`

**Option B: Use a separate web server**
```bash
# Navigate to frontend directory
cd frontend

# Serve using Python (if available)
python -m http.server 8080

# Or use Node.js http-server
npx http-server -p 8080
```

## Project Structure

```
solana/
├── backend/                 # Node.js backend
│   ├── config/             # Database and Solana configuration
│   ├── routes/             # API route handlers
│   ├── scripts/            # Database initialization scripts
│   ├── package.json        # Backend dependencies
│   └── server.js           # Main server file
├── frontend/               # HTML/CSS/JavaScript frontend
│   ├── css/               # Stylesheets
│   ├── js/                # JavaScript files
│   └── index.html         # Main HTML file
├── solana-program/         # Solana blockchain program
│   ├── programs/          # Rust program source
│   ├── Anchor.toml        # Anchor configuration
│   ├── Cargo.toml         # Rust workspace configuration
│   └── package.json       # Program dependencies
└── README.md              # This file
```

## API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication
Currently, no authentication is required for API access.

### Response Format
All API responses follow this format:
```json
{
  "success": true|false,
  "data": <response_data>,
  "error": "<error_message>",
  "message": "<success_message>"
}
```

## Blockchain Transaction APIs

### GET /api/transactions
Retrieve all transactions from the blockchain.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "transaction_id": "string",
      "transaction_type": "string",
      "from_actor_id": "string",
      "to_actor_id": "string",
      "batch_ids": ["string"],
      "quantity": "number",
      "unit_price": "number",
      "total_amount": "number",
      "payment_reference": ["string"],
      "transaction_date": "string",
      "status": "string",
      "notes": "string",
      "created_at": "string",
      "updated_at": "string",
      "authority": "string"
    }
  ]
}
```

### GET /api/transactions/pubkey/:publicKey
Retrieve transactions by public key.

**Parameters:**
- `publicKey` (string): The public key to search for

### POST /api/transactions
Create a new transaction on the blockchain.

**Request Body:**
```json
{
  "transaction_id": "string",
  "transaction_type": "string",
  "from_actor_id": "string",
  "to_actor_id": "string",
  "batch_ids": ["string"],
  "quantity": "number",
  "unit_price": "number",
  "total_amount": "number",
  "payment_reference": ["string"],
  "transaction_date": "string",
  "status": "string",
  "notes": "string"
}
```

### PUT /api/transactions/:id
Update an existing transaction on the blockchain.

**Parameters:**
- `id` (string): Transaction ID

**Request Body:** Same as POST request

## SQLite Entity APIs

### Chain Actors

#### GET /api/chain-actors
Retrieve all chain actors.

#### GET /api/chain-actors/:id
Retrieve a specific chain actor.

#### GET /api/chain-actors/type/:type
Retrieve chain actors by type (farmer, miller, distributor, retailer).

#### POST /api/chain-actors
Create a new chain actor.

**Request Body:**
```json
{
  "name": "string",
  "type": "farmer|miller|distributor|retailer",
  "contact_info": "string",
  "location": "string",
  "status": "active|inactive"
}
```

#### PUT /api/chain-actors/:id
Update an existing chain actor.

#### DELETE /api/chain-actors/:id
Delete a chain actor.

### Production Seasons

#### GET /api/production-seasons
Retrieve all production seasons.

#### GET /api/production-seasons/:id
Retrieve a specific production season.

#### GET /api/production-seasons/current
Retrieve the current active production season.

#### POST /api/production-seasons
Create a new production season.

**Request Body:**
```json
{
  "season_name": "string",
  "start_date": "YYYY-MM-DD",
  "end_date": "YYYY-MM-DD",
  "status": "active|inactive",
  "description": "string"
}
```

#### PUT /api/production-seasons/:id
Update an existing production season.

#### DELETE /api/production-seasons/:id
Delete a production season.

### Rice Batches

#### GET /api/rice-batches
Retrieve all rice batches.

#### GET /api/rice-batches/:id
Retrieve a specific rice batch.

#### GET /api/rice-batches/farmer/:farmerId
Retrieve rice batches by farmer ID.

#### GET /api/rice-batches/season/:seasonId
Retrieve rice batches by season ID.

#### POST /api/rice-batches
Create a new rice batch.

**Request Body:**
```json
{
  "batch_number": "string",
  "farmer_id": "number",
  "production_season_id": "number",
  "rice_variety": "string",
  "planting_date": "YYYY-MM-DD",
  "harvest_date": "YYYY-MM-DD",
  "quantity_harvested": "number",
  "quality_grade": "string",
  "farming_practices": "string",
  "certifications": "string",
  "storage_conditions": "string"
}
```

#### PUT /api/rice-batches/:id
Update an existing rice batch.

#### DELETE /api/rice-batches/:id
Delete a rice batch.

### Milled Rice

#### GET /api/milled-rice
Retrieve all milled rice records.

#### GET /api/milled-rice/:id
Retrieve a specific milled rice record.

#### GET /api/milled-rice/batch/:batchId
Retrieve milled rice records by batch ID.

#### POST /api/milled-rice
Create a new milled rice record.

**Request Body:**
```json
{
  "batch_id": "number",
  "miller_id": "number",
  "milling_date": "YYYY-MM-DD",
  "input_quantity": "number",
  "output_quantity": "number",
  "milling_process": "string",
  "quality_parameters": "string",
  "packaging_details": "string"
}
```

#### PUT /api/milled-rice/:id
Update an existing milled rice record.

#### DELETE /api/milled-rice/:id
Delete a milled rice record.

## Database Schema

### chain_actors
```sql
CREATE TABLE chain_actors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('farmer', 'miller', 'distributor', 'retailer')),
    contact_info TEXT,
    location TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### production_seasons
```sql
CREATE TABLE production_seasons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    season_name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### rice_batches
```sql
CREATE TABLE rice_batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_number TEXT NOT NULL UNIQUE,
    farmer_id INTEGER NOT NULL,
    production_season_id INTEGER NOT NULL,
    rice_variety TEXT NOT NULL,
    planting_date DATE,
    harvest_date DATE,
    quantity_harvested DECIMAL(10,2),
    quality_grade TEXT,
    farming_practices TEXT,
    certifications TEXT,
    storage_conditions TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (farmer_id) REFERENCES chain_actors(id),
    FOREIGN KEY (production_season_id) REFERENCES production_seasons(id)
);
```

### milled_rice
```sql
CREATE TABLE milled_rice (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id INTEGER NOT NULL,
    miller_id INTEGER NOT NULL,
    milling_date DATE NOT NULL,
    input_quantity DECIMAL(10,2) NOT NULL,
    output_quantity DECIMAL(10,2) NOT NULL,
    milling_process TEXT,
    quality_parameters TEXT,
    packaging_details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (batch_id) REFERENCES rice_batches(id),
    FOREIGN KEY (miller_id) REFERENCES chain_actors(id)
);
```

## Frontend Usage

### Navigation
- Use the sidebar to navigate between different sections
- Dashboard provides an overview with counts and recent activity
- Each section displays data in a table format with search functionality

### CRUD Operations
- **Create**: Click the "Add New" button in any section (except Dashboard and Chain Transactions)
- **Read**: Data is automatically loaded and displayed in tables
- **Update**: Click the edit (pencil) icon in the Actions column
- **Delete**: Click the delete (trash) icon in the Actions column

### Search and Filter
- Use the search box in each section to filter data
- Search works across all visible columns in the table

## Development

### Backend Development
```bash
cd backend
npm run dev  # Starts server with nodemon for auto-restart
```

### Frontend Development
- Edit files in the `frontend/` directory
- Changes are immediately visible when refreshing the browser
- The backend serves static files from the frontend directory

### Solana Program Development
```bash
cd solana-program
anchor build     # Build the program
anchor test      # Run tests
anchor deploy    # Deploy to configured cluster
```

## Troubleshooting

### Common Issues

1. **Backend won't start**
   - Ensure Node.js is installed
   - Run `npm install` in the backend directory
   - Check if port 3000 is available

2. **Database errors**
   - Run `npm run init-db` to reinitialize the database
   - Check file permissions in the backend directory

3. **Frontend not loading**
   - Ensure the backend is running
   - Check browser console for JavaScript errors
   - Verify API endpoints are accessible

4. **Solana program issues**
   - Ensure Rust and Anchor are properly installed
   - Check Anchor.toml configuration
   - Verify Solana CLI is configured

### Logs
- Backend logs are displayed in the console when running `npm run dev`
- Frontend errors can be viewed in the browser's developer console
- Solana program logs are available through Anchor CLI

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please create an issue in the repository or contact the development team.