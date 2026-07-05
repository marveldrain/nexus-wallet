import { useOnboarding, type Step } from './store';
import { AutoLock } from './AutoLock';
import { Welcome } from './screens/Welcome';
import { CreatePassword } from './screens/CreatePassword';
import { RevealSeed } from './screens/RevealSeed';
import { VerifySeed } from './screens/VerifySeed';
import { ImportWallet } from './screens/ImportWallet';
import { Unlock } from './screens/Unlock';
import { Dashboard } from './screens/Dashboard';
import { Send } from './screens/Send';
import { Receive } from './screens/Receive';
import { Activity } from './screens/Activity';
import { WatchAddress } from './screens/WatchAddress';
import { AddressBook } from './screens/AddressBook';
import { AddToken } from './screens/AddToken';
import { Accounts } from './screens/Accounts';
import { TransactionDetail } from './screens/TransactionDetail';
import { Settings } from './screens/Settings';
import { ChangePassword } from './screens/ChangePassword';
import { RevealSeedSettings } from './screens/RevealSeedSettings';

export default function App() {
  const step = useOnboarding((s) => s.step);

  return (
    <>
      <AutoLock />
      {renderScreen(step)}
    </>
  );
}

function renderScreen(step: Step) {
  switch (step) {
    case 'welcome':
      return <Welcome />;
    case 'create-password':
      return <CreatePassword />;
    case 'reveal':
      return <RevealSeed />;
    case 'verify':
      return <VerifySeed />;
    case 'import':
      return <ImportWallet />;
    case 'unlock':
      return <Unlock />;
    case 'dashboard':
      return <Dashboard />;
    case 'send':
      return <Send />;
    case 'receive':
      return <Receive />;
    case 'activity':
      return <Activity />;
    case 'watch':
      return <WatchAddress />;
    case 'contacts':
      return <AddressBook />;
    case 'add-token':
      return <AddToken />;
    case 'accounts':
      return <Accounts />;
    case 'tx-detail':
      return <TransactionDetail />;
    case 'settings':
      return <Settings />;
    case 'change-password':
      return <ChangePassword />;
    case 'reveal-seed':
      return <RevealSeedSettings />;
    default:
      return <Welcome />;
  }
}
