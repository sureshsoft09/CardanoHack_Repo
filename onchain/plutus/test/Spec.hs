{-# LANGUAGE NoImplicitPrelude #-}
{-# LANGUAGE OverloadedStrings #-}

module Main where

import           Test.Tasty
import           Test.Tasty.HUnit

import qualified ShipmentEscrowSpec

-- | Main test suite entry point
main :: IO ()
main = defaultMain tests

-- | Test tree combining all test modules
tests :: TestTree
tests = testGroup "Smart Freight Plutus Tests"
  [ ShipmentEscrowSpec.tests
  ]