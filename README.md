# Minimal Bundler

## Installation

```bash
bun i
```

## Configuration

To configure the project, follow these steps:

1. Set the necessary environment variables.
2. The easiest way to do this is to create a local copy of the `.env` file:
    - Copy `.env` to `.env.local` for development.
    - Similarly, for test-related variables, copy `.env.test` to `.env.test.local`.

3. Populate the new files with any missing variables:
    - **Environment variables:**
        - `NETWORK_HTTP_TRANSPORT_URL`: For example, an endpoint (e.g., Alchemy API endpoint).
        - `RELAYER_ACCOUNTS_MNEMONIC`: A list of mnemonics to be used by the relayer.
        - `RELAYER_BENEFICIARY`: An address to which refunds for executed transactions will flow (eventually, this
          address could point to a smart contract).

    - **Test environment variables:**
        - `DEMO_EOA_PRIVATE_KEY`: The private key of the External Owned Account (EOA).
        - `DEMO_BUNDLER_URL`: The URL of the bundler.
        - **Example transaction variables:**
            - `DEMO_TX_RECIPIENT`: The recipient address for the demo transaction.
            - `DEMO_TX_VALUE`: Value of the demo transaction (e.g., `0.0001`).

### Example `.env.local`:

```dotenv
NETWORK_HTTP_TRANSPORT_URL=https://example-endpoint.io
RELAYER_ACCOUNTS_MNEMONIC=sample mnemonic phrase goes here
```

### Example `.env.test.local`:

```dotenv
DEMO_EOA_PRIVATE_KEY=your-eoa-private-key
DEMO_BUNDLER_URL=http://localhost:3000
DEMO_TX_RECIPIENT=0x151737e034C6E3b69DAe3665EB0Ed9A21d8eD37F
DEMO_TX_VALUE=0.0001
```

## Scripts

```bash
bun start # start the dev app in watch mode
bun run demo
```

## License

NONE
