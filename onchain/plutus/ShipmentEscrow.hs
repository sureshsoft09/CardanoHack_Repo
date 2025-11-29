{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE DeriveAnyClass      #-}
{-# LANGUAGE DeriveGeneric       #-}
{-# LANGUAGE FlexibleContexts    #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE TemplateHaskell     #-}
{-# LANGUAGE TypeApplications    #-}
{-# LANGUAGE TypeFamilies        #-}
{-# LANGUAGE TypeOperators       #-}

{-|
Module      : ShipmentEscrow
Description : Plutus V2 Smart Contract for Smart Freight Management System
Copyright   : (c) 2025
License     : MIT
Maintainer  : smart-freight@example.com

A Plutus V2 validator that holds ADA in escrow until a valid settlement decision 
is submitted by the authorized Settlement Agent. This contract ensures that 
compliance violation penalties are paid only when proper evidence is provided
and validated through the Smart Freight Management System.

Compilation:
  cabal build
  
Or with nix (plutus-apps):
  nix develop
  cabal build
  
To generate the serialized validator script:
  cabal exec write-validator
-}

module ShipmentEscrow where

-- Plutus Core imports
import           Plutus.V2.Ledger.Api       (BuiltinData, PubKeyHash, ScriptContext, 
                                             Validator, mkValidatorScript, 
                                             BuiltinByteString, TxInfo, txInfoSignatories,
                                             scriptContextTxInfo)
import           Plutus.V2.Ledger.Contexts  (txSignedBy)
import           PlutusTx                   (Data (Constr), compile, unstableMakeIsData, 
                                             makeIsDataIndexed, makeLift)
import           PlutusTx.Prelude           (Bool, Eq, (==), (&&), traceIfFalse, ($), (.))
import           Prelude                    (IO, putStrLn, show)

-- Standard library imports for compilation
import qualified Data.ByteString.Lazy       as LBS
import qualified Data.ByteString.Short      as SBS
import           Codec.Serialise            (serialise)

-- GHC imports for generic deriving
import           GHC.Generics               (Generic)

--------------------------------------------------------------------------------
-- Data Types
--------------------------------------------------------------------------------

-- | Datum stored in the UTXO locked at this validator
-- Contains the shipment information and expected settlement criteria
data ShipmentEscrowDatum = ShipmentEscrowDatum
    { shipmentId            :: BuiltinByteString  -- ^ Unique shipment identifier
    , expectedDecisionHash  :: BuiltinByteString  -- ^ SHA-256 hash of the settlement decision
    , recipient             :: PubKeyHash         -- ^ Authorized recipient's public key hash
    } deriving (Generic)

-- | Redeemer provided when spending from this validator
-- Contains the settlement decision and signer information
data ShipmentEscrowRedeemer = ShipmentEscrowRedeemer
    { decisionHash  :: BuiltinByteString  -- ^ Actual settlement decision hash
    , signer        :: PubKeyHash         -- ^ Public key hash of the transaction signer
    } deriving (Generic)

-- Generate ToData/FromData instances for on-chain serialization
unstableMakeIsData ''ShipmentEscrowDatum
unstableMakeIsData ''ShipmentEscrowRedeemer

--------------------------------------------------------------------------------
-- Validator Logic
--------------------------------------------------------------------------------

{-# INLINABLE validateShipmentEscrow #-}
-- | Core validator function that implements the escrow logic
-- 
-- Validation Rules:
-- 1. The provided decision hash must match the expected decision hash
-- 2. The signer's public key hash must match the authorized recipient
-- 3. The transaction must be signed by the authorized signer
--
-- @param datum The datum containing escrow conditions
-- @param redeemer The redeemer containing settlement proof
-- @param ctx The script context containing transaction information
-- @return True if all validation conditions are met, False otherwise
validateShipmentEscrow :: ShipmentEscrowDatum -> ShipmentEscrowRedeemer -> ScriptContext -> Bool
validateShipmentEscrow datum redeemer ctx =
    traceIfFalse "Decision hash mismatch" hashMatches &&
    traceIfFalse "Unauthorized signer" signerAuthorized &&
    traceIfFalse "Transaction not signed by signer" transactionSigned
  where
    info :: TxInfo
    info = scriptContextTxInfo ctx
    
    -- Rule 1: Verify decision hash matches expected hash
    hashMatches :: Bool
    hashMatches = decisionHash redeemer == expectedDecisionHash datum
    
    -- Rule 2: Verify signer is the authorized recipient
    signerAuthorized :: Bool 
    signerAuthorized = signer redeemer == recipient datum
    
    -- Rule 3: Verify transaction is signed by the signer
    transactionSigned :: Bool
    transactionSigned = txSignedBy info (signer redeemer)

--------------------------------------------------------------------------------
-- Validator Compilation
--------------------------------------------------------------------------------

-- | Typed validator that wraps the core validation function
shipmentEscrowValidator :: Validator
shipmentEscrowValidator = mkValidatorScript $$(compile [|| validateShipmentEscrow ||])

--------------------------------------------------------------------------------
-- Script Serialization Utilities
--------------------------------------------------------------------------------

-- | Serialize the validator to a bytestring for submission to the blockchain
-- This is used by off-chain code to reference the script
serializedValidator :: LBS.ByteString
serializedValidator = serialise shipmentEscrowValidator

-- | Get the short bytestring representation for storage efficiency
shortBsValidator :: SBS.ShortByteString
shortBsValidator = SBS.toShort . LBS.toStrict $ serializedValidator

--------------------------------------------------------------------------------
-- Example Usage and Testing
--------------------------------------------------------------------------------

-- | Example datum for testing - represents a real shipment escrow scenario
exampleDatum :: ShipmentEscrowDatum
exampleDatum = ShipmentEscrowDatum
    { shipmentId = "SHIP-001"
    , expectedDecisionHash = "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456"
    , recipient = "abcdef1234567890abcdef1234567890abcdef12"  -- Mock Settlement Agent PKH
    }

-- | Example redeemer for successful settlement (matches datum)
exampleRedeemer :: ShipmentEscrowRedeemer  
exampleRedeemer = ShipmentEscrowRedeemer
    { decisionHash = "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456"  -- Matches datum
    , signer = "abcdef1234567890abcdef1234567890abcdef12"  -- Matches datum recipient
    }

-- | Example redeemer that should fail validation (wrong hash)
invalidHashRedeemer :: ShipmentEscrowRedeemer
invalidHashRedeemer = ShipmentEscrowRedeemer  
    { decisionHash = "deadbeefcafebabe1111222233334444555566667777888899990000aaaabbbb"  -- Wrong hash
    , signer = "abcdef1234567890abcdef1234567890abcdef12"  -- Correct signer
    }

-- | Example redeemer that should fail validation (wrong signer)
invalidSignerRedeemer :: ShipmentEscrowRedeemer
invalidSignerRedeemer = ShipmentEscrowRedeemer
    { decisionHash = "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456"  -- Correct hash
    , signer = "fedcba0987654321fedcba0987654321fedcba09"  -- Wrong signer
    }

--------------------------------------------------------------------------------
-- JSON Serialization Helpers
--------------------------------------------------------------------------------

-- | Convert datum to JSON format for cardano-cli
datumToJSON :: ShipmentEscrowDatum -> String
datumToJSON datum = 
    "{\n" ++
    "  \"constructor\": 0,\n" ++
    "  \"fields\": [\n" ++
    "    { \"bytes\": \"" ++ builtinByteStringToHex (shipmentId datum) ++ "\" },\n" ++
    "    { \"bytes\": \"" ++ builtinByteStringToHex (expectedDecisionHash datum) ++ "\" },\n" ++
    "    { \"bytes\": \"" ++ pubKeyHashToHex (recipient datum) ++ "\" }\n" ++
    "  ]\n" ++
    "}"

-- | Convert redeemer to JSON format for cardano-cli  
redeemerToJSON :: ShipmentEscrowRedeemer -> String
redeemerToJSON redeemer =
    "{\n" ++
    "  \"constructor\": 0,\n" ++
    "  \"fields\": [\n" ++
    "    { \"bytes\": \"" ++ builtinByteStringToHex (decisionHash redeemer) ++ "\" },\n" ++
    "    { \"bytes\": \"" ++ pubKeyHashToHex (signer redeemer) ++ "\" }\n" ++
    "  ]\n" ++
    "}"

-- | Helper function to convert BuiltinByteString to hex string
-- In production, use proper conversion from plutus-ledger-api
builtinByteStringToHex :: BuiltinByteString -> String
builtinByteStringToHex bs = show bs  -- Simplified for demo

-- | Helper function to convert PubKeyHash to hex string  
-- In production, extract bytes and convert to hex
pubKeyHashToHex :: PubKeyHash -> String
pubKeyHashToHex (PubKeyHash bs) = builtinByteStringToHex bs

--------------------------------------------------------------------------------
-- Test Cases
--------------------------------------------------------------------------------

-- | Test case: Matching datum and redeemer (should succeed)
testMatchingCase :: IO ()
testMatchingCase = do
    putStrLn "=== Test Case: Matching Datum and Redeemer ==="
    putStrLn "This test case should SUCCEED validation"
    putStrLn ""
    
    putStrLn "Datum:"
    putStrLn $ datumToJSON exampleDatum
    putStrLn ""
    
    putStrLn "Redeemer:"
    putStrLn $ redeemerToJSON exampleRedeemer
    putStrLn ""
    
    putStrLn "Validation checks:"
    putStrLn $ "✓ Decision hash match: " ++ 
        show (decisionHash exampleRedeemer == expectedDecisionHash exampleDatum)
    putStrLn $ "✓ Signer authorization: " ++ 
        show (signer exampleRedeemer == recipient exampleDatum)
    putStrLn "✓ Transaction signature: (requires ScriptContext)"
    putStrLn ""

-- | Test case: Wrong hash (should fail)
testWrongHashCase :: IO ()
testWrongHashCase = do
    putStrLn "=== Test Case: Wrong Decision Hash ==="
    putStrLn "This test case should FAIL validation"
    putStrLn ""
    
    putStrLn "Datum:"
    putStrLn $ datumToJSON exampleDatum
    putStrLn ""
    
    putStrLn "Redeemer (wrong hash):"
    putStrLn $ redeemerToJSON invalidHashRedeemer
    putStrLn ""
    
    putStrLn "Validation checks:"
    putStrLn $ "✗ Decision hash match: " ++ 
        show (decisionHash invalidHashRedeemer == expectedDecisionHash exampleDatum)
    putStrLn $ "✓ Signer authorization: " ++ 
        show (signer invalidHashRedeemer == recipient exampleDatum)
    putStrLn ""

-- | Test case: Wrong signer (should fail)
testWrongSignerCase :: IO ()
testWrongSignerCase = do
    putStrLn "=== Test Case: Wrong Signer ==="
    putStrLn "This test case should FAIL validation"
    putStrLn ""
    
    putStrLn "Datum:"
    putStrLn $ datumToJSON exampleDatum
    putStrLn ""
    
    putStrLn "Redeemer (wrong signer):"
    putStrLn $ redeemerToJSON invalidSignerRedeemer
    putStrLn ""
    
    putStrLn "Validation checks:"
    putStrLn $ "✓ Decision hash match: " ++ 
        show (decisionHash invalidSignerRedeemer == expectedDecisionHash exampleDatum)
    putStrLn $ "✗ Signer authorization: " ++ 
        show (signer invalidSignerRedeemer == recipient exampleDatum)
    putStrLn ""

-- | Run all test cases
runTestCases :: IO ()
runTestCases = do
    putStrLn "ShipmentEscrow Validator Test Cases"
    putStrLn "=================================="
    putStrLn ""
    
    testMatchingCase
    testWrongHashCase
    testWrongSignerCase
    
    putStrLn "Test Summary:"
    putStrLn "• Case 1: Should succeed - all validation rules pass"
    putStrLn "• Case 2: Should fail - decision hash mismatch"
    putStrLn "• Case 3: Should fail - unauthorized signer"

--------------------------------------------------------------------------------
-- Compilation and Deployment Utilities
--------------------------------------------------------------------------------

-- | Write the serialized validator to a file for deployment
-- Run with: cabal exec write-validator
writeValidator :: IO ()
writeValidator = do
    putStrLn "Writing ShipmentEscrow validator to file..."
    putStrLn $ "Validator size: " ++ show (LBS.length serializedValidator) ++ " bytes"
    LBS.writeFile "shipment-escrow-validator.plutus" serializedValidator
    putStrLn "Validator written to: shipment-escrow-validator.plutus"
    putStrLn ""
    putStrLn "Usage in cardano-cli:"
    putStrLn "  cardano-cli transaction build \\"
    putStrLn "    --tx-in <utxo-at-script> \\"
    putStrLn "    --tx-in-script-file shipment-escrow-validator.plutus \\"
    putStrLn "    --tx-in-datum-file datum.json \\"
    putStrLn "    --tx-in-redeemer-file redeemer.json \\"
    putStrLn "    --tx-out <recipient-address>+<amount> \\"
    putStrLn "    --protocol-params-file protocol.json \\"
    putStrLn "    --out-file tx.unsigned"

-- | Display validator information for debugging
showValidatorInfo :: IO ()
showValidatorInfo = do
    putStrLn "=== ShipmentEscrow Plutus V2 Validator ==="
    putStrLn $ "Serialized size: " ++ show (LBS.length serializedValidator) ++ " bytes"
    putStrLn $ "Short bytestring length: " ++ show (SBS.length shortBsValidator)
    putStrLn ""
    putStrLn "Example Datum (JSON format for cardano-cli):"
    putStrLn $ datumToJSON exampleDatum
    putStrLn ""
    putStrLn "Example Redeemer (JSON format for cardano-cli):"
    putStrLn $ redeemerToJSON exampleRedeemer

--------------------------------------------------------------------------------
-- Integration with Smart Freight Management System
--------------------------------------------------------------------------------

{-|
Integration Notes for Smart Freight Management System:

1. **Settlement Agent Integration**:
   - The Settlement Agent (TypeScript) calls `publishOnChain(decisionLog)`  
   - This creates a transaction that spends from this Plutus script
   - The decisionLog.decisionHash becomes the redeemer.decisionHash
   - The Settlement Agent's pubKeyHash is used for signing

2. **Transaction Flow**:
   ```
   Compliance Agent → Creates Invoice → Settlement Agent → Plutus Validator
                                           ↓
   Creates UTXO locked at script ← Funding Transaction ← Backend
                                           ↓  
   Settlement Transaction → Provides redeemer → Unlocks funds → Recipient
   ```

3. **Script Address Calculation**:
   ```haskell
   scriptAddress = addressFromValidatorHash (validatorHash shipmentEscrowValidator)
   ```

4. **Usage in cardano-cli**:
   ```bash
   # Deploy funds to script
   cardano-cli transaction build \
     --tx-out $(cardano-cli address build --payment-script-file shipment-escrow-validator.plutus)+2000000 \
     --tx-out-datum-hash $(cardano-cli transaction hash-script-data --script-data-file datum.json)
   
   # Redeem funds from script  
   cardano-cli transaction build \
     --tx-in <script-utxo> \
     --tx-in-script-file shipment-escrow-validator.plutus \
     --tx-in-datum-file datum.json \
     --tx-in-redeemer-file redeemer.json \
     --tx-out <recipient>+<amount>
   ```

5. **Off-chain Code Integration**:
   - Import this validator in Settlement Agent backend
   - Use `serializedValidator` to submit transactions
   - Build datum/redeemer from invoice and settlement data
-}

-- | Main function for testing and demonstration
main :: IO ()
main = do
    putStrLn "Smart Freight Management - Shipment Escrow Plutus Contract"
    putStrLn "==========================================================="
    putStrLn ""
    
    -- Run test cases
    runTestCases
    putStrLn ""
    
    -- Show validator info
    showValidatorInfo
    putStrLn ""
    
    -- Write validator file
    writeValidator