import { supabase, isSupabaseConfigured } from '../supabase';
import type {
  AttendeePresence,
  Question,
  LivePoll,
  QuizRoundState
} from '../../types';

export type RealtimeEventMap = {
  quiz_round_state: QuizRoundState;
  quiz_vote: { optionId: string; userId: string; points: number };
  poll_update: LivePoll[];
  poll_vote: { pollId: string; optionId: string; voterSession: string };
  question_list: Question[];
  question_upvote: { questionId: string; upvotesCount: number; voterSession: string };
  presence_sync: AttendeePresence[];
};

export type EventKey = keyof RealtimeEventMap;
export type EventCallback<K extends EventKey> = (payload: RealtimeEventMap[K]) => void;

export class RealtimeChannelManager {
  private roomId: string;
  private localChannel: BroadcastChannel | null = null;
  private listeners: Map<EventKey, Set<EventCallback<any>>> = new Map();
  private presenceList: Map<string, AttendeePresence> = new Map();
  private supabasePresenceChannel: any = null;
  private myPresence: AttendeePresence | null = null;
  private heartbeatTimer: number | null = null;

  constructor(roomId: string) {
    this.roomId = roomId;
    this.initLocalBroadcast();
    this.initSupabaseRealtime();
    this.startPresenceHeartbeat();
  }

  private initLocalBroadcast() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.localChannel = new BroadcastChannel(`sketchcast_room_${this.roomId}`);
        this.localChannel.onmessage = (event) => {
          const { type, payload } = event.data;
          this.emitLocal(type as EventKey, payload);
        };
      } catch {
        // BroadcastChannel unavailable
      }
    }
  }

  private initSupabaseRealtime() {
    if (!isSupabaseConfigured || !supabase) return;

    this.supabasePresenceChannel = supabase.channel(`room:${this.roomId}:lobby`);
    this.supabasePresenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = this.supabasePresenceChannel.presenceState();
        const users: AttendeePresence[] = [];
        for (const key in state) {
          const presences = state[key] as AttendeePresence[];
          if (presences && presences.length > 0) {
            users.push(presences[0]);
          }
        }
        this.emitLocal('presence_sync', users);
      })
      .subscribe();
  }

  private startPresenceHeartbeat() {
    if (typeof window !== 'undefined') {
      this.heartbeatTimer = window.setInterval(() => {
        const now = Date.now();
        let changed = false;
        for (const [key, val] of this.presenceList.entries()) {
          if (now - val.last_active > 15000) {
            this.presenceList.delete(key);
            changed = true;
          }
        }
        if (changed) {
          this.emitLocal('presence_sync', Array.from(this.presenceList.values()));
        }
        if (this.myPresence) {
          this.myPresence.last_active = now;
          this.trackPresence(this.myPresence);
        }
      }, 4000);
    }
  }

  public on<K extends EventKey>(event: K, callback: EventCallback<K>) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private emitLocal<K extends EventKey>(event: K, payload: RealtimeEventMap[K]) {
    if (event === 'presence_sync') {
      const list = payload as AttendeePresence[];
      list.forEach((p) => this.presenceList.set(p.session_id, p));
    }
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((fn) => fn(payload));
    }
  }

  public broadcast<K extends EventKey>(event: K, payload: RealtimeEventMap[K]) {
    if (this.localChannel) {
      try {
        this.localChannel.postMessage({ type: event, payload });
      } catch {
        // failed postMessage
      }
    }
  }

  public trackPresence(presence: AttendeePresence) {
    this.myPresence = presence;
    this.presenceList.set(presence.session_id, presence);
    this.emitLocal('presence_sync', Array.from(this.presenceList.values()));

    if (this.localChannel) {
      try {
        this.localChannel.postMessage({
          type: 'presence_sync',
          payload: Array.from(this.presenceList.values()),
        });
      } catch {
        // ignore
      }
    }

    if (this.supabasePresenceChannel && isSupabaseConfigured) {
      this.supabasePresenceChannel.track(presence);
    }
  }

  public destroy() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.localChannel) this.localChannel.close();
    if (this.supabasePresenceChannel) this.supabasePresenceChannel.unsubscribe();
    this.listeners.clear();
  }
}
