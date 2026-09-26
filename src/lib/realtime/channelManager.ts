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
  dbFetchSurveys,
} from '../supabase';
import type {
  AttendeePresence,
  Question,
  LivePoll,
  QuizRoundState,
  LeaderboardEntry,
  Survey,
  SurveyResponse,
  AudienceReaction,
} from '../../types';
import type { QuestionCluster } from '../meshApi';

export type RealtimeEventMap = {
  quiz_round_state: QuizRoundState;
  quiz_vote: { optionId: string; userId: string; questionId?: string };
  leaderboard_update: LeaderboardEntry[];
  poll_update: LivePoll[];
  poll_vote: { pollId: string; optionId: string; voterSession: string };
  poll_vote_delta: { pollId: string; optionId: string; prevOptionId?: string | null; voterSession: string };
  poll_reset: { pollId: string };
  question_list: Question[];
  question_upvote: { questionId: string; upvotesCount: number; voterSession: string };
  room_admin_promoted: { roomId: string; targetSessionId: string; targetName: string; action: 'promote' | 'demote' };
  presence_sync: AttendeePresence[];
  presence_ping: AttendeePresence;
  presence_pong: AttendeePresence;
  presence_leave: { sessionId: string };
  safeguard_violation_alert: {
    roomId: string;
    attendeeSessionId: string;
    attendeeName: string;
    strikeCount: number;
    reason: string;
    category?: string;
    sampleText: string;
    timestamp: number;
  };
  attendee_moderation_action: {
    roomId: string;
    targetSessionId: string;
    targetName: string;
    action: 'mute' | 'unmute' | 'ban';
    issuedBy: string;
    timestamp: number;
  };
  safeguard_warning_issued: {
    roomId: string;
    targetSessionId: string;
    targetName: string;
    warningMessage: string;
    issuedBy: string;
    timestamp: number;
  };
  safeguard_strikes_reset: {
    roomId: string;
    targetSessionId: string;
    targetName: string;
    issuedBy: string;
    timestamp: number;
  };
  safeguard_strike_update: {
    roomId: string;
    sessionId: string;
    userName: string;
    strikeCount: number;
  };
  survey_list_update: Survey[];
  survey_response_submit: { surveyId: string; response: SurveyResponse };
  survey_launched_alert: { surveyId: string; surveyTitle: string; launchedBy: string; timestamp: number };
  audience_reaction: AudienceReaction;
  reaction_batch: { emoji: string; count: number; senderName?: string; timestamp: number };
  session_report_published: { reportMarkdown: string; generatedAt: number; publishedBy: string };
  qa_cluster_update: QuestionCluster[];
  room_audio_pack_update: { pack: 'arcade' | 'hifi'; updatedBy: string };
  quiz_completed: { roomId: string; completedAt: number };
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
      'poll_vote_delta',
      'poll_reset',
      'question_list',
      'question_upvote',
      'room_admin_promoted',
      'presence_ping',
      'presence_pong',
      'presence_leave',
      'safeguard_violation_alert',
      'attendee_moderation_action',
      'safeguard_warning_issued',
      'safeguard_strikes_reset',
      'safeguard_strike_update',
      'survey_list_update',
      'survey_response_submit',
      'survey_launched_alert',
      'audience_reaction',
      'reaction_batch',
      'session_report_published',
      'qa_cluster_update',
      'room_audio_pack_update',
      'quiz_completed',
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

    // 2. PostgreSQL CDC Table Change Listeners (High-Performance Debounced Sync)
    // NOTE: High-churn tables ('room_attendees' and 'leaderboard') are intentionally omitted
    // from CDC listeners to eliminate catastrophic O(N^2) thundering herd query storms for 100-200+ users.
    // Presence is 100% managed via Elixir Phoenix in-memory channel presence (0 DB queries).
    this.supabaseChannel
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quiz_rounds' },
        (payload: any) => {
          const targetKey = this.roomId.toUpperCase().trim();
          const newRoomId = (payload.new?.room_id || '').toUpperCase().trim();
          const isMatch =
            payload.new &&
            (newRoomId === targetKey ||
              newRoomId === `ROOM-${targetKey}` ||
              targetKey === `ROOM-${newRoomId}` ||
              newRoomId.replace(/^ROOM-/, '') === targetKey.replace(/^ROOM-/, ''));

          if (isMatch) {
            const round = payload.new;
            const state: QuizRoundState = {
              isActive: round.is_active,
              question: round.question_data,
              endTime: round.end_time ? Number(round.end_time) : null,
              totalSeconds: round.question_data?.timeLimitSeconds || 25,
              isRevealed: round.is_revealed,
              userSelectedOption: null,
              isCorrect: null,
              votesDistribution: round.votes_distribution || { A: 0, B: 0, C: 0, D: 0 },
              autoAdvanceAt: round.auto_advance_at ? Number(round.auto_advance_at) : null,
              isAutoAdvancePaused: Boolean(round.is_auto_advance_paused),
              autoAdvanceRemaining: round.auto_advance_at ? Math.max(0, Math.ceil((Number(round.auto_advance_at) - Date.now()) / 1000)) : 5,
              isAdaptiveCampaign: round.quiz_type === 'adaptive',
              adaptiveProgress: round.adaptive_meta?.progress || undefined,
              updatedAt: round.created_at ? new Date(round.created_at).getTime() : Date.now(),
            };
            this.emitLocal('quiz_round_state', state);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'polls' },
        (payload: any) => {
          if (
            (payload.new && (payload.new.room_id === this.roomId || payload.new.room_id === `room-${this.roomId}`)) ||
            (payload.old && (payload.old.room_id === this.roomId || payload.old.room_id === `room-${this.roomId}`))
          ) {
            this.debouncedSyncPolls();
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'questions' },
        (payload: any) => {
          if (
            (payload.new && (payload.new.room_id === this.roomId || payload.new.room_id === `room-${this.roomId}`)) ||
            (payload.old && (payload.old.room_id === this.roomId || payload.old.room_id === `room-${this.roomId}`))
          ) {
            this.debouncedSyncQuestions();
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'surveys' },
        (payload: any) => {
          if (
            (payload.new && (payload.new.room_id === this.roomId || payload.new.room_id === `room-${this.roomId}`)) ||
            (payload.old && (payload.old.room_id === this.roomId || payload.old.room_id === `room-${this.roomId}`))
          ) {
            this.debouncedSyncSurveys();
          }
        }
      );

    // 3. Supabase In-Memory Presence Handlers (Pure Elixir Memory CRDT - 0 DB queries)
    const handlePresenceState = () => {
      if (!this.supabaseChannel) return;
      const state = this.supabaseChannel.presenceState();
      
      const nextPresenceMap = new Map<string, AttendeePresence>();
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
              nextPresenceMap.set(sid, presenceObj);
            }
          });
        }
      }

      if (this.myPresence) {
        nextPresenceMap.set(this.myPresence.session_id, this.myPresence);
      }

      this.presenceList = nextPresenceMap;
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

          // Track presence in-memory immediately upon subscription
          if (this.myPresence) {
            try {
              await this.supabaseChannel.track(this.myPresence);
            } catch {
              // ignore
            }
          }

          // Initial DB state hydration with slight randomized delay to avoid scan stampede
          setTimeout(() => {
            this.syncAllFromDatabase();
          }, Math.floor(Math.random() * 600));
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

  // --- LAYER 2: Presence Heartbeat & Event-Driven Sync Engine ---
  private syncDebounceMap: Map<string, number> = new Map();
  private presenceSyncTimer: number | null = null;

  public debouncedSyncPolls() {
    this.scheduleDebouncedFetch('polls', () => this.syncPollsFromDatabase(), 600);
  }

  public debouncedSyncQuestions() {
    this.scheduleDebouncedFetch('questions', () => this.syncQuestionsFromDatabase(), 600);
  }

  public debouncedSyncSurveys() {
    this.scheduleDebouncedFetch('surveys', () => this.syncSurveysFromDatabase(), 800);
  }

  private scheduleDebouncedFetch(key: string, fetchFn: () => Promise<void>, delayMs: number) {
    if (typeof window === 'undefined') return;
    const existing = this.syncDebounceMap.get(key);
    if (existing) {
      window.clearTimeout(existing);
    }
    const timer = window.setTimeout(async () => {
      this.syncDebounceMap.delete(key);
      try {
        await fetchFn();
      } catch {
        // ignore
      }
    }, delayMs);
    this.syncDebounceMap.set(key, timer);
  }

  private startAdaptivePulseEngine() {
    if (typeof window !== 'undefined') {
      const presenceHeartbeat = () => {
        try {
          this.ensureConnected();

          // In-memory WebSocket track (Pure Phoenix channel - Zero DB queries)
          if (this.myPresence && this.supabaseChannel && this.isSubscribed) {
            this.supabaseChannel.track(this.myPresence).catch(() => {});
          }
        } catch {
          // silent catch
        }
      };

      // Initial state sync with slight randomized stagger to prevent QR scan stampedes
      const initialDelay = Math.floor(Math.random() * 400);
      window.setTimeout(() => {
        this.syncAllFromDatabase();
      }, initialDelay);
      presenceHeartbeat();

      // Lightweight WebSocket presence refresh every 30 seconds (zero DB load)
      this.pulseTimer = window.setInterval(presenceHeartbeat, 30000);

      // Periodic slow drift reconciliation (75s with ±10s randomized jitter to avoid synchronized thundering herds)
      const jitter = Math.floor((Math.random() - 0.5) * 20000);
      const driftTimer = window.setInterval(() => {
        if (!this.isSubscribed || document.visibilityState === 'visible') {
          this.syncAllFromDatabase();
        }
      }, 75000 + jitter);

      // Sync immediately when window gets focus or tab becomes visible
      const onFocusOrVisible = () => {
        if (document.visibilityState === 'visible') {
          this.ensureConnected();
          presenceHeartbeat();
          this.syncAllFromDatabase();
        }
      };
      window.addEventListener('focus', onFocusOrVisible);
      document.addEventListener('visibilitychange', onFocusOrVisible);

      // Cleanup presence on tab close / reload
      window.addEventListener('beforeunload', () => {
        window.clearInterval(driftTimer);
        this.leaveRoom();
      });
    }
  }

  public leaveRoom() {
    if (this.myPresence) {
      dbRemoveAttendeePresence(this.myPresence.session_id);
      this.broadcast('presence_leave', { sessionId: this.myPresence.session_id });
      this.presenceList.delete(this.myPresence.session_id);
      this.emitPresenceSync();
    }
    if (this.pulseTimer) {
      window.clearInterval(this.pulseTimer);
      this.pulseTimer = null;
    }
    if (this.presenceSyncTimer) {
      window.clearTimeout(this.presenceSyncTimer);
      this.presenceSyncTimer = null;
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
      this.syncSurveysFromDatabase(),
    ]);
  }

  public async syncSurveysFromDatabase() {
    try {
      const surveys = await dbFetchSurveys(this.roomId);
      if (surveys && surveys.length > 0) {
        this.emitLocal('survey_list_update', surveys);
      }
    } catch {
      // silent fallback
    }
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
    if (this.presenceSyncTimer) return;
    if (typeof window !== 'undefined') {
      this.presenceSyncTimer = window.setTimeout(() => {
        this.presenceSyncTimer = null;
        const users = Array.from(this.presenceList.values());
        this.emitLocal('presence_sync', users);
      }, 80);
    } else {
      const users = Array.from(this.presenceList.values());
      this.emitLocal('presence_sync', users);
    }
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

    // 1. Initial single DB registration on join (fire-and-forget)
    dbUpsertAttendeePresence(this.roomId, presence.session_id, presence.name, presence.role);

    // 2. Pure Elixir Phoenix in-memory channel presence (zero DB writes)
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
