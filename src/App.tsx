import { useState } from 'react';
import { AppProvider } from './state/AppContext';
import { TabBar, type Tab } from './components/TabBar';
import { PeopleManager } from './components/People/PeopleManager';
import { ExpensesTab } from './components/Expenses/ExpensesTab';
import { BalancesView } from './components/Balances/BalancesView';
import { SettleUpView } from './components/SettleUp/SettleUpView';

function AppShell() {
  const [tab, setTab] = useState<Tab>('people');

  return (
    <div className="app">
      <header className="app-header">
        <h1>Expense Splitter</h1>
        <p className="subtitle">Add people &rarr; log expenses &rarr; view balances &rarr; settle up</p>
      </header>
      <TabBar active={tab} onChange={setTab} />
      <main className="app-main">
        {tab === 'people' && <PeopleManager onNavigate={setTab} />}
        {tab === 'expenses' && <ExpensesTab onNavigate={setTab} />}
        {tab === 'balances' && <BalancesView onNavigate={setTab} />}
        {tab === 'settleup' && <SettleUpView onNavigate={setTab} />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
