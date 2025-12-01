# Curl Examples - Fresh Deployment

## Base URL
```
http://localhost:3000
```

---

## 1. Create a New Transaction (All Fields)

```bash
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "from_actor_id": 1,
    "to_actor_id": 2,
    "batch_id": 20,
    "quantity": "100",
    "price_per_kg": "150",
    "payment_reference": "cheque",
    "status": "completed",
    "quality": 88,
    "moisture": "13.2",
    "is_test": 0,
    "nonce": 1
  }'
```

### Example 2: Cash Payment
```bash
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "from_actor_id": 2,
    "to_actor_id": 3,
    "batch_id": 30,
    "quantity": "50",
    "price_per_kg": "200",
    "payment_reference": "cash",
    "status": "completed",
    "quality": 92,
    "moisture": "11.8",
    "is_test": 0,
    "nonce": 2
  }'
```

### Example 3: Cheque Payment
```bash
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "from_actor_id": 3,
    "to_actor_id": 4,
    "batch_id": 40,
    "quantity": "75",
    "price_per_kg": "180",
    "payment_reference": "cheque",
    "status": "completed",
    "quality": 85,
    "moisture": "12.0",
    "is_test": 0,
    "nonce": 3
  }'
```

### Example 4: Balance Payment
```bash
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "from_actor_id": 4,
    "to_actor_id": 5,
    "batch_id": 50,
    "quantity": "200",
    "price_per_kg": "160",
    "payment_reference": "balance",
    "status": "completed",
    "quality": 95,
    "moisture": "12.5",
    "is_test": 0,
    "nonce": 4
  }'
```

---

## 2. Create Sample Transaction

```bash
curl -X POST http://localhost:3000/api/transactions/sample \
  -H "Content-Type: application/json" \
  -d '{
    "nonce": 5
  }'
```

---

## 3. Get All Transactions

```bash
curl -X GET http://localhost:3000/api/transactions
```

---

## 4. Get Transaction by Public Key

```bash
# Replace PUBLIC_KEY with actual public key from transaction response
curl -X GET "http://localhost:3000/api/transactions/pubkey/PUBLIC_KEY"
```

### With Memo Data
```bash
curl -X GET "http://localhost:3000/api/transactions/pubkey/PUBLIC_KEY?includeMemo=true"
```

---

## 5. Add Transaction to Existing Account (Phase 2 - 295× Cheaper)

```bash
curl -X POST http://localhost:3000/api/transactions/add \
  -H "Content-Type: application/json" \
  -d '{
    "from_actor_id": 5,
    "to_actor_id": 6,
    "batch_id": 60,
    "quantity": "150",
    "price_per_kg": "170",
    "payment_reference": "balance",
    "status": "completed",
    "quality": 90,
    "moisture": "12.3",
    "is_test": 0,
    "publicKey": "PUBLIC_KEY_FROM_FIRST_TRANSACTION"
  }'
```

---

## Field Reference

### Required Fields
- `from_actor_id` (number): Source actor ID
- `to_actor_id` (number): Destination actor ID

### Optional Fields
- `batch_id` (number): Single batch ID
- `quantity` (string): Amount (numeric only, no units)
- `price_per_kg` (string): Price per kg (numeric only, no currency)
- `payment_reference` (string|number): "cash"|"cheque"|"balance" or 0|1|2
- `status` (string): "completed"|"pending"|"cancelled"
- `quality` (number): 0-100 quality score
- `moisture` (string): Moisture percentage (numeric only, no %)
- `is_test` (number): 0 or 1
- `nonce` (number): 0-255, must be unique per wallet

---

## Response Format

### Success Response
```json
{
  "success": true,
  "data": {
    "from_actor_id": 1,
    "to_actor_id": 2,
    "batch_ids": [10],
    "quantity": "100",
    "unit_price": "150",
    "payment_reference": 0,
    "transaction_date": "2025-11-25T05:34:00.000Z",
    "status": "completed",
    "quality": 90,
    "moisture": "12.5",
    "is_test": 1,
    "publicKey": "ACCOUNT_PUBLIC_KEY",
    "signature": "TRANSACTION_SIGNATURE",
    "data_hash": "SHA256_HASH",
    "blockchain_verified": true,
    "created_at": 1700872440000,
    "updated_at": 1700872440000
  },
  "message": "Transaction created successfully on blockchain"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error description",
  "message": "Detailed error message"
}
```

---

## Testing Workflow

1. **Create first transaction** (Phase 1)
   ```bash
   curl -X POST http://localhost:3000/api/transactions \
     -H "Content-Type: application/json" \
     -d '{"from_actor_id": 1, "to_actor_id": 2, "quantity": "100", "price_per_kg": "150", "nonce": 1}'
   ```
   Save the `publicKey` from response

2. **Add to same account** (Phase 2 - 295× cheaper)
   ```bash
   curl -X POST http://localhost:3000/api/transactions/add \
     -H "Content-Type: application/json" \
     -d '{"from_actor_id": 2, "to_actor_id": 3, "quantity": "50", "price_per_kg": "200", "publicKey": "SAVED_PUBLIC_KEY"}'
   ```

3. **View all transactions**
   ```bash
   curl -X GET http://localhost:3000/api/transactions
   ```

---

## Program Details

- **Program ID**: `6NcVSFj9gGYtSDWz1EPxY9BM2QZRrZ49fpadK6bACTgk`
- **Network**: Solana Devnet
- **Cost per transaction**: ~0.00147 SOL (Phase 1) / ~0.000005 SOL (Phase 2)
- **Solana Explorer**: https://explorer.solana.com/address/6NcVSFj9gGYtSDWz1EPxY9BM2QZRrZ49fpadK6bACTgk?cluster=devnet
