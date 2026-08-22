import { useState, useEffect } from 'react';
import type { Room, AttendeePresence, ActiveTabType } from '../types';
import { RealtimeChannelManager } from '../lib/realtime/channelManager';
import { onAuthChange, getCurrentUser, signOutUser } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

const SESSION_KEY = 'sketchcast_session_id';
const NAME_KEY = 'sketchcast_user_name';
const ROLE_KEY = 'sketchcast_user_role';
const AUTH_FLAG_KEY = 'sketchcast_authenticated_session';
const ACTIVE_TAB_KEY = 'sketchcast_active_tab';
const ROOM_CODE_KEY = 'sketchcast_room_code';

export function getOrCreateSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = 'user_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function getStoredUserName(): string {
  return localStorage.getItem(NAME_KEY) || 'TechAttendee ' + Math.floor(100 + Math.random() * 900);
}

export function getStoredUserRole(): 'host' | 'attendee' {
  return (localStorage.getItem(ROLE_KEY) as 'host' | 'attendee') || 'attendee';
}

export function getStoredRoomCode(fallback: string = 'SKT-789'): string {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam && roomParam.trim()) {
      const code = roomParam.trim().toUpperCase();
      localStorage.setItem(ROOM_CODE_KEY, code);
      return code;
    }
    const stored = localStorage.getItem(ROOM_CODE_KEY);
    if (stored && stored.trim()) {
      return stored.trim().toUpperCase();
    }
  }
  return fallback;
}

export function getInitialActiveTab(): ActiveTabType {
  if (typeof window !== 'undefined') {
    const hash = window.location.hash.replace('#', '') as ActiveTabType;
    if (['quiz', 'polls', 'qa', 'leaderboard'].includes(hash)) {
      return hash;
    }
    const stored = localStorage.getItem(ACTIVE_TAB_KEY) as ActiveTabType;
    if (['quiz', 'polls', 'qa', 'leaderboard'].includes(stored)) {
      return stored;
    }
  }
  return 'quiz';
}

export function useRoomSession(initialRoomCode: string = 'SKT-789') {
  const [sessionId] = useState<string>(getOrCreateSessionId);
  const [userName, setUserNameState] = useState<string>(getStoredUserName);
  const [userRole, setUserRoleState] = useState<'host' | 'attendee'>(getStoredUserRole);
  const [activeRoomCode, setActiveRoomCode] = useState<string>(() => getStoredRoomCode(initialRoomCode));
  
  const [room, setRoom] = useState<Room>(() => ({
    id: `room-${getStoredRoomCode(initialRoomCode)}`,
    code: getStoredRoomCode(initialRoomCode),
    title: `NextGen Arena // ${getStoredRoomCode(initialRoomCode)}`,
    host_id: 'host-root-1',
    host_name: 'Alex Chen (Host)',
    created_at: new Date().toISOString(),
  }));

  const [activeTab, setActiveTabState] = useState<ActiveTabType>(getInitialActiveTab);
  const [attendees, setAttendees] = useState<AttendeePresence[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [channelManager, setChannelManager] = useState<RealtimeChannelManager | null>(() => {
    return RealtimeChannelManager.getInstance(getStoredRoomCode(initialRoomCode));
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem(AUTH_FLAG_KEY) === 'true';
  });

  // Sync activeTab with URL Hash & LocalStorage
  const setActiveTab = (tab: ActiveTabType) => {
    setActiveTabState(tab);
    try {
      localStorage.setItem(ACTIVE_TAB_KEY, tab);
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.hash = tab;
        url.searchParams.set('room', activeRoomCode);
        window.history.replaceState(null, '', url.toString());
      }
    } catch {
      // ignore
    }
  };

  // Listen to hash change for browser back/forward navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as ActiveTabType;
      if (['quiz', 'polls', 'qa', 'leaderboard'].includes(hash)) {
        setActiveTabState(hash);
        localStorage.setItem(ACTIVE_TAB_KEY, hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Supabase Auth Listener (Auto-auth on active Supabase session)
  useEffect(() => {
    getCurrentUser().then((user) => {
      if (user) {
        setCurrentUser(user);
        setIsAuthenticated(true);
        localStorage.setItem(AUTH_FLAG_KEY, 'true');
        const name = user.user_metadata?.display_name || user.email?.split('@')[0];
        if (name) setUserNameState(name);
      }
    });

    const unsubscribe = onAuthChange((user) => {
      setCurrentUser(user);
      if (user) {
        setIsAuthenticated(true);
        localStorage.setItem(AUTH_FLAG_KEY, 'true');
        const name = user.user_metadata?.display_name || user.email?.split('@')[0];
        if (name) {
          localStorage.setItem(NAME_KEY, name);
          setUserNameState(name);
        }
      } else {
        if (localStorage.getItem(AUTH_FLAG_KEY) === 'supabase') {
          setIsAuthenticated(false);
          localStorage.removeItem(AUTH_FLAG_KEY);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Realtime Channel & Presence setup
  useEffect(() => {
    const manager = RealtimeChannelManager.getInstance(activeRoomCode);
    setChannelManager(manager);

    const unPresence = manager.on('presence_sync', (presenceList) => {
      setAttendees(presenceList);
    });

    return () => {
      unPresence();
    };
  }, [activeRoomCode]);

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
    localStorage.setItem(NAME_KEY, name);
    setUserNameState(name);
  };

  const setUserRole = (role: 'host' | 'attendee') => {
    localStorage.setItem(ROLE_KEY, role);
    setUserRoleState(role);
  };

  const handleAuthenticated = (name: string, role: 'host' | 'attendee', customRoomCode?: string) => {
    const targetRoomCode = (customRoomCode || activeRoomCode || 'SKT-789').toUpperCase().trim();
    
    setUserName(name);
    setUserRole(role);
    setActiveRoomCode(targetRoomCode);
    setRoom((prev) => ({
      ...prev,
      id: `room-${targetRoomCode}`,
      code: targetRoomCode,
      title: `NextGen Arena // ${targetRoomCode}`,
    }));
    
    localStorage.setItem(ROOM_CODE_KEY, targetRoomCode);
    localStorage.setItem(AUTH_FLAG_KEY, 'true');
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
    localStorage.removeItem(AUTH_FLAG_KEY);
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
  };
}
