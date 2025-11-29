{-# LANGUAGE NoImplicitPrelude #-}
{-# LANGUAGE OverloadedStrings #-}

{-|
Module      : WriteValidator
Description : Utility to serialize and write Plutus validators to files
Copyright   : (c) 2025
License     : MIT

This executable writes the compiled Plutus validators to .plutus files
that can be used with cardano-cli for on-chain deployment.
-}

module Main where

import           ShipmentEscrow         (writeValidator, showValidatorInfo)
import           Prelude                (IO)

-- | Main function - writes validator and shows information
main :: IO ()
main = do
    showValidatorInfo
    writeValidator