import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react';
import type { IncidentStatus, TeamStatus } from '../types';
import type { DispatchResult, DispatchState } from '../logic/dispatch';
import {
  acknowledgeAlert,
  assignTeam,
  checkInTeam,
  confirmHealth,
  recallTeam,
  reportFromField,
  updateIncidentStatus,
  updateTeamStatus,
} from '../logic/dispatch';
import type { FeedbackInput } from '../logic/feedback';
import { submitFeedback } from '../logic/feedback';
import type { DemoLogEntry, DemoScript } from '../logic/demo';
import { runDueSteps } from '../logic/demo';

/** Placeholder until login exists (Person 3; PLAN.md Q6). */
export const CURRENT_ACTOR = 'dispatcher';

/** Actor name for changes made from a team's own view. */
export const teamActor = (teamId: string) => `team:${teamId}`;

type Action = { at: Date; actor: string } & (
  | { type: 'assign'; incidentId: string; teamId: string; backup: boolean }
  | { type: 'incidentStatus'; incidentId: string; to: IncidentStatus }
  | { type: 'teamStatus'; teamId: string; to: TeamStatus }
  | { type: 'recall'; teamId: string }
  | { type: 'confirmHealth'; incidentId: string }
  | { type: 'checkIn'; teamId: string }
  | { type: 'fieldReport'; teamId: string; to: IncidentStatus }
  | { type: 'feedback'; input: FeedbackInput }
  | { type: 'ackAlert'; alertId: string }
);

type Control =
  | { type: 'clearError' }
  | { type: 'reset'; data: DispatchState }
  | { type: 'demoTick'; script: DemoScript; simStart: number; now: number };

interface StoreState {
  data: DispatchState;
  /** Reasons the last action was refused, if it was. */
  error: string[] | null;
  /** Demo script steps already run (applied or skipped), and what happened. */
  demoDone: string[];
  demoLog: DemoLogEntry[];
}

function run(data: DispatchState, action: Action): DispatchResult {
  const ctx = { now: action.at, actor: action.actor };
  switch (action.type) {
    case 'assign':
      return assignTeam(data, action.incidentId, action.teamId, ctx, { backup: action.backup });
    case 'incidentStatus':
      return updateIncidentStatus(data, action.incidentId, action.to, ctx);
    case 'teamStatus':
      return updateTeamStatus(data, action.teamId, action.to, ctx);
    case 'recall':
      return recallTeam(data, action.teamId, ctx);
    case 'confirmHealth':
      return confirmHealth(data, action.incidentId, ctx);
    case 'checkIn':
      return checkInTeam(data, action.teamId, ctx);
    case 'fieldReport':
      return reportFromField(data, action.teamId, action.to, ctx);
    case 'feedback':
      return submitFeedback(data, action.input, ctx);
    case 'ackAlert':
      return acknowledgeAlert(data, action.alertId, ctx);
  }
}

function fresh(data: DispatchState): StoreState {
  return { data, error: null, demoDone: [], demoLog: [] };
}

function reducer(store: StoreState, action: Action | Control): StoreState {
  if (action.type === 'clearError') return { ...store, error: null };
  if (action.type === 'reset') return fresh(action.data);
  if (action.type === 'demoTick') {
    // Runs on the latest state, so scripted steps and manual actions never race.
    const r = runDueSteps(store.data, action.script, new Set(store.demoDone), action.simStart, action.now);
    if (r.log.length === 0) return store;
    return {
      ...store,
      data: r.state,
      demoDone: [...store.demoDone, ...r.log.map((e) => e.stepId)],
      demoLog: [...store.demoLog, ...r.log],
    };
  }
  const result = run(store.data, action);
  return result.ok ? { ...store, data: result.state, error: null } : { ...store, error: result.reasons };
}

interface StoreApi {
  data: DispatchState;
  error: string[] | null;
  demoLog: DemoLogEntry[];
  demoDone: ReadonlySet<string>;
  assign: (incidentId: string, teamId: string, backup: boolean) => void;
  setIncidentStatus: (incidentId: string, to: IncidentStatus) => void;
  setTeamStatus: (teamId: string, to: TeamStatus) => void;
  recall: (teamId: string) => void;
  confirmHealth: (incidentId: string) => void;
  /** `actor` defaults to the dispatcher (e.g. a check-in received by radio). */
  checkIn: (teamId: string, actor?: string) => void;
  /** From the team view; the team is the actor. */
  fieldReport: (teamId: string, to: IncidentStatus) => void;
  submitFeedback: (input: FeedbackInput) => DispatchResult;
  acknowledgeAlert: (alertId: string) => void;
  clearError: () => void;
  /** Replace everything (new data, empty demo progress). */
  reset: (data: DispatchState) => void;
  /** Run demo script steps that are due at simulated time `now`. */
  demoTick: (script: DemoScript, simStart: number, now: number) => void;
}

const StoreContext = createContext<StoreApi | null>(null);

/**
 * In-memory dispatch state. A PostgreSQL-backed source replaces this later; the logic stays the same.
 * `getNow` is the app clock (simulated in demo mode); every action is stamped with it.
 */
export function DispatchStoreProvider({
  initial,
  getNow,
  children,
}: {
  initial: DispatchState;
  getNow: () => Date;
  children: ReactNode;
}) {
  const [store, send] = useReducer(reducer, initial, fresh);
  const api = useMemo<StoreApi>(() => {
    const at = getNow;
    return {
      data: store.data,
      error: store.error,
      demoLog: store.demoLog,
      demoDone: new Set(store.demoDone),
      assign: (incidentId, teamId, backup) =>
        send({ type: 'assign', at: at(), actor: CURRENT_ACTOR, incidentId, teamId, backup }),
      setIncidentStatus: (incidentId, to) => send({ type: 'incidentStatus', at: at(), actor: CURRENT_ACTOR, incidentId, to }),
      setTeamStatus: (teamId, to) => send({ type: 'teamStatus', at: at(), actor: CURRENT_ACTOR, teamId, to }),
      recall: (teamId) => send({ type: 'recall', at: at(), actor: CURRENT_ACTOR, teamId }),
      confirmHealth: (incidentId) => send({ type: 'confirmHealth', at: at(), actor: CURRENT_ACTOR, incidentId }),
      checkIn: (teamId, actor = CURRENT_ACTOR) => send({ type: 'checkIn', at: at(), actor, teamId }),
      fieldReport: (teamId, to) => send({ type: 'fieldReport', at: at(), actor: teamActor(teamId), teamId, to }),
      submitFeedback: (input) => {
        // Run once here so the form can show the outcome; the reducer repeats the same pure call.
        const action = { type: 'feedback' as const, at: at(), actor: teamActor(input.teamId), input };
        const result = run(store.data, action);
        send(action);
        return result;
      },
      acknowledgeAlert: (alertId) => send({ type: 'ackAlert', at: at(), actor: CURRENT_ACTOR, alertId }),
      clearError: () => send({ type: 'clearError' }),
      reset: (data) => send({ type: 'reset', data }),
      demoTick: (script, simStart, now) => send({ type: 'demoTick', script, simStart, now }),
    };
  }, [store, getNow]);
  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useDispatchStore(): StoreApi {
  const api = useContext(StoreContext);
  if (!api) throw new Error('useDispatchStore must be used inside DispatchStoreProvider');
  return api;
}
