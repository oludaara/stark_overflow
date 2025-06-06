import React, { useMemo } from "react";
import { useContract as useStarknetContract, useAccount } from "@starknet-react/core";
import { CallData, Contract, call } from "starknet";
import { ContractContext } from "./contractContext";

// Assuming the ABI is stored in a JSON file or fetched dynamically
import contractAbi from "@services/contractAbi.json"; // Replace with actual ABI file path

export const ContractProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { account, address, isConnected } = useAccount();
  const contractAddress = "0x0228432fe63e8808fd694c8c80f6266a735c340760812f64fe20b015d2b2700e";
  const { contract, error: abiError } = useStarknetContract({
    abi: contractAbi,
    address: contractAddress,
  });

  const contractReady = !!contract && !abiError;

  const callContract = async ({
    contractAddress,
    entrypoint,
    calldata,
  }: {
    contractAddress: string;
    entrypoint: string;
    calldata: any[];
  }) => {
    if (!account) {
      throw new Error("Wallet not connected");
    }
    try {
      const response = await account.execute({
        contractAddress,
        entrypoint,
        calldata: CallData.compile(calldata),
      });
      return response;
    } catch (error) {
      throw new Error(`Contract call failed: ${error.message}`);
    }
  };

  const getCorrectAnswer = async (questionId: string): Promise<string | null> => {
    try {
      const response = await call({
        contractAddress,
        entrypoint: "get_correct_answer",
        calldata: CallData.compile([questionId]),
      });
      return response[0] ? response[0].toString() : null;
    } catch (error) {
      console.error("Error fetching correct answer:", error);
      return null;
    }
  };

  const contextValue = useMemo(
    () => ({
      contract,
      contractReady,
      isConnected,
      address,
      abiError: abiError?.message,
      callContract,
      getCorrectAnswer,
    }),
    [contract, contractReady, isConnected, address, abiError],
  );

  return <ContractContext.Provider value={contextValue}>{children}</ContractContext.Provider>;
};