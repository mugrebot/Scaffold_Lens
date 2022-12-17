//write a function using an external contract address and render it using the contract component
import React from "react";
import { Contract, ABI } from "../components";
import { LENS_HUB, LENS_ABI } from "../constants";
import { ethers } from "ethers";
import { useContractExistsAtAddress } from "eth-hooks";
import { useExternalContractLoader, useStaticJsonRPC } from "../hooks";
import { abi } from "@uniswap/v2-periphery/build/IUniswapV2Router02.json";

export default function ContractPage() {
  const providers = ["https://matic-mumbai.chainstacklabs.com"];
  const mainnetProvider = useStaticJsonRPC(providers);

  const provider1 = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider1.getSigner();


  console.log(signer);

  const address = LENS_HUB;

  const contractExists = useContractExistsAtAddress(mainnetProvider, LENS_HUB);

  console.log(contractExists);

  const Lens_abi_array = [];

  for (let i = 0; i < LENS_ABI.children[1].children.length; i++) {
    //add abi to an array
    Lens_abi_array.push(LENS_ABI.children[1].children[i].abi);

  }
  console.log(Lens_abi_array);
  let beans_abi = Lens_abi_array;
  const lens_contract = useExternalContractLoader(mainnetProvider, LENS_HUB, beans_abi);
  console.log(lens_contract);
  return (
    <div>
      <Contract
        customContract={lens_contract}
        name="Lens Hub Mumbai"
        signer={signer}
        provider={provider1}
        address={address}
        blockExplorer="https://mumbai.polygonscan.com"
        contractConfig={lens_contract}
      />
    </div>
  );
}
