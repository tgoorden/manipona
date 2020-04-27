Proof of concept implementation of SumSy aka "mani pona", using DHT to construct a P2P network and a forward signed decentralized ledger.

## Installation

Clone the repository and run:

`npm install`

To be able to run a local server, also install `live-server`:

`npm install -g live-server`

## Run the application

Start a local DHT server from within the root folder:

`npm start`

In another process, start a webserver from the `dist` directory:

`cd dist`
`live-server`

(this defaults to port 8080)

Now open one or more browsers (you can also run incognito windows to simulate more users):

`http://127.0.0.1:8080/` or `http://localhost:8080/`

Every browser window has its own account (ID) and can make transactions. You can find the ledgers in the `IndexedBD` storage (under `Application` on Chrome).

