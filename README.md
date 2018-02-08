# IOTA Wallet

IOTA is a distributed ledger protocol. No fees on transactions and no fixed limit to load on transaction confirmations. The more activity, the faster the network. 

## Download wallet

You can download the latest wallet software from https://github.com/iotaledger/wallet/releases. Go to the download section for the latest release and find the respective version for your operating system. For Mac users its the `.dmg` file and for Windows users its the `.exe` file.

## Compile from source

If your are interested in the development please follow these steps to compile from source:

### Prerequisites

1. Download [NodeJS](https://nodejs.org/en/download/)

2. Install [Electron](http://electron.atom.io) and [Bower](https://bower.io/):

  ```
  npm install -g electron bower
  ```

##### For Windows Users Only

  Please Run the following command as Administrator:

  ```
  npm install -g --production windows-build-tools
  ```


### Instructions

1. Clone this repository:

  ```
  git clone https://github.com/iotaledger/wallet
  ```

2. Go to the `wallet` directory:

  ```
  cd wallet
  ```

3. Clone iri: 

  ```
  git clone https://github.com/iotaledger/iri
  ```

  Note: make sure compiled iri.jar is in the `iri` folder.
  
4. Install components

  ```
  npm install
  ```

5. Run the app:

  ```
  npm start
  ```
  
## Testnet

To build for the testnet, please rename `package.testnet.json` to `package.json` and follow same instructions as normal, but make sure the jar is named `iri-testnet.jar`.


## Compiling

If you wish to compile the app after building from source, please follow these 

1. Make sure you have [Electron Builder](https://github.com/electron-userland/electron-builder) Installed. Electron Builder is used behind the scenes. Read their [instructions](https://github.com/electron-userland/electron-builder/wiki/Multi-Platform-Build) on how to set up your system.

2. Make sure you have [Docker](https://www.docker.com) installed.


3. When you wish to compile the app: 

  ```
  npm run compile
  ```
  Compiled binaries are found in the `out` directory.
  If you'd like to create a package only for a specific OS, you can do so with: 

  ```
  npm run compile:win
  npm run compile:mac
  npm run compile:lin
  ```



