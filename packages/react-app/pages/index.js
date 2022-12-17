import result, {
  TxReceiptFieldsFragmentDoc,
  CreateProfileDocument,
} from "@lens-protocol/react-native-lens-ui-kit/dist/graphql/generated";
import {
  useBalance,
  useContractLoader,
  useContractReader,
  useGasPrice,
  useOnBlock,
  useUserProviderAndSigner,
} from "eth-hooks";
import { ethers } from "ethers";
import Link from "next/link";
import React, { useCallback, useContext, useEffect, useState } from "react";
import { Account, Address, Balance, Contract, Toolbar, Wallet } from "../components";
import { LENS_ABI, LENS_HUB, MOCK_PROFILE_CREATOR_PROXY, NETWORK, HUB, PROXY } from "../constants";
import { Web3Context } from "../helpers/Web3Context";
import { useExternalContractLoader, useStaticJsonRPC } from "../hooks";
import {
  authenticate,
  challenge,
  client,
  exploreProfiles,
  profileaddress,
  getPublications,
  createProfile,
} from "./api.js";
import deployedContracts from "../contracts/hardhat_contracts.json";
import { Modal, Input, Image, Menu } from "antd";
import { returnIPFSPathorURL } from "@lens-protocol/react-native-lens-ui-kit/dist/utils";

export default function Home() {
  /* create initial state to hold array of profiles */
  const [profiles, setProfiles] = useState([]);
  /* local state variables to hold user's address and access token */
  const [address, setAddress] = useState();
  const [token, setToken] = useState();
  const [injectedProvider, setInjectedProvider] = useState();
  const [profileId, setProfileId] = useState();
  const [handle, setHandle] = useState();
  const [user_selected_handle, setUser_selected_handle] = useState();
  const [hasposts, Sethasposts] = useState();
  const [publications, setPublications] = useState([]);

  const USE_BURNER_WALLET = false; // toggle burner wallet feature
  const web3Modal = Web3Context;
  const providers = ["https://rpc-mumbai.maticvigil.com/"];
  const localProvider = useStaticJsonRPC([
    process.env.REACT_APP_PROVIDER ? process.env.REACT_APP_PROVIDER : NETWORK.rpcUrl,
  ]);
  const mainnetProvider = useStaticJsonRPC(providers);
  const externalContracts = LENS_ABI.children[0].children[0].abi;
  const contractConfig = { deployedContracts: deployedContracts || {}, externalContracts: externalContracts || {} };
  const userProviderAndSigner = useUserProviderAndSigner(injectedProvider, localProvider, USE_BURNER_WALLET);
  const userSigner = userProviderAndSigner.signer;
  const userProvider = userProviderAndSigner.provider;
  const blockExplorer = NETWORK.blockExplorer;
  const mumbai_profile_contract = useExternalContractLoader(
    mainnetProvider,
    MOCK_PROFILE_CREATOR_PROXY,
    LENS_ABI.children[0].children[0].abi,
  );
  console.log(LENS_ABI.children[0].children[0]);
  const provider1 = new ethers.providers.Web3Provider(window.ethereum);
  const signer1 = provider1.getSigner();

  const greeterContract = new ethers.Contract(
    MOCK_PROFILE_CREATOR_PROXY,
    [LENS_ABI.children[0].children[0].abi],
    provider1,
  );

  const fetch_handle = new ethers.Contract(LENS_HUB, [LENS_ABI?.children[1].children[52].abi], provider1);

  const postContract = new ethers.Contract(LENS_HUB, [LENS_ABI?.children[1].children[30].abi], provider1);

  const postContractWSigner = postContract.connect(signer1);

  const getPubContract = new ethers.Contract(LENS_HUB, [LENS_ABI?.children[1].children[49].abi], provider1);

  console.log(getPubContract);

  const lens_tokenofOwner = new ethers.Contract(LENS_HUB, [LENS_ABI?.children[1].children[7].abi], provider1);

  console.log(address);

  const Lens_abi_array = [];

  for (let i = 0; i < LENS_ABI.children[1].children.length; i++) {
    //add abi to an array
    Lens_abi_array.push(LENS_ABI.children[1].children[i].abi);
  }

  const lens_total = new ethers.Contract(LENS_HUB, Lens_abi_array, provider1);

  console.log("yeet", lens_total);
  console.log("yeet");

  /* a different way to use the abi of a verified contract on any EVM block explorers using ethers.js
  let beans;
  beans = new ethers.utils.Interface(HUB);

  console.log(beans?.functions);
  */

  async function beans() {
    try {
      checkProfileID;
      const beans_value = await fetch_handle?.getHandle(profileId);

      console.log(beans_value);
      console.log(handle);
    } catch (err) {
      console.log(err);
    }
  }



  const greeterContractWSigner = greeterContract.connect(signer1);

  const logoutOfWeb3Modal = async () => {
    await web3Modal.clearCachedProvider();
    if (injectedProvider && injectedProvider.provider && typeof injectedProvider.provider.disconnect == "function") {
      await injectedProvider.provider.disconnect();
    }
    setTimeout(() => {
      window.location.reload();
    }, 1);
  };

  const loadWeb3Modal = useCallback(async () => {
    const provider = await web3Modal.connect();
    setInjectedProvider(new ethers.providers.Web3Provider(provider));

    provider.on("chainChanged", chainId => {
      console.log(`chain changed to ${chainId}! updating providers`);
      setInjectedProvider(new ethers.providers.Web3Provider(provider));
    });

    provider.on("accountsChanged", () => {
      console.log(`account changed!`);
      setInjectedProvider(new ethers.providers.Web3Provider(provider));
    });

    // Subscribe to session disconnection
    provider.on("disconnect", (code, reason) => {
      console.log(code, reason);
      logoutOfWeb3Modal();
    });
    // eslint-disable-next-line
  }, [setInjectedProvider]);

  useEffect(() => {
    if (web3Modal.cachedProvider) {
      loadWeb3Modal();
    }
  }, [loadWeb3Modal]);

  useEffect(() => {
    fetchProfiles();
    checkConnection();
  }, []);
  async function fetchProfiles() {
    try {
      /* fetch profiles from Lens API */
      let response = await client.query({ query: exploreProfiles });
      /* loop over profiles, create properly formatted ipfs image links */
      let profileData = await Promise.all(
        response.data.exploreProfiles.items.map(async profileInfo => {
          let profile = { ...profileInfo };
          let picture = profile.picture;
          if (picture && picture.original && picture.original.url) {
            if (picture.original.url.startsWith("ipfs://")) {
              let result = picture.original.url.substring(7, picture.original.url.length);
              profile.avatarUrl = `http://lens.infura-ipfs.io/ipfs/${result}`;
            } else {
              profile.avatarUrl = picture.original.url;
            }
          }
          return profile;
        }),
      );

      /* update the local state with the profiles array */
      setProfiles(profileData);
    } catch (err) {
      console.log({ err });
    }
  }

  async function claimProfile() {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const userAddress = address;
    const handle = user_selected_handle;
    const profileImage = "https://ipfs.io/ipfs/QmY9dUwYu67puaWBMxRKW98LPbXCznPwHUbhX5NeWnCJbX";
    const followModule = "0x0000000000000000000000000000000000000000";
    const followModuleInitData = "0x00";
    const followModuleNFTUri = "https://ipfs.io/ipfs/QmTFLSXdEQ6qsSzaXaCSNtiv6wA56qq87ytXJ182dXDQJS";

    const components = [userAddress, handle, profileImage, followModule, followModuleInitData, followModuleNFTUri];
    console.log(components);

    if (user_selected_handle != undefined) {
      try {
        const claim = await greeterContractWSigner?.proxyCreateProfile(components);
  
      } catch (err) {
        console.log({ err });
      }
    } else {
      setOpen(true);
      console.log("modal should open");
    }
  }

  async function checkProfileID() {
    try {
      const profile_ID = await lens_tokenofOwner?.tokenOfOwnerByIndex(address, "0");
      console.log(Number(profile_ID));
      console.log(profile_ID);
      setProfileId(Number(profile_ID));
    } catch (err) {
      console.log({ err });
    }
  }

  async function fetchPost() {
    try {
      const getPublication = await getPubContract?.getPub(`${profileId}`, "1");
      const train = await lens_tokenofOwner?.tokenOfOwnerByIndex(address, "0");
      console.log(train);
      console.log(train?._hex);
      console.log(getPublication);
      Sethasposts(`${returnIPFSPathorURL("ipfs://Qmby8QocUU2sPZL46rZeMctAuF5nrCc7eR1PPkooCztWPz")}`);
      const pubs = await client.query({
        query: getPublications,
        variables: {
          id: train._hex,
          limit: 50,
        },
      });
      setPublications(pubs.data.publications.items);
      console.log(publications);
    } catch (err) {
      console.log({ err });
    }
  }

  async function makePost() {
    const contentURI = "https://ipfs.io/ipfs/Qmby8QocUU2sPZL46rZeMctAuF5nrCc7eR1PPkooCztWPz";
    const collectModule = "0x0BE6bD7092ee83D44a6eC1D949626FeE48caB30c";
    const collectModuleInitData = "0x0000000000000000000000000000000000000000000000000000000000000001";
    const referenceModule = "0x0000000000000000000000000000000000000000";
    const referenceModuleInitData = "0x00";

    const component = [
      profileId,
      contentURI,
      collectModule,
      collectModuleInitData,
      referenceModule,
      referenceModuleInitData,
    ];

    try {
      const makePost = await postContractWSigner?.post(component);
    } catch (err) {
      console.log({ err });
    }
  }

  async function checkConnection() {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const accounts = await provider.listAccounts();
    if (accounts.length) {
      setAddress(accounts[0]);
    }
  }
  async function connect() {
    /* this allows the user to connect their wallet */
    const account = await window.ethereum.send("eth_requestAccounts");
    if (account.result.length) {
      setAddress(account.result[0]);
    }
  }
  async function login() {
    try {
      /* first request the challenge from the API server */
      const challengeInfo = await client.query({
        query: challenge,
        variables: { address },
      });
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      /* ask the user to sign a message with the challenge info returned from the server */
      const signature = await signer.signMessage(challengeInfo.data.challenge.text);
      /* authenticate the user */
      const authData = await client.mutate({
        mutation: authenticate,
        variables: {
          address,
          signature,
        },
      });
      /* if user authentication is successful, you will receive an accessToken and refreshToken */
      const {
        data: {
          authenticate: { accessToken },
        },
      } = authData;
      console.log({ accessToken });
      setToken(accessToken);
    } catch (err) {
      console.log("Error signing in: ", err);
    }
  }

  //the following function should not try anything until the user has selected a handle

  async function createProfileRequest() {
    if (user_selected_handle == undefined) {
      setOpen(true);
      console.log("modal should open");
    } else {
      try {
        const request = {
          handle: `${user_selected_handle}`,
          profilePictureUri: null,
          followModule: null,
        };

        const createProfile_const = await client.mutate({
          //x-access-token header put in the request with your authentication token.
          context: {
            headers: {
              "x-access-token": token,
            },
          },

          mutation: createProfile,
          variables: {
            request,
          },
        });
        console.log("attempting to createprofile for: ", user_selected_handle);
        if ((await createProfile_const.data?.createProfile?.txHash) != undefined) {
          console.log(
            "create profile successful:",
            `${request.handle}.test`,
            "created at txHash:",
            createProfile_const.data?.createProfile?.txHash,
          );
          return createProfile_const;
        } else {
          console.log("create profile failed, try again!:", createProfile_const.data?.createProfile?.reason);
          setOpen(true);
        }
      } catch (err) {
        console.log("Error creating profile: ", err);
        setOpen(true);
      }
    }
  }

  //if gql __typename is included and is "RelayError" then it is an error, log it to console
  //if gql __typename is included and is "Profile" then it is a profile, log it to console

  const createProfile_func = async () => {
    const address_p = address;
    console.log("create profile address:", address_p);

    const createProfileResult = await createProfileRequest({
      handle: new Date().getTime().toString(),
    });

    console.log("create profile result:", createProfileResult);
  };

  /* a lil modal to help out w posts */

  const [open, setOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [modalText, setModalText] = useState("Content of the modal");

  const showModal = () => {
    setOpen(true);
  };
  const handleOk = () => {
    setModalText("The modal will be closed after two seconds");
    setConfirmLoading(true);
    createProfileRequest();
    setTimeout(() => {
      setOpen(false);
      setConfirmLoading(false);
    }, 2000);
  };
  const handleCancel = () => {
    console.log("Clicked cancel button");
    setUser_selected_handle();
    setOpen(false);
  };

  const handleChange = event => {
    setUser_selected_handle(event.target.value);
  };

  const handleClick = event => {
    event.preventDefault();

    console.log("old value: ", user_selected_handle);

    setUser_selected_handle(event.target.value);
  };


  const default_Profile = async () => {
    try {
      const default_check = await lens_total.defaultProfile(address);
      console.log("the users default profile is:", default_check);

      if (default_check) {
        console.log("default profile is set");
        const handle_id = await lens_total.getProfile(Number(default_check));
        console.log("the users default profile handle is:", handle_id.handle);
        setHandle(handle_id.handle);
      } else {
      }
    } catch (err) {
      console.log("Error checking default profile: ", err);
    }
  };

  return (
    <>
      <Menu style={{ textAlign: "center", marginTop: 20 }} selectedKeys={[location.pathname]} mode="horizontal">
        <Menu.Item key="/">
          <Link href="/">App Home</Link>
        </Menu.Item>
        <Menu.Item key="/profile">
          <Link href="/about">About Us</Link>
        </Menu.Item>
        <Menu.Item key="/Contract">
          <Link href="/Contract">Contract</Link>
        </Menu.Item>
      </Menu>
      <Modal
        title="Choose your handle!"
        visible={open}
        onOk={handleOk}
        confirmLoading={confirmLoading}
        onCancel={handleCancel}
      >
        <Input
          style={{
            width: "calc(100% - 200px)",
          }}
          defaultValue=""
          onChange={handleChange}
          onCancel={handleCancel}
          onOk={createProfileRequest}
          destroyOnClose
          value={user_selected_handle}
        />
        <h2>Example: {user_selected_handle}.test</h2>
      </Modal>
      <div>
        <div className="pt-5 inline-block float-right">
          <div
            className="pt-5 rounded-full sm: flex flex-col md: flex-row gap-2 float-right inline-block"
            style={{
              backgroundColor: "yellowgreen",
              border: "0.5rem outset yellow",
              padding: "0.5rem",
            }}
          >
            {/* if the user has not yet connected their wallet, show a connect button */}
            {!address && <button onClick={connect}>Connect</button>}
            {/* if the user has connected their wallet but has not yet authenticated, show them a login button */}
            {address && { handle } ? (
              <h2>{handle}</h2>
            ) : (
              <div onClick={createProfileRequest}>
                <button>claimProfile</button>
              </div>
            )}
            {/* once the user has authenticated, show them a success message */}
            {address && token && <h2>Successfully signed in! </h2> && { token } ? (
              <h2>Successfully signed in! </h2>
            ) : (
              <div onClick={login}>
                <button>login!</button>
              </div>
            )}
          </div>
          <div className="pt-5 sm:flex flex-col md: flex-row gap-3 float-right inline-block"></div>
        </div>
        <div className="pt-10">
          <div className="sm:flex flex-col md:flex-row uppercase gap-2 md:gap-10 text-lens-green-100 font-semibold"></div>
          <div onClick={default_Profile}>
            <button>CheckProfile</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div onClick={makePost}>
              <button>Post</button>
            </div>
            <div onClick={fetchPost}>
              <button>FetchPost</button>
            </div>
            {getPublications &&
              publications.map(pub => (
                <div key={pub.id} className="shadow p-10 rounded mb-8 w-2/3">
                  <p>{pub.metadata.content}</p>
                </div>
              ))}
            {profiles.map(profile => (
              <div key={profile.id} className="w-4/5 shadow-md p-6 rounded-lg mb-8 flex flex-col items-center">
                <img className="w-48 rounded-full" src={profile.avatarUrl || "https://picsum.photos/200"} />
                <p className="text-xl text-center mt-6">{profile.name}</p>
                <p className="text-base text-gray-400  text-center mt-2">{profile.bio}</p>
                <Link href={`/profile/${profile.handle}`}>
                  <p className="cursor-pointer text-violet-600 text-lg font-medium text-center mt-2 mb-2">
                    {profile.handle}
                  </p>
                </Link>
                <p className="text-pink-600 text-sm font-medium text-center">
                  {profile.stats.totalFollowers} followers
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
