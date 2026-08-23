import {
  supabase,
  isSupabaseConfigured,
  dbFetchPolls,
  dbFetchQuestions,
  dbFetchActiveQuizRound,
  dbFetchLeaderboard,
} from '../supabase';
import type {
  AttendeePresence,
  Question,
  LivePoll,
  QuizRoundState,
  LeaderboardEntry,
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
  presence_sync: AttendeePresence[];
  presence_ping: AttendeePresence;
  presence_pong: AttendeePresence;
};

export type EventKey = keyof RealtimeEventMap;
export type EventCallback<K extends EventKey> = (payload: RealtimeEventMap[K]) => void;

// Singleton cache per room to ensure connection stability
const managersByRoom = new Map<string, RealtimeChannelManager>();

export class RealtimeChannelManager {
  private roomId: string;
  private sessionId: string;
  private localChannel: BroadcastChannel | null = null;
  private listeners: Map<EventKey, Set<EventCallback<any>>> = new Map();
  private presenceList: Map<string, AttendeePresence> = new Map();
  private supabaseChannel: any = null;
  private myPresence: AttendeePresence | null = null;
  private syncTimer: number | null = null;
  private isSubscribed: boolean = false;
  private outgoingQueue: Array<{ event: EventKey; payload: any }> = [];

  public static getInstance(roomId: string, sessionId?: string): RealtimeChannelManager {
    const key = (roomId || 'SKT-789').toUpperCase().trim();
    let instance = managersByRoom.get(key);
    if (!instance) {
      instance = new RealtimeChannelManager(key, sessionId);
      managersByRoom.set(key, instance);
    } else if (sessionId && instance.sessionId !== sessionId) {
      instance.setSessionId(sessionId);
    }
    return instance;
  }

  constructor(roomId: string, sessionId?: string) {
    this.roomId = (roomId || 'SKT-789').toUpperCase().trim();
    this.sessionId = sessionId || 'user_' + Math.random().toString(36).substring(2, 10);
    this.initLocalBroadcast();
    this.initSupabaseRealtime();
    this.startAdaptiveSyncLoop();
  }

  public setSessionId(sessionId: string) {
    this.sessionId = sessionId;
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
        presence: { key: this.sessionId },
      },
    });

    // 1. WebSocket Broadcast Listeners (Including realtime presence discovery ping/pong)
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
      'presence_ping',
      'presence_pong',
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

    // 3. Presence synchronization handlers
    const handlePresenceState = () => {
      if (!this.supabaseChannel) return;
      const state = this.supabaseChannel.presenceState();
      const nextMap = new Map<string, AttendeePresence>();
      
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
              nextMap.set(sid, presenceObj);
            }
          });
        }
      }

      if (this.myPresence) {
        nextMap.set(this.myPresence.session_id, this.myPresence);
      }

      this.presenceList = nextMap;
      this.emitPresenceSync();
    };

    this.supabaseChannel
      .on('presence', { event: 'sync' }, handlePresenceState)
      .on('presence', { event: 'join' }, handlePresenceState)
      .on('presence', { event: 'leave' }, handlePresenceState)
      .subscribe(async (status: string) => {
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
            try {
              await this.supabaseChannel.track(this.myPresence);
              this.broadcast('presence_ping', this.myPresence);
            } catch {
              // ignore
            }
          }
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          this.isSubscribed = false;
        }
      });
  }

  private emitPresenceSync() {
    const users = Array.from(this.presenceList.values());
    this.emitLocal('presence_sync', users);
  }

  // Adaptive sync loop for current room
  private startAdaptiveSyncLoop() {
    if (typeof window !== 'undefined') {
      const performSync = async (force: boolean = false) => {
        try {
          // Track presence heartbeat in Supabase and local channel
          if (this.myPresence) {
            this.trackPresence(this.myPresence);
          }

          // Only do database fallback poll if not subscribed to realtime WebSocket, or forced on window focus
          if (!this.isSubscribed || force) {
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

            const board = await dbFetchLeaderboard(this.roomId);
            if (board && board.length > 0) {
              this.emitLocal('leaderboard_update', board);
            }
          }
        } catch {
          // silent fallback
        }
      };

      const onVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          performSync(true);
        }
      };
      window.addEventListener('focus', () => performSync(true));
      document.addEventListener('visibilitychange', onVisibilityChange);

      this.syncTimer = window.setInterval(() => {
        if (document.visibilityState === 'visible') {
          performSync(false);
        }
      }, 5000);
    }
  }

  public on<K extends EventKey>(event: K, callback: EventCallback<K>) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Immediately dispatch existing presence state if registering for presence_sync
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
      this.presenceList.clear();
      list.forEach((p) => {
        if (p && p.session_id) this.presenceList.set(p.session_id, p);
      });
      if (this.myPresence) {
        this.presenceList.set(this.myPresence.session_id, this.myPresence);
      }
    } else if (event === 'presence_ping') {
      const senderPresence = payload as AttendeePresence;
      if (senderPresence && senderPresence.session_id) {
        this.presenceList.set(senderPresence.session_id, senderPresence);
        this.emitPresenceSync();
        // Reply with pong if sender is not our own session
        if (this.myPresence && senderPresence.session_id !== this.myPresence.session_id) {
          this.broadcast('presence_pong', this.myPresence);
        }
      }
    } else if (event === 'presence_pong') {
      const senderPresence = payload as AttendeePresence;
      if (senderPresence && senderPresence.session_id) {
        this.presenceList.set(senderPresence.session_id, senderPresence);
        this.emitPresenceSync();
      }
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
    this.emitPresenceSync();

    // Broadcast presence ping across local BroadcastChannel AND Supabase WebSocket Broadcast
    this.broadcast('presence_ping', presence);

    if (this.supabaseChannel && isSupabaseConfigured && this.isSubscribed) {
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
