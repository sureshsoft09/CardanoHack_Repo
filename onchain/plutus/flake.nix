{
  description = "Smart Freight Management - Plutus Smart Contracts";
  
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    plutus.url = "github:input-output-hk/plutus-apps";
  };

  outputs = { self, nixpkgs, plutus }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};
      
      haskellPackages = plutus.devShells.${system}.default.buildInputs ++ [
        pkgs.haskell.compiler.ghc8107
        pkgs.cabal-install
        pkgs.haskell-language-server
      ];
      
    in {
      devShells.${system}.default = pkgs.mkShell {
        buildInputs = haskellPackages ++ [
          pkgs.git
          pkgs.niv
          pkgs.cardano-cli
        ];
        
        shellHook = ''
          echo "Smart Freight Plutus Development Environment"
          echo "==========================================="
          echo "Available commands:"
          echo "  cabal build                 - Build the project"
          echo "  cabal exec write-validator  - Generate .plutus files"  
          echo "  cabal test                  - Run test suite"
          echo "  cardano-cli --version       - Check cardano-cli version"
          echo ""
          echo "To get started:"
          echo "  1. cabal build"
          echo "  2. cabal exec write-validator"
          echo "  3. Use generated .plutus files with cardano-cli"
        '';
      };
      
      packages.${system}.default = pkgs.haskellPackages.callCabal2nix "smart-freight-plutus" ./. {};
    };
}