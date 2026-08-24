import {
  supabase,
  isSupabaseConfigured,
  dbFetchPolls,
  dbFetchQuestions,
  dbFetchActiveQuizRound,
  dbFetchLeaderboard,
  dbUpsertAttendeePresence,
  dbFetchActiveRoomAttendees,
  dbRemoveAttendeePresence,
} from '../supabase';
import type {
  AttendeePresence,
  Question,
  LivePoll,
  QuizRoundState,
  LeaderboardEntry,
  SpotlightWinner,
} from '../../types';

export type RealtimeEventMap = {
  quiz_round_state: QuizRoundState;
  quiz_vote: { optionId: string; userId: string; points: number };
  leaderboard_update: LeaderboardEntry[];
  poll_update: LivePoll[];
  poll_vote: { pollId: string; optionId: string; voterSession: string };
  poll_reset: { pollId: string };
  question_list: Question[];
  question_upvote: { questionId: string; upvotesCount: number; voterSession: string };
  room_admin_promoted: { roomId: string; targetSessionId: string; targetName: string; action: 'promote' | 'demote' };
  attendee_spotlight: SpotlightWinner;
  presence_sync: AttendeePresence[];
  presence_ping: AttendeePresence;
  presence_pong: AttendeePresence;
  presence_leave: { sessionId: string };
};

export type EventKey = keyof RealtimeEventMap;
export type EventCallback<K extends EventKey> = (payload: RealtimeEventMap[K]) => void;

// Singleton cache per room
const managersByRoom = new Map<string, RealtimeChannelManager>();

export class RealtimeChannelManager {
  private roomId: string;
  private sessionId: string;
  private localChannel: BroadcastChannel | null = null;
  private listeners: Map<EventKey, Set<EventCallback<any>>> = new Map();
  private presenceList: Map<string, AttendeePresence> = new Map();
  private supabaseChannel: any = null;
  private myPresence: AttendeePresence | null = null;
  private pulseTimer: number | null = null;
  private isSubscribed: boolean = false;
  private outgoingQueue: Array<{ event: EventKey; payload: any }> = [];

  public static getInstance(roomId: string, sessionId?: string): RealtimeChannelManager {
    const key = (roomId || 'SKT-789').toUpperCase().trim();
    let instance = managersByRoom.get(key);
    if (!instance) {
      instance = new RealtimeChannelManager(key, sessionId);
      managersByRoom.set(key, instance);
    } else {
      if (sessionId && instance.sessionId !== sessionId) {
        instance.setSessionId(sessionId);
      }
      instance.ensureConnected();
    }
    return instance;
  }

  constructor(roomId: string, sessionId?: string) {
    this.roomId = (roomId || 'SKT-789').toUpperCase().trim();
    this.sessionId = sessionId || 'user_' + Math.random().toString(36).substring(2, 10);
    this.initLocalBroadcast();
    this.initSupabaseRealtime();
    this.startAdaptivePulseEngine();
  }

  public setSessionId(sessionId: string) {
    this.sessionId = sessionId;
  }

  // --- LAYER 3: Browser Local BroadcastChannel (0ms Same-Origin Sync) ---
  private initLocalBroadcast() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.localChannel = new BroadcastChannel(`sketchcast_room_${this.roomId}`);
        this.localChannel.onmessage = (event) => {
          const { type, payload, senderSessionId } = event.data;
          if (senderSessionId === this.sessionId) return;
          this.emitLocal(type as EventKey, payload);
        };
      } catch {
        // BroadcastChannel unavailable
      }
    }
  }

  // --- LAYER 1: Supabase WebSockets (Sub-30ms Fire-and-Forget Broadcast & Presence) ---
  public ensureConnected() {
    if (!isSupabaseConfigured || !supabase) return;
    if (!this.supabaseChannel || this.supabaseChannel.state === 'closed' || this.supabaseChannel.state === 'errored') {
      this.initSupabaseRealtime();
    } else if (this.supabaseChannel.state === 'joined') {
      this.isSubscribed = true;
      this.flushOutgoingQueue();
    }
  }

  private initSupabaseRealtime() {
    if (!isSupabaseConfigured || !supabase) return;

    if (this.supabaseChannel) {
      try {
        supabase.removeChannel(this.supabaseChannel);
      } catch {
        // ignore
      }
    }

    const channelName = `sketchcast-room-${this.roomId}`;
    this.supabaseChannel = supabase.channel(channelName, {
      config: {
        broadcast: { self: true, ack: false }, // sub-30ms zero-lag fire-and-forget
        presence: { key: this.sessionId },
      },
    });

    // 1. WebSocket Broadcast Event Listeners
    const broadcastEvents: EventKey[] = [
      'quiz_round_state',
      'quiz_vote',
      'leaderboard_update',
      'poll_update',
      'poll_vote',
      'poll_reset',
      'question_list',
      'question_upvote',
      'room_admin_promoted',
      'attendee_spotlight',
      'presence_ping',
      'presence_pong',
      'presence_leave',
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

    // 2. PostgreSQL CDC Table Change Listeners (Realtime DB Sync)
    this.supabaseChannel
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_attendees' },
        async (payload: any) => {
          if (
            (payload.new && payload.new.room_code === this.roomId) ||
            (payload.old && payload.old.room_code === this.roomId)
          ) {
            this.syncFromDatabasePresence();
          }
        }
      )
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
              updatedAt: round.created_at ? new Date(round.created_at).getTime() : Date.now(),
            };
            this.emitLocal('quiz_round_state', state);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'polls' },
        async (payload: any) => {
          if (
            (payload.new && (payload.new.room_id === this.roomId || payload.new.room_id === `room-${this.roomId}`)) ||
            (payload.old && (payload.old.room_id === this.roomId || payload.old.room_id === `room-${this.roomId}`))
          ) {
            const polls = await dbFetchPolls(this.roomId);
            if (polls) this.emitLocal('poll_update', polls);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'questions' },
        async (payload: any) => {
          if (
            (payload.new && (payload.new.room_id === this.roomId || payload.new.room_id === `room-${this.roomId}`)) ||
            (payload.old && (payload.old.room_id === this.roomId || payload.old.room_id === `room-${this.roomId}`))
          ) {
            const questions = await dbFetchQuestions(this.roomId);
            if (questions) this.emitLocal('question_list', questions);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leaderboard' },
        async (payload: any) => {
          if (payload.new && (payload.new.room_id === this.roomId || payload.new.room_id === `room-${this.roomId}`)) {
            const board = await dbFetchLeaderboard(this.roomId);
            if (board) this.emitLocal('leaderboard_update', board);
          }
        }
      );

    // 3. Supabase In-Memory Presence Handlers
    const handlePresenceState = () => {
      if (!this.supabaseChannel) return;
      const state = this.supabaseChannel.presenceState();
      
      for (const key in state) {
        const presences = state[key] as any[];
        if (presences && Array.isArray(presences)) {
          presences.forEach((p) => {
            if (p) {
              const sid = p.session_id || key;
              const presenceObj: AttendeePresence = {
                session_id: sid,
                name: p.name || 'Attendee',
                role: p.role || 'attendee',
                joined_at: p.joined_at || Date.now(),
                last_active: p.last_active || Date.now(),
              };
              this.presenceList.set(sid, presenceObj);
            }
          });
        }
      }

      if (this.myPresence) {
        this.presenceList.set(this.myPresence.session_id, this.myPresence);
      }

      this.emitPresenceSync();
    };

    this.supabaseChannel
      .on('presence', { event: 'sync' }, handlePresenceState)
      .on('presence', { event: 'join' }, handlePresenceState)
      .on('presence', { event: 'leave' }, handlePresenceState)
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          this.isSubscribed = true;
          this.flushOutgoingQueue();

          // Track presence immediately upon subscription
          if (this.myPresence) {
            try {
              await this.supabaseChannel.track(this.myPresence);
              this.broadcast('presence_ping', this.myPresence);
            } catch {
              // ignore
            }
          }

          // Initial DB presence and state sync
          this.syncAllFromDatabase();
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          this.isSubscribed = false;
        }
      });
  }

  private flushOutgoingQueue() {
    if (!this.supabaseChannel) return;
    while (this.outgoingQueue.length > 0) {
      const item = this.outgoingQueue.shift();
      if (item) {
        try {
          this.supabaseChannel.send({
            type: 'broadcast',
            event: item.event,
            payload: item.payload,
          });
        } catch {
          // ignore
        }
      }
    }
  }

  // --- LAYER 2: PostgreSQL Presence & State Sync Engine (4-Second Pulse) ---
  private startAdaptivePulseEngine() {
    if (typeof window !== 'undefined') {
      const pulse = async () => {
        try {
          this.ensureConnected();

          // 1. Heartbeat to Postgres DB table
          if (this.myPresence) {
            dbUpsertAttendeePresence(
              this.roomId,
              this.myPresence.session_id,
              this.myPresence.name,
              this.myPresence.role
            );
          }

          // 2. Track to Supabase WebSocket channel
          if (this.myPresence && this.supabaseChannel && this.isSubscribed) {
            this.supabaseChannel.track(this.myPresence).catch(() => {});
          }

          // 3. Sync full active roster & room states from DB
          await this.syncAllFromDatabase();
        } catch {
          // silent catch
        }
      };

      // Run immediate pulse
      pulse();

      // Pulse every 4 seconds for ultra-responsive live presence & continuous state sync
      this.pulseTimer = window.setInterval(pulse, 4000);

      // Sync immediately when window gets focus or tab becomes visible
      const onFocusOrVisible = () => {
        if (document.visibilityState === 'visible') {
          this.ensureConnected();
          pulse();
        }
      };
      window.addEventListener('focus', onFocusOrVisible);
      document.addEventListener('visibilitychange', onFocusOrVisible);

      // Cleanup presence on tab close / reload
      window.addEventListener('beforeunload', () => {
        if (this.myPresence) {
          dbRemoveAttendeePresence(this.myPresence.session_id);
          this.broadcast('presence_leave', { sessionId: this.myPresence.session_id });
        }
      });
    }
  }

  // Synchronize full active room states from database
  public async syncAllFromDatabase() {
    await Promise.allSettled([
      this.syncFromDatabasePresence(),
      this.syncQuizFromDatabase(),
      this.syncPollsFromDatabase(),
      this.syncQuestionsFromDatabase(),
      this.syncLeaderboardFromDatabase(),
    ]);
  }

  public async syncFromDatabasePresence() {
    try {
      const activeDbAttendees = await dbFetchActiveRoomAttendees(this.roomId, 20);
      if (activeDbAttendees && activeDbAttendees.length > 0) {
        const nextMap = new Map<string, AttendeePresence>();
        activeDbAttendees.forEach((att) => {
          if (att && att.session_id) {
            nextMap.set(att.session_id, att);
          }
        });

        if (this.myPresence) {
          nextMap.set(this.myPresence.session_id, this.myPresence);
        }

        this.presenceList = nextMap;
        this.emitPresenceSync();
      }
    } catch {
      // silent fallback
    }
  }

  public async syncQuizFromDatabase() {
    try {
      const activeRound = await dbFetchActiveQuizRound(this.roomId);
      if (activeRound && activeRound.question) {
        this.emitLocal('quiz_round_state', activeRound);
      }
    } catch {
      // silent fallback
    }
  }

  public async syncPollsFromDatabase() {
    try {
      const polls = await dbFetchPolls(this.roomId);
      if (polls) {
        this.emitLocal('poll_update', polls);
      }
    } catch {
      // silent fallback
    }
  }

  public async syncQuestionsFromDatabase() {
    try {
      const questions = await dbFetchQuestions(this.roomId);
      if (questions) {
        this.emitLocal('question_list', questions);
      }
    } catch {
      // silent fallback
    }
  }

  public async syncLeaderboardFromDatabase() {
    try {
      const board = await dbFetchLeaderboard(this.roomId);
      if (board && board.length > 0) {
        this.emitLocal('leaderboard_update', board);
      }
    } catch {
      // silent fallback
    }
  }

  private emitPresenceSync() {
    const users = Array.from(this.presenceList.values());
    this.emitLocal('presence_sync', users);
  }

  public on<K extends EventKey>(event: K, callback: EventCallback<K>) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // If subscribing to presence_sync, immediately emit current known presence list
    if (event === 'presence_sync') {
      const users = Array.from(this.presenceList.values());
      if (users.length > 0) {
        try {
          (callback as EventCallback<'presence_sync'>)(users);
        } catch {
          // ignore
        }
      }
    }

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private emitLocal<K extends EventKey>(event: K, payload: RealtimeEventMap[K]) {
    if (event === 'presence_sync') {
      const list = payload as AttendeePresence[];
      if (Array.isArray(list)) {
        list.forEach((p) => {
          if (p && p.session_id) this.presenceList.set(p.session_id, p);
        });
      }
      if (this.myPresence) {
        this.presenceList.set(this.myPresence.session_id, this.myPresence);
      }
    } else if (event === 'presence_ping') {
      const senderPresence = payload as AttendeePresence;
      if (senderPresence && senderPresence.session_id) {
        this.presenceList.set(senderPresence.session_id, senderPresence);
        if (this.myPresence && senderPresence.session_id !== this.myPresence.session_id) {
          this.broadcast('presence_pong', this.myPresence);
        }
        this.emitPresenceSync();
      }
    } else if (event === 'presence_pong') {
      const senderPresence = payload as AttendeePresence;
      if (senderPresence && senderPresence.session_id) {
        this.presenceList.set(senderPresence.session_id, senderPresence);
        this.emitPresenceSync();
      }
    } else if (event === 'presence_leave') {
      const { sessionId } = payload as { sessionId: string };
      if (sessionId && sessionId !== this.myPresence?.session_id) {
        this.presenceList.delete(sessionId);
        this.emitPresenceSync();
      }
    }

    const handlers = this.listeners.get(event);
    if (handlers) {
      const dispatchPayload = event === 'presence_sync' ? Array.from(this.presenceList.values()) : payload;
      handlers.forEach((fn) => {
        try {
          fn(dispatchPayload as any);
        } catch {
          // ignore
        }
      });
    }
  }

  public broadcast<K extends EventKey>(event: K, payload: RealtimeEventMap[K]) {
    // 1. Optimistic Local Dispatch (0ms latency for sender UI)
    this.emitLocal(event, payload);

    // 2. Local Same-Browser Tab Broadcast
    if (this.localChannel) {
      try {
        this.localChannel.postMessage({
          type: event,
          payload,
          senderSessionId: this.sessionId,
        });
      } catch {
        // ignore
      }
    }

    // 3. Supabase Realtime WebSocket Broadcast
    if (this.supabaseChannel && isSupabaseConfigured) {
      try {
        this.supabaseChannel.send({
          type: 'broadcast',
          event: event,
          payload,
        });
      } catch {
        this.outgoingQueue.push({ event, payload });
      }
    }
  }

  public trackPresence(presence: AttendeePresence) {
    this.myPresence = presence;
    this.presenceList.set(presence.session_id, presence);
    this.emitPresenceSync();

    // 1. DB Heartbeat
    dbUpsertAttendeePresence(this.roomId, presence.session_id, presence.name, presence.role);

    // 2. Realtime WebSocket Broadcast Ping
    this.broadcast('presence_ping', presence);

    // 3. Supabase WebSocket Track
    if (this.supabaseChannel && isSupabaseConfigured) {
      try {
        this.supabaseChannel.track(presence).catch(() => {});
      } catch {
        // ignore
      }
    }
  }

  public pingPresence() {
    if (this.myPresence) {
      this.trackPresence(this.myPresence);
    }
    this.syncAllFromDatabase();
  }

  public destroy() {
    if (this.pulseTimer) clearInterval(this.pulseTimer);
    if (this.localChannel) this.localChannel.close();
    if (this.myPresence) {
      dbRemoveAttendeePresence(this.myPresence.session_id);
    }
    if (this.supabaseChannel && supabase) {
      supabase.removeChannel(this.supabaseChannel);
    }
    this.listeners.clear();
    managersByRoom.delete(this.roomId);
  }
}
