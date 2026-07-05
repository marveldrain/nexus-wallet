import { resolveEnsName, looksLikeEnsName } from '../packages/chain-rpc/dist/index.js';
const rpcs = ['https://ethereum-rpc.publicnode.com', 'https://eth.drpc.org'];
console.log('looksLikeEnsName(vitalik.eth):', looksLikeEnsName('vitalik.eth'));
console.log('vitalik.eth =>', await resolveEnsName(rpcs, 'vitalik.eth'));
console.log('nonexistent-xyz-123.eth =>', await resolveEnsName(rpcs, 'nonexistent-xyz-123.eth'));
console.log('passthrough 0xADDR =>', await resolveEnsName(rpcs, '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'));
