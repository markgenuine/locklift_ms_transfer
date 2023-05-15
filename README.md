# locklift_ms_transfer
Transfers from multis wallet used locklift.

1. Registered http://evercloud.dev. Add Project->Entered project name. Copy https://mainnet.evercloud.dev/%%%token%%%/graphql.
In %%%token%%% yours token for access.
2. export TESTNET_GQL_ENDPOINT=https://mainnet.evercloud.dev/%%%token%%%/graphql
3. Install if not have npm and make ```npm i```.
4. Edit file data_example.json
5. Execute script ```npx locklift run --network main --script scripts/transfer_ever_to_wallets.ts```
