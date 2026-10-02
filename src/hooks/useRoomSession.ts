import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { Room, AttendeePresence, ActiveTabType } from '../types';
import { RealtimeChannelManager } from '../lib/realtime/channelManager';
import { onAuthChange, getCurrentUser, signOutUser, dbFetchRooms, dbUpdateRoomAdmins, isEmailVerified, isUserRoomAdmin, dbEnsureRoomExists, isRoomCreatedByMe, dbCheckRoomExists } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import { playPopSound } from '../lib/soundFx';

const SESSION_KEY = 'sketchcast_session_id';
const NAME_KEY = 'sketchcast_user_name';
const ROLE_KEY = 'sketchcast_user_role';
const AUTH_FLAG_KEY = 'sketchcast_authenticated_session';
const AUTH_EXPIRY_KEY = 'sketchcast_auth_expiry';
const ACTIVE_TAB_KEY = 'sketchcast_active_tab';
const ROOM_CODE_KEY = 'sketchcast_room_code';
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

export function isSessionAutoAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  const expiry = localStorage.getItem(AUTH_EXPIRY_KEY);
  const authFlag = localStorage.getItem(AUTH_FLAG_KEY) || sessionStorage.getItem(AUTH_FLAG_KEY);
  if (authFlag === 'true') {
    if (expiry) {
      const expiryTime = parseInt(expiry, 10);
      if (!isNaN(expiryTime) && Date.now() < expiryTime) {
        return true;
      }
    } else {
      // Auto-upgrade legacy auth session to 14 days
      localStorage.setItem(AUTH_EXPIRY_KEY, (Date.now() + FOURTEEN_DAYS_MS).toString());
      return true;
    }
  }
  return false;
}

export function refreshAuthExpiry(): void {
  if (typeof window !== 'undefined') {
    const newExpiry = (Date.now() + FOURTEEN_DAYS_MS).toString();
    localStorage.setItem(AUTH_EXPIRY_KEY, newExpiry);
    localStorage.setItem(AUTH_FLAG_KEY, 'true');
    sessionStorage.setItem(AUTH_FLAG_KEY, 'true');
  }
}

export function getOrCreateSessionId(): string {
  if (typeof window !== 'undefined') {
    let id = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = 'user_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
      localStorage.setItem(SESSION_KEY, id);
      sessionStorage.setItem(SESSION_KEY, id);
    } else {
      localStorage.setItem(SESSION_KEY, id);
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  }
  return 'user_' + Math.random().toString(36).substring(2, 10);
}

export function getStoredUserName(): string {
  if (typeof window !== 'undefined') {
    const sessionName = sessionStorage.getItem(NAME_KEY);
    if (sessionName && sessionName.trim()) return sessionName;
    const localName = localStorage.getItem(NAME_KEY);
    if (localName && localName.trim()) return localName;
  }
  return 'TechAttendee ' + Math.floor(100 + Math.random() * 900);
}

export function getStoredUserRole(): 'host' | 'attendee' {
  if (typeof window !== 'undefined') {
    const sessionRole = sessionStorage.getItem(ROLE_KEY);
    if (sessionRole === 'host' || sessionRole === 'attendee') return sessionRole;
    const localRole = localStorage.getItem(ROLE_KEY);
    if (localRole === 'host' || localRole === 'attendee') return localRole;
  }
  return 'attendee';
}

export function getStoredRoomCode(fallback: string = 'SKT-789'): string {
  if (typeof window !== 'undefined') {
    let cachedRooms: { code: string }[] = [];
    try {
      const storedLocal = localStorage.getItem('sketchcast_local_rooms');
      if (storedLocal) cachedRooms = JSON.parse(storedLocal);
    } catch {
      // ignore
    }

    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam && roomParam.trim()) {
      const code = roomParam.trim().toUpperCase();
      return code;
    }
    const sessionStored = sessionStorage.getItem(ROOM_CODE_KEY);
    if (sessionStored && sessionStored.trim()) {
      const sCode = sessionStored.trim().toUpperCase();
      if (cachedRooms.length === 0 || cachedRooms.some((r) => (r.code || '').toUpperCase() === sCode) || isRoomCreatedByMe(sCode)) {
        return sCode;
      }
    }
    const localStored = localStorage.getItem(ROOM_CODE_KEY);
    if (localStored && localStored.trim()) {
      const lCode = localStored.trim().toUpperCase();
      if (cachedRooms.length === 0 || cachedRooms.some((r) => (r.code || '').toUpperCase() === lCode) || isRoomCreatedByMe(lCode)) {
        return lCode;
      }
    }
  }
  return fallback;
}

export function getInitialActiveTab(): ActiveTabType {
  if (typeof window !== 'undefined') {
    const hash = window.location.hash.replace('#', '') as ActiveTabType;
    if (['quiz', 'polls', 'qa', 'leaderboard', 'rooms'].includes(hash)) {
      return hash;
    }
    const stored = (sessionStorage.getItem(ACTIVE_TAB_KEY) || localStorage.getItem(ACTIVE_TAB_KEY)) as ActiveTabType;
    if (['quiz', 'polls', 'qa', 'leaderboard', 'rooms'].includes(stored)) {
      return stored;
    }
  }
  return 'quiz';
}

export function useRoomSession(initialRoomCode: string = 'SKT-789') {
  const [sessionId] = useState<string>(getOrCreateSessionId);
  const [userName, setUserNameState] = useState<string>(getStoredUserName);
  const [userRole, setUserRoleState] = useState<'host' | 'attendee'>(getStoredUserRole);
  const [activeRoomCode, setActiveRoomCodeState] = useState<string>(() => getStoredRoomCode(initialRoomCode));
  const activeRoomCodeRef = useRef<string>(activeRoomCode);

  const setActiveRoomCode = useCallback((newCode: string) => {
    const clean = newCode.toUpperCase().trim();
    activeRoomCodeRef.current = clean;
    setActiveRoomCodeState(clean);
  }, []);

  useEffect(() => {
    activeRoomCodeRef.current = activeRoomCode;
  }, [activeRoomCode]);
  
  const [room, setRoom] = useState<Room>(() => {
    const code = getStoredRoomCode(initialRoomCode);
    let cachedRooms: Room[] = [];
    try {
      const storedLocal = localStorage.getItem('sketchcast_local_rooms');
      if (storedLocal) cachedRooms = JSON.parse(storedLocal);
    } catch {
      // ignore
    }
    const matched = cachedRooms.find((r) => r.code?.toUpperCase() === code.toUpperCase());
    if (matched) return matched;

    const storedName = getStoredUserName();
    const isHost = getStoredUserRole() === 'host' || isRoomCreatedByMe(code);
    return {
      id: `room-${code}`,
      code,
      title: `NextGen Arena // ${code}`,
      host_id: isHost ? 'host-me' : 'host-external',
      host_name: isHost && storedName ? storedName : '',
      created_at: new Date().toISOString(),
    };
  });

  const [activeTab, setActiveTabState] = useState<ActiveTabType>(getInitialActiveTab);
  const [attendees, setAttendees] = useState<AttendeePresence[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const channelManager = useMemo(() => {
    return RealtimeChannelManager.getInstance(activeRoomCode, sessionId);
  }, [activeRoomCode, sessionId]);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(isSessionAutoAuthenticated);

  // Moderation state: Muted and Banned session tracking per room
  const [mutedSessionIds, setMutedSessionIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(`sketchcast_muted_${getStoredRoomCode(initialRoomCode)}`);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [bannedSessionIds, setBannedSessionIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(`sketchcast_banned_${getStoredRoomCode(initialRoomCode)}`);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isBanned, setIsBanned] = useState<boolean>(false);
  const [banNotice, setBanNotice] = useState<string | null>(null);

  // Live Strike & Warning State
  const strikeStorageKey = `sketchcast_strikes_${activeRoomCode.toUpperCase()}_${sessionId}`;
  const [myStrikes, setMyStrikes] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(strikeStorageKey);
      return stored ? parseInt(stored, 10) || 0 : 0;
    } catch {
      return 0;
    }
  });

  const [prevStrikeKey, setPrevStrikeKey] = useState(strikeStorageKey);
  if (prevStrikeKey !== strikeStorageKey) {
    setPrevStrikeKey(strikeStorageKey);
    try {
      const stored = localStorage.getItem(strikeStorageKey);
      setMyStrikes(stored ? parseInt(stored, 10) || 0 : 0);
    } catch {
      setMyStrikes(0);
    }
  }

  const [strikesBySession, setStrikesBySession] = useState<Record<string, number>>({});
  const [officialWarning, setOfficialWarning] = useState<{
    message: string;
    issuedBy: string;
    timestamp: number;
  } | null>(null);

  // Sync activeTab with URL Hash & Storage
  const setActiveTab = useCallback((tab: ActiveTabType) => {
    setActiveTabState(tab);
    try {
      sessionStorage.setItem(ACTIVE_TAB_KEY, tab);
      localStorage.setItem(ACTIVE_TAB_KEY, tab);
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.hash = tab;
        const currentCode = activeRoomCodeRef.current;
        if (currentCode && (isAuthenticated || url.searchParams.has('room'))) {
          url.searchParams.set('room', currentCode);
        }
        window.history.replaceState(null, '', url.toString());
      }
    } catch {
      // ignore
    }
  }, [isAuthenticated]);

  // Listen to hash change for browser back/forward navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as ActiveTabType;
      if (['quiz', 'polls', 'qa', 'leaderboard', 'rooms'].includes(hash)) {
        setActiveTabState(hash);
        sessionStorage.setItem(ACTIVE_TAB_KEY, hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Supabase Auth Listener (Auto-auth on active Supabase session with 14-day persistent window)
  useEffect(() => {
    getCurrentUser().then((user) => {
      if (user && isEmailVerified(user)) {
        setCurrentUser(user);
        setIsAuthenticated(true);
        refreshAuthExpiry();
        const name = user.user_metadata?.display_name || user.email?.split('@')[0];
        if (name) {
          setUserNameState(name);
          sessionStorage.setItem(NAME_KEY, name);
          localStorage.setItem(NAME_KEY, name);
        }
      } else {
        if (user && !isEmailVerified(user)) {
          signOutUser();
          setIsAuthenticated(false);
          sessionStorage.removeItem(AUTH_FLAG_KEY);
          localStorage.removeItem(AUTH_FLAG_KEY);
          localStorage.removeItem(AUTH_EXPIRY_KEY);
        } else {
          // If user is null (guest entry or token refreshing), check if 14-day persistent window is active
          if (isSessionAutoAuthenticated()) {
            setIsAuthenticated(true);
            refreshAuthExpiry();
          }
        }
      }
    });

    const unsubscribe = onAuthChange((user) => {
      if (user && isEmailVerified(user)) {
        setCurrentUser(user);
        setIsAuthenticated(true);
        refreshAuthExpiry();
        const name = user.user_metadata?.display_name || user.email?.split('@')[0];
        if (name) {
          sessionStorage.setItem(NAME_KEY, name);
          localStorage.setItem(NAME_KEY, name);
          setUserNameState(name);
        }
      } else if (!user) {
        // Only de-authenticate if 14-day window is expired
        if (!isSessionAutoAuthenticated()) {
          setCurrentUser(null);
          setIsAuthenticated(false);
          sessionStorage.removeItem(AUTH_FLAG_KEY);
          localStorage.removeItem(AUTH_FLAG_KEY);
          localStorage.removeItem(AUTH_EXPIRY_KEY);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const [promotionToast, setPromotionToast] = useState<string | null>(null);

  // Check if current user is pre-authorized as owner or co-admin for the active room,
  // and validate that the active room exists in the authoritative database
  useEffect(() => {
    let isCancelled = false;

    dbFetchRooms().then((rooms) => {
      if (isCancelled) return;

      let current = rooms.find((r) => r.code.toUpperCase() === activeRoomCode.toUpperCase());

      // If requested active room does NOT exist in database and authoritative rooms exist,
      // and the user is authenticated, fall back to a valid room
      if (!current && rooms.length > 0 && isAuthenticated) {
        // Fall back to a valid room: prioritize user's owned/co-administered room, else latest room
        const myOwned = rooms.find((r) => isUserRoomAdmin(r, currentUser, userName));
        const fallbackRoom = myOwned || rooms[0];

        if (fallbackRoom) {
          current = fallbackRoom;
          const targetCode = fallbackRoom.code.toUpperCase();
          setActiveRoomCode(targetCode);
          sessionStorage.setItem(ROOM_CODE_KEY, targetCode);
          localStorage.setItem(ROOM_CODE_KEY, targetCode);

          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            if (url.searchParams.has('room')) {
              url.searchParams.set('room', targetCode);
              window.history.replaceState(null, '', url.toString());
            }
          }
        }
      }

      if (current) {
        setRoom(current);
        const isAdmin = isUserRoomAdmin(current, currentUser, userName);
        if (isAdmin) {
          setUserRoleState('host');
          sessionStorage.setItem(ROLE_KEY, 'host');
          localStorage.setItem(ROLE_KEY, 'host');
        } else {
          // Strictly force attendee role if not authorized in this room
          setUserRoleState('attendee');
          sessionStorage.setItem(ROLE_KEY, 'attendee');
          localStorage.setItem(ROLE_KEY, 'attendee');
        }
      } else {
        // Room not in DB yet - preserve host status if created on this browser
        if (isRoomCreatedByMe(activeRoomCode)) {
          setUserRoleState('host');
          sessionStorage.setItem(ROLE_KEY, 'host');
          localStorage.setItem(ROLE_KEY, 'host');
        }
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [activeRoomCode, userName, currentUser, setActiveRoomCode, isAuthenticated]);

  const userNameRef = useRef(userName);
  useEffect(() => {
    userNameRef.current = userName;
  }, [userName]);

  // Realtime Channel & Presence setup (Only re-instantiate when room changes)
  useEffect(() => {
    const manager = channelManager;

    const unPresence = manager.on('presence_sync', (presenceList) => {
      setAttendees(presenceList);
    });

    const unAdminPromote = manager.on('room_admin_promoted', (event) => {
      if (event.roomId.toUpperCase().trim() === activeRoomCode.toUpperCase().trim()) {
        const targetClean = event.targetName.trim().toLowerCase();

        // Update room.admins for ALL connected clients
        setRoom((prev) => {
          const currentAdmins = prev.admins || [];
          let updatedAdmins: string[];
          if (event.action === 'promote') {
            updatedAdmins = currentAdmins.some((a) => a.toLowerCase() === targetClean)
              ? currentAdmins
              : [...currentAdmins, event.targetName];
          } else {
            updatedAdmins = currentAdmins.filter((a) => a.toLowerCase() !== targetClean);
          }
          return { ...prev, admins: updatedAdmins };
        });

        // Update role in local presence list
        setAttendees((prev) =>
          prev.map((a) => {
            if (
              a.session_id === event.targetSessionId ||
              a.name.trim().toLowerCase() === targetClean
            ) {
              return { ...a, role: event.action === 'promote' ? 'host' : 'attendee' };
            }
            return a;
          })
        );

        const currentName = userNameRef.current;
        const isTarget = event.targetSessionId === sessionId || event.targetName.toLowerCase() === currentName.toLowerCase();
        if (isTarget) {
          if (event.action === 'promote') {
            setUserRoleState('host');
            sessionStorage.setItem(ROLE_KEY, 'host');
            localStorage.setItem(ROLE_KEY, 'host');
            setPromotionToast(`🎉 You have been promoted to Room Admin! Host controls unlocked.`);
          } else if (event.action === 'demote') {
            setUserRoleState('attendee');
            sessionStorage.setItem(ROLE_KEY, 'attendee');
            localStorage.setItem(ROLE_KEY, 'attendee');
            setPromotionToast(`Your admin permissions for this room were updated.`);
          }
        }
      }
    });

    const unModeration = manager.on('attendee_moderation_action', (event) => {
      if (event.roomId.toUpperCase().trim() === activeRoomCode.toUpperCase().trim()) {
        const currentName = userNameRef.current;
        const isTarget =
          event.targetSessionId === sessionId ||
          event.targetName.toLowerCase() === currentName.toLowerCase();

        if (event.action === 'mute') {
          setMutedSessionIds((prev) => {
            const next = new Set(prev);
            if (event.targetSessionId) next.add(event.targetSessionId);
            if (event.targetName) next.add(event.targetName.trim().toLowerCase());
            try {
              localStorage.setItem(`sketchcast_muted_${activeRoomCode}`, JSON.stringify(Array.from(next)));
            } catch {
              // ignore
            }
            return next;
          });
          if (isTarget) {
            setIsMuted(true);
            setPromotionToast('⚠️ You have been muted by the host for repeated guideline violations.');
          }
        } else if (event.action === 'unmute') {
          setMutedSessionIds((prev) => {
            const next = new Set(prev);
            if (event.targetSessionId) next.delete(event.targetSessionId);
            if (event.targetName) next.delete(event.targetName.trim().toLowerCase());
            try {
              localStorage.setItem(`sketchcast_muted_${activeRoomCode}`, JSON.stringify(Array.from(next)));
            } catch {
              // ignore
            }
            return next;
          });
          if (isTarget) {
            setIsMuted(false);
            setPromotionToast('🎉 The host has restored your Q&A permissions.');
          }
        } else if (event.action === 'ban') {
          setBannedSessionIds((prev) => {
            const next = new Set(prev);
            if (event.targetSessionId) next.add(event.targetSessionId);
            if (event.targetName) next.add(event.targetName.trim().toLowerCase());
            try {
              localStorage.setItem(`sketchcast_banned_${activeRoomCode}`, JSON.stringify(Array.from(next)));
            } catch {
              // ignore
            }
            return next;
          });
          setAttendees((prev) => prev.filter((a) => a.session_id !== event.targetSessionId && a.name.toLowerCase() !== event.targetName.toLowerCase()));
          if (isTarget) {
            setIsBanned(true);
            setBanNotice(`You have been banned from Room ${activeRoomCode} by the host for repeated policy violations.`);
            manager.leaveRoom();
          }
        }
      }
    });

    const unStrikeUpdate = manager.on('safeguard_strike_update', (ev) => {
      if (ev.roomId.toUpperCase().trim() === activeRoomCode.toUpperCase().trim()) {
        setStrikesBySession((prev) => ({
          ...prev,
          [ev.sessionId]: ev.strikeCount,
        }));
      }
    });

    const unStrikesReset = manager.on('safeguard_strikes_reset', (ev) => {
      if (ev.roomId.toUpperCase().trim() === activeRoomCode.toUpperCase().trim()) {
        setStrikesBySession((prev) => ({
          ...prev,
          [ev.targetSessionId]: 0,
        }));
        const isTarget =
          ev.targetSessionId === sessionId ||
          ev.targetName.toLowerCase() === userNameRef.current.toLowerCase();
        if (isTarget) {
          setMyStrikes(0);
          try {
            localStorage.setItem(strikeStorageKey, '0');
          } catch {
            // ignore
          }
          setPromotionToast('✨ Your safeguard strikes have been forgiven and reset by the host.');
        }
      }
    });

    const unWarningIssued = manager.on('safeguard_warning_issued', (ev) => {
      if (ev.roomId.toUpperCase().trim() === activeRoomCode.toUpperCase().trim()) {
        const isTarget =
          ev.targetSessionId === sessionId ||
          ev.targetName.toLowerCase() === userNameRef.current.toLowerCase();
        if (isTarget) {
          setOfficialWarning({
            message: ev.warningMessage,
            issuedBy: ev.issuedBy,
            timestamp: ev.timestamp,
          });
          playPopSound();
        }
      }
    });

    return () => {
      unPresence();
      unAdminPromote();
      unModeration();
      unStrikeUpdate();
      unStrikesReset();
      unWarningIssued();
    };
  }, [channelManager, activeRoomCode, sessionId, strikeStorageKey]);

  // Keep presence updated whenever name or role changes
  useEffect(() => {
    if (channelManager) {
      const myPresence: AttendeePresence = {
        session_id: sessionId,
        name: userName,
        role: userRole,
        joined_at: Date.now(),
        last_active: Date.now(),
      };
      channelManager.trackPresence(myPresence);
    }
  }, [channelManager, sessionId, userName, userRole]);

  const setUserName = (name: string) => {
    sessionStorage.setItem(NAME_KEY, name);
    localStorage.setItem(NAME_KEY, name);
    setUserNameState(name);
  };

  const setUserRole = (role: 'host' | 'attendee') => {
    sessionStorage.setItem(ROLE_KEY, role);
    localStorage.setItem(ROLE_KEY, role);
    setUserRoleState(role);
  };

  const promoteToAdmin = async (targetSessionId: string, targetName: string) => {
    const cleanTarget = targetName.trim().toLowerCase();

    // 1. Immediately update local state
    setRoom((prev) => {
      const currentAdmins = prev.admins || [];
      if (currentAdmins.some((a) => a.toLowerCase() === cleanTarget)) return prev;
      return { ...prev, admins: [...currentAdmins, targetName] };
    });
    setAttendees((prev) =>
      prev.map((a) => (a.name.trim().toLowerCase() === cleanTarget ? { ...a, role: 'host' } : a))
    );

    // 2. Broadcast to all clients
    if (channelManager) {
      channelManager.broadcast('room_admin_promoted', {
        roomId: activeRoomCode,
        targetSessionId,
        targetName,
        action: 'promote',
      });
    }

    // 3. Persist to DB / storage
    const rooms = await dbFetchRooms();
    const current = rooms.find((r) => r.code.toUpperCase() === activeRoomCode.toUpperCase());
    const existingAdmins = current?.admins || [];
    if (!existingAdmins.some((a) => a.toLowerCase() === cleanTarget)) {
      const updatedAdmins = [...existingAdmins, targetName];
      await dbUpdateRoomAdmins(activeRoomCode, updatedAdmins);
    }
  };

  const demoteFromAdmin = async (targetSessionId: string, targetName: string) => {
    const cleanTarget = targetName.trim().toLowerCase();

    // 1. Immediately update local state
    setRoom((prev) => {
      const currentAdmins = prev.admins || [];
      return { ...prev, admins: currentAdmins.filter((a) => a.toLowerCase() !== cleanTarget) };
    });
    setAttendees((prev) =>
      prev.map((a) => (a.name.trim().toLowerCase() === cleanTarget ? { ...a, role: 'attendee' } : a))
    );

    // 2. Broadcast to all clients
    if (channelManager) {
      channelManager.broadcast('room_admin_promoted', {
        roomId: activeRoomCode,
        targetSessionId,
        targetName,
        action: 'demote',
      });
    }

    // 3. Persist to DB / storage
    const rooms = await dbFetchRooms();
    const current = rooms.find((r) => r.code.toUpperCase() === activeRoomCode.toUpperCase());
    const existingAdmins = current?.admins || [];
    const updatedAdmins = existingAdmins.filter((a) => a.toLowerCase() !== cleanTarget);
    await dbUpdateRoomAdmins(activeRoomCode, updatedAdmins);
  };

  const muteAttendee = (targetSessionId: string, targetName: string) => {
    if (channelManager) {
      channelManager.broadcast('attendee_moderation_action', {
        roomId: activeRoomCode,
        targetSessionId,
        targetName,
        action: 'mute',
        issuedBy: userName,
        timestamp: Date.now(),
      });
    }
    setMutedSessionIds((prev) => {
      const next = new Set(prev);
      if (targetSessionId) next.add(targetSessionId);
      if (targetName) next.add(targetName.trim().toLowerCase());
      try {
        localStorage.setItem(`sketchcast_muted_${activeRoomCode}`, JSON.stringify(Array.from(next)));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const unmuteAttendee = (targetSessionId: string, targetName: string) => {
    if (channelManager) {
      channelManager.broadcast('attendee_moderation_action', {
        roomId: activeRoomCode,
        targetSessionId,
        targetName,
        action: 'unmute',
        issuedBy: userName,
        timestamp: Date.now(),
      });
    }
    setMutedSessionIds((prev) => {
      const next = new Set(prev);
      if (targetSessionId) next.delete(targetSessionId);
      if (targetName) next.delete(targetName.trim().toLowerCase());
      try {
        localStorage.setItem(`sketchcast_muted_${activeRoomCode}`, JSON.stringify(Array.from(next)));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const banAttendee = (targetSessionId: string, targetName: string) => {
    if (channelManager) {
      channelManager.broadcast('attendee_moderation_action', {
        roomId: activeRoomCode,
        targetSessionId,
        targetName,
        action: 'ban',
        issuedBy: userName,
        timestamp: Date.now(),
      });
    }
    setBannedSessionIds((prev) => {
      const next = new Set(prev);
      if (targetSessionId) next.add(targetSessionId);
      if (targetName) next.add(targetName.trim().toLowerCase());
      try {
        localStorage.setItem(`sketchcast_banned_${activeRoomCode}`, JSON.stringify(Array.from(next)));
      } catch {
        // ignore
      }
      return next;
    });
    setAttendees((prev) => prev.filter((a) => a.session_id !== targetSessionId && a.name.toLowerCase() !== targetName.toLowerCase()));
  };

  const sendAttendeeWarning = (targetSessionId: string, targetName: string, message?: string) => {
    const warningMessage =
      message ||
      '⚠️ Official Host Warning: You have reached multiple safeguard strikes for inappropriate questions. Further violations will result in being muted or banned.';
    if (channelManager) {
      channelManager.broadcast('safeguard_warning_issued', {
        roomId: activeRoomCode,
        targetSessionId,
        targetName,
        warningMessage,
        issuedBy: userName,
        timestamp: Date.now(),
      });
    }
  };

  const resetAttendeeStrikes = (targetSessionId: string, targetName: string) => {
    if (channelManager) {
      channelManager.broadcast('safeguard_strikes_reset', {
        roomId: activeRoomCode,
        targetSessionId,
        targetName,
        issuedBy: userName,
        timestamp: Date.now(),
      });
      channelManager.broadcast('safeguard_strike_update', {
        roomId: activeRoomCode,
        sessionId: targetSessionId,
        userName: targetName,
        strikeCount: 0,
      });
    }
    setStrikesBySession((prev) => ({
      ...prev,
      [targetSessionId]: 0,
    }));
  };

  const recordMyStrike = (count: number) => {
    setMyStrikes(count);
    if (channelManager) {
      channelManager.broadcast('safeguard_strike_update', {
        roomId: activeRoomCode,
        sessionId,
        userName,
        strikeCount: count,
      });
    }
  };

  const handleAuthenticated = async (
    name: string,
    requestedRole: 'host' | 'attendee',
    customRoomCode?: string,
    customRoomTitle?: string
  ) => {
    const targetRoomCode = (customRoomCode || activeRoomCode || 'SKT-789').toUpperCase().trim();
    
    // 1. Immediately synchronously set canonical room code, user state, and storage
    setUserName(name);
    setUserRole(requestedRole);
    setActiveRoomCode(targetRoomCode);
    sessionStorage.setItem(ROOM_CODE_KEY, targetRoomCode);
    localStorage.setItem(ROOM_CODE_KEY, targetRoomCode);

    // 2. Immediately replace any stale room parameter in the URL with canonical room key
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('room', targetRoomCode);
      window.history.replaceState(null, '', url.toString());
    }

    // 3. Immediately set room state to canonical target room to prevent any stale room flicker
    setRoom((prev) => ({
      ...prev,
      id: `room-${targetRoomCode}`,
      code: targetRoomCode,
      title: customRoomTitle || (prev.code === targetRoomCode ? prev.title : `NextGen Arena // ${targetRoomCode}`),
      host_id: requestedRole === 'host' ? 'host-me' : 'host-external',
      host_name: requestedRole === 'host' ? name : prev.host_name,
    }));

    // 4. Fetch rooms from authoritative database to reconcile exact permissions and existing metadata
    const allRooms = await dbFetchRooms();
    let currentRoom = allRooms.find((r) => r.code.toUpperCase() === targetRoomCode);
    let effectiveRole: 'host' | 'attendee' = requestedRole;

    if (currentRoom) {
      const isAuthorized = isUserRoomAdmin(currentRoom, currentUser, name);
      effectiveRole = isAuthorized ? 'host' : (requestedRole === 'host' && isRoomCreatedByMe(targetRoomCode) ? 'host' : 'attendee');
      if (customRoomTitle && currentRoom.title !== customRoomTitle) {
        currentRoom = { ...currentRoom, title: customRoomTitle };
      }
      setRoom(currentRoom);
    } else {
      if (requestedRole === 'host' || isRoomCreatedByMe(targetRoomCode)) {
        currentRoom = await dbEnsureRoomExists(targetRoomCode, currentUser, name);
        if (customRoomTitle) {
          currentRoom = { ...currentRoom, title: customRoomTitle };
        }
        effectiveRole = 'host';
        setRoom(currentRoom);
      } else {
        const { exists, room: foundRoom } = await dbCheckRoomExists(targetRoomCode);
        if (!exists || !foundRoom) {
          throw new Error(`Room "${targetRoomCode}" does not exist. Please check the room key and try again.`);
        }
        effectiveRole = 'attendee';
        setRoom(foundRoom);
      }
    }

    setUserRole(effectiveRole);
    setActiveRoomCode(targetRoomCode);
    
    sessionStorage.setItem(ROOM_CODE_KEY, targetRoomCode);
    localStorage.setItem(ROOM_CODE_KEY, targetRoomCode);
    refreshAuthExpiry();
    setIsAuthenticated(true);

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('room', targetRoomCode);
      window.history.replaceState(null, '', url.toString());
    }
  };

  const handleSignOut = async () => {
    await signOutUser();
    setIsAuthenticated(false);
    setCurrentUser(null);
    sessionStorage.removeItem(AUTH_FLAG_KEY);
    localStorage.removeItem(AUTH_FLAG_KEY);
    localStorage.removeItem(AUTH_EXPIRY_KEY);
  };

  return {
    sessionId,
    userName,
    setUserName,
    userRole,
    setUserRole,
    room,
    setRoom,
    activeTab,
    setActiveTab,
    attendees,
    currentUser,
    isAuthenticated,
    handleAuthenticated,
    handleSignOut,
    channelManager,
    promotionToast,
    setPromotionToast,
    promoteToAdmin,
    demoteFromAdmin,
    mutedSessionIds,
    bannedSessionIds,
    isMuted,
    isBanned,
    banNotice,
    dismissBanNotice: () => setBanNotice(null),
    muteAttendee,
    unmuteAttendee,
    banAttendee,
    strikesBySession,
    myStrikes,
    recordMyStrike,
    officialWarning,
    dismissOfficialWarning: () => setOfficialWarning(null),
    sendAttendeeWarning,
    resetAttendeeStrikes,
  };
}
