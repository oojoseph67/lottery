import Head from "next/head";
import Image from "next/image";
import styles from "../styles/Home.module.css";
import "bulma/css/bulma.css";
import Web3 from "web3";
import lotteryContract from "../blockchain/lottery";
import { useState, useEffect } from "react";

export default function Home() {
  const [error, setError] = useState('')
  const [success, setSuccess] = useState("");

  const [web3, setWeb3] = useState()
  const [address, setAddress] = useState()
  const [LCContract, setLCContract] = useState()
  const [lotteryPot, setLotteryPot] = useState()

  const [lotteryPlayers, setPlayers] = useState([])
  const [lotteryHistory, setLotteryHistory] = useState([])
  const [lotteryId, setLotteryId] = useState();

  useEffect(() => {
    updateState()
    // if (LCContract)
  }, [LCContract])

  const updateState = () => {
    if (LCContract) getPot()
    if (LCContract) getPlayers()
    if (LCContract) getLotteryId()
  }

  const getPot = async () => {
    // console.log("getPot")
    const pot = await LCContract.methods.getBalance().call() // using call() because it's a read only function
    setLotteryPot(web3.utils.fromWei(pot, 'ether'))    
  }

  const getPlayers = async () => {
    // console.log("getPot")
    const players = await LCContract.methods.getPlayers().call(); 
    setPlayers(players);
  };

  const getHistory = async (lotteryId) => {
    setLotteryHistory([])
    for (let i = parseInt(lotteryId); i > 0; i--){
      // console.log(`get history`)
      const winnerAddress = await LCContract.methods.lotteryHistory(i).call()
      const historyObj = {}
      historyObj.lotteryId = i
      historyObj.address = winnerAddress
      setLotteryHistory(lotteryHistory => [...lotteryHistory, historyObj])
    }
  }

  const getLotteryId = async () => {
    const lotteryId = await LCContract.methods.lotteryId().call()
    setLotteryId(lotteryId)
    await getHistory(lotteryId)
  }

  const enterLottery = async () => {
    setError('')
    setSuccess('')
    try {
        await LCContract.methods.enter().send({
          from: address,
          value: "15000000000000000", // we are sending 0.015 instead of 0.01 to get over gas fees
          gas: 300000,
          gasPrice: null,
        })
        updateState() // using send() because we are sending a data to the blockchain
    } catch (err) {
      setError(err.message)
    }
  }

  const pickWinner = async () => {
    setError('')
    setSuccess('')
    // console.log(`address from pick winner :: ${address}`)
    try {
      await LCContract.methods.pickWinner().send({
        from: address,
        // value: "2000000000000000", // we are sending 0.015 instead of 0.01 to get over gas fees
        gas: 300000,
        gasPrice: null,
      }); // using send() because we are sending a data to the blockchain

    } catch (err) {
      setError(err.message);
    }
  }

  const payWinner = async () => {
    setError('')
    setSuccess('')
    try {
      await LCContract.methods.payWinner().send({
        from: address,
        gas: 300000,
        gasPrice: null
      })

      // console.log(`lottery id :: ${lotteryId}`)
      const winnerAddress = await LCContract.methods.lotteryHistory(lotteryId).call()
      setSuccess(`The winner is ${winnerAddress}`)
      updateState()
    } catch (err) {
      setError(err.message)
    }
  }

  // metamask code
  const connetWalletHandler = async () => {
    setError('')
    setSuccess('')
    if (typeof window !== "undefined" && typeof window.ethereum !== "undefined") {
      try {
        // request wallet connection
        await window.ethereum.request({ method: "eth_requestAccounts" })
        // create web3 instance
        const web3 = new Web3(window.ethereum)
        setWeb3(web3)
        // get list of accounts 
        const accounts = await web3.eth.getAccounts()
        // set account 1 to react state
        setAddress(accounts[0])

        // create local contract copy
        const LC = lotteryContract(web3)
        setLCContract(LC)

        window.ethereum.on("accountsChanged", async () => {
          const accounts = await web3.eth.getAccounts();
          // console.log(accounts[0])
          setAddress(accounts[0]);
        });
      } catch (err) {
        setError(err.message)
      }
    } else {
      window.alert("Please Install Metamask or Use a wallet dapp")
    }
  };

  return (
    <div>
      <Head>
        <title>Ether Lottery</title>
        <meta name="description" content="Ethereum Lottery DApp" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <nav className="navbar mt-4 mb-4">
          <div className="container">
            <div className="navbar-brand">
              <h1>A Lottery</h1>
            </div>
            <div className="navbar-end">
              <button onClick={connetWalletHandler} className="button is-link">
                Connect Wallet
              </button>
            </div>
          </div>
        </nav>
        <div className="container">
          <section className="mt-5">
            <div className="columns">
              <div className="column is-two-third">
                <section className="mt-5">
                  <p>Enter the lottery by sending 0.015 ETH</p>
                  <button
                    onClick={enterLottery}
                    className="button is-link is-large is-light mt-3"
                  >
                    Enter Lottery
                  </button>
                </section>
                <section className="mt-6">
                  <p>
                    <b>Admin only: </b>Pick winner
                  </p>
                  <button
                    onClick={pickWinner}
                    className="button is-primary is-large is-light mt-3"
                  >
                    Pick Winner
                  </button>
                </section>
                <section className="mt-6">
                  <p>
                    <b>Admin only: </b>Pay winner
                  </p>
                  <button
                    onClick={payWinner}
                    className="button is-success is-large is-light mt-3"
                  >
                    Pay Winner
                  </button>
                </section>
                <section>
                  <div className="container has-text-danger mt-6">
                    <p>{error}</p>
                  </div>
                </section>

                <section>
                  <div className="container has-text-success mt-6">
                    <p>{success}</p>
                  </div>
                </section>
              </div>
              <div className={`${styles.lotteryInfo} column is-two-third`}>
                <section className="mt-5">
                  <div className="card">
                    <div className="card-content">
                      <div className="content">
                        <h2> Lottery History </h2>
                        {lotteryHistory &&
                          lotteryHistory.length > 0 &&
                          lotteryHistory.map((item) => {
                            if (lotteryId != item.lotteryId) {
                              return (
                                <div
                                  className="history-entry mt-3"
                                  key={item.lotteryId}
                                >
                                  <div> Lottery #{item.lotteryId} winner: </div>
                                  <div>
                                    <a
                                      href={`https://bscscan.com/address/${item.address}`}
                                      target={"_blank"}
                                    >
                                      {item.address}
                                    </a>
                                  </div>
                                </div>
                              );
                            }
                          })}
                      </div>
                    </div>
                  </div>
                </section>
                <section className="mt-5">
                  <div className="card">
                    <div className="card-content">
                      <div className="content">
                        <h2> Player ({lotteryPlayers.length}) </h2>
                        <div>
                          <ul className="ml-0">
                            {lotteryPlayers &&
                              lotteryPlayers.length > 0 &&
                              lotteryPlayers.map((player, index) => {
                                return (
                                  <li key={`${player}-${index}`}>
                                    <a
                                      href={`https://bscscan.com/address/${player}`}
                                      target={"_blank"}
                                    >
                                      {player}
                                    </a>
                                  </li>
                                );
                              })}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
                <section className="mt-5">
                  <div className="card">
                    <div className="card-content">
                      <div className="content">
                        <h2> Pot </h2>
                        <p>{lotteryPot} ETH</p>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className={styles.footer}>
        <p>&copy; 2022 TOOB1ASS Codes</p>
      </footer>
    </div>
  );
}
