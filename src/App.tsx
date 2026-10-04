import { useEffect, useState } from 'react';
import { loadFakeData } from './data/fakeData';
import { loadDemoScript } from './data/demoScript';
import { initialDispatchState } from './logic/dispatch';
import { parseRoute } from './logic/route';
import { ClockProvider, useClock } from './state/Clock';
import { DispatchStoreProvider, useDispatchStore } from './state/DispatchStore';
import { DispatchPage } from './pages/DispatchPage';
import { TeamView } from './pages/TeamView';

const demoScript = loadDemoScript();

/** Fake data with its timestamps shifted to end just before `at` (see loadFakeData). */
export function freshState(at: Date) {
  return initialDispatchState(loadFakeData({ shiftTo: at }));
}

function useHash(): string {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return hash;
}

/**
 * Both screens share one in-memory store, so they only stay in sync inside the
 * same browser tab until Supabase is connected.
 */
export function App() {
  return (
    <ClockProvider>
      <Shell />
    </ClockProvider>
  );
}

function Shell() {
  const clock = useClock();
  const [initial] = useState(() => freshState(new Date()));
  return (
    <DispatchStoreProvider initial={initial} getNow={clock.now}>
      <DemoRunner />
      <Screens />
    </DispatchStoreProvider>
  );
}

function Screens() {
  const route = parseRoute(useHash());
  return route.page === 'team' ? <TeamView teamId={route.teamId} /> : <DispatchPage demoScript={demoScript} />;
}

/** While the demo clock runs, applies scripted steps as their time comes. */
function DemoRunner() {
  const { clock, now } = useClock();
  const { demoTick } = useDispatchStore();
  useEffect(() => {
    if (!clock) return;
    const simStart = clock.simStart;
    demoTick(demoScript, simStart, now().getTime());
    if (!clock.running) return;
    const id = setInterval(() => demoTick(demoScript, simStart, now().getTime()), 250);
    return () => clearInterval(id);
  }, [clock, now, demoTick]);
  return null;
}
