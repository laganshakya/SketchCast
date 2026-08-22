import {
  supabase,
  isSupabaseConfigured,
  dbFetchPolls,
  dbFetchQuestions,
  dbFetchActiveQuizRound,
} from '../supabase';
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

// Singleton cache per room to ensure perfect connection stability
const managersByRoom = new Map<string, RealtimeChannelManager>();

export class RealtimeChannelManager {
  private roomId: string;
  private localChannel: BroadcastChannel | null = null;
  private listeners: Map<EventKey, Set<EventCallback<any>>> = new Map();
  private presenceList: Map<string, AttendeePresence> = new Map();
  private supabaseChannel: any = null;
  private myPresence: AttendeePresence | null = null;
  private syncTimer: number | null = null;
  private isSubscribed: boolean = false;
  private outgoingQueue: Array<{ event: EventKey; payload: any }> = [];

  public static getInstance(roomId: string): RealtimeChannelManager {
    const key = (roomId || 'SKT-789').toUpperCase().trim();
    let instance = managersByRoom.get(key);
    if (!instance) {
      instance = new RealtimeChannelManager(key);
      managersByRoom.set(key, instance);
    }
    return instance;
  }

  constructor(roomId: string) {
    this.roomId = (roomId || 'SKT-789').toUpperCase().trim();
    this.initLocalBroadcast();
    this.initSupabaseRealtime();
    this.startAdaptiveSyncLoop();
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

    const channelName = `sketchcast-room-${this.roomId}`;
    this.supabaseChannel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false, ack: true },
        presence: { key: this.roomId },
      },
    });

    // 1. WebSocket Broadcast Listeners
    const broadcastEvents: EventKey[] = [
      'quiz_round_state',
      'quiz_vote',
      'poll_update',
      'poll_vote',
      'question_list',
      'question_upvote',
    ];

    broadcastEvents.forEach((ev) => {
      this.supabaseChannel.on(
        'broadcast',
        { event: ev },
        ({ payload }: { payload: any }) => {
          this.emitLocal(ev, payload);
        }
      );
    });

    // 2. PostgreSQL CDC Table Change Listeners
    this.supabaseChannel
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quiz_rounds' },
        (payload: any) => {
          if (payload.new && (payload.new.room_id === this.roomId || payload.new.room_id === `room-${this.roomId}`)) {
            const round = payload.new;
            const state: QuizRoundState = {
              isActive: round.is_active,
              question: round.question_data,
              endTime: round.end_time ? Number(round.end_time) : null,
              totalSeconds: round.question_data?.timeLimitSeconds || 25,
              isRevealed: round.is_revealed,
              userSelectedOption: null,
              isCorrect: null,
              pointsEarned: 0,
              votesDistribution: round.votes_distribution || { A: 0, B: 0, C: 0, D: 0 },
            };
            this.emitLocal('quiz_round_state', state);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'polls' },
        async (payload: any) => {
          if (payload.new && (payload.new.room_id === this.roomId || payload.new.room_id === `room-${this.roomId}`)) {
            const polls = await dbFetchPolls(this.roomId);
            if (polls) this.emitLocal('poll_update', polls);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'questions' },
        async (payload: any) => {
          if (payload.new && (payload.new.room_id === this.roomId || payload.new.room_id === `room-${this.roomId}`)) {
            const questions = await dbFetchQuestions(this.roomId);
            if (questions) this.emitLocal('question_list', questions);
          }
        }
      );

    // 3. Presence synchronization
    this.supabaseChannel
      .on('presence', { event: 'sync' }, () => {
        const state = this.supabaseChannel.presenceState();
        const users: AttendeePresence[] = [];
        for (const key in state) {
          const presences = state[key] as AttendeePresence[];
          if (presences && presences.length > 0) {
            users.push(presences[0]);
          }
        }
        this.emitLocal('presence_sync', users);
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          this.isSubscribed = true;
          // Flush any queued outgoing broadcast events
          while (this.outgoingQueue.length > 0) {
            const item = this.outgoingQueue.shift();
            if (item) {
              this.supabaseChannel.send({
                type: 'broadcast',
                event: item.event,
                payload: item.payload,
              });
            }
          }
          if (this.myPresence) {
            this.supabaseChannel.track(this.myPresence);
          }
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          this.isSubscribed = false;
        }
      });
  }

  // Adaptive sync loop for current room
  private startAdaptiveSyncLoop() {
    if (typeof window !== 'undefined') {
      const performSync = async () => {
        try {
          const activeRound = await dbFetchActiveQuizRound(this.roomId);
          if (activeRound && activeRound.question) {
            this.emitLocal('quiz_round_state', activeRound);
          }

          const polls = await dbFetchPolls(this.roomId);
          if (polls) {
            this.emitLocal('poll_update', polls);
          }

          const questions = await dbFetchQuestions(this.roomId);
          if (questions) {
            this.emitLocal('question_list', questions);
          }
        } catch {
          // silent fallback
        }
      };

      const onVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          performSync();
        }
      };
      window.addEventListener('focus', performSync);
      document.addEventListener('visibilitychange', onVisibilityChange);

      this.syncTimer = window.setInterval(() => {
        if (document.visibilityState === 'visible') {
          performSync();
        }
      }, 2500);
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
      handlers.forEach((fn) => {
        try {
          fn(payload);
        } catch {
          // ignore
        }
      });
    }
  }

  public broadcast<K extends EventKey>(event: K, payload: RealtimeEventMap[K]) {
    // 1. Local Same-Browser Tab Broadcast
    if (this.localChannel) {
      try {
        this.localChannel.postMessage({ type: event, payload });
      } catch {
        // ignore
      }
    }

    // 2. Supabase Realtime WebSocket Broadcast
    if (this.supabaseChannel && isSupabaseConfigured) {
      if (this.isSubscribed) {
        try {
          this.supabaseChannel.send({
            type: 'broadcast',
            event: event,
            payload,
          });
        } catch {
          this.outgoingQueue.push({ event, payload });
        }
      } else {
        this.outgoingQueue.push({ event, payload });
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

    if (this.supabaseChannel && isSupabaseConfigured && this.isSubscribed) {
      try {
        this.supabaseChannel.track(presence);
      } catch {
        // ignore
      }
    }
  }

  public destroy() {
    if (this.syncTimer) clearInterval(this.syncTimer);
    if (this.localChannel) this.localChannel.close();
    if (this.supabaseChannel && supabase) {
      supabase.removeChannel(this.supabaseChannel);
    }
    this.listeners.clear();
    managersByRoom.delete(this.roomId);
  }
}
