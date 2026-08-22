import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import type { Room, AttendeePresence, ActiveTabType } from '../types';
import { RealtimeChannelManager } from '../lib/realtime/channelManager';
import { onAuthChange, getCurrentUser, signOutUser, dbFetchRooms, dbUpdateRoomAdmins, isEmailVerified, isUserRoomAdmin } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

const SESSION_KEY = 'sketchcast_session_id';
const NAME_KEY = 'sketchcast_user_name';
const ROLE_KEY = 'sketchcast_user_role';
const AUTH_FLAG_KEY = 'sketchcast_authenticated_session';
const ACTIVE_TAB_KEY = 'sketchcast_active_tab';
const ROOM_CODE_KEY = 'sketchcast_room_code';

export function getOrCreateSessionId(): string {
  if (typeof window !== 'undefined') {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = 'user_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
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
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam && roomParam.trim()) {
      const code = roomParam.trim().toUpperCase();
      sessionStorage.setItem(ROOM_CODE_KEY, code);
      localStorage.setItem(ROOM_CODE_KEY, code);
      return code;
    }
    const sessionStored = sessionStorage.getItem(ROOM_CODE_KEY);
    if (sessionStored && sessionStored.trim()) {
      return sessionStored.trim().toUpperCase();
    }
    const localStored = localStorage.getItem(ROOM_CODE_KEY);
    if (localStored && localStored.trim()) {
      return localStored.trim().toUpperCase();
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
    return RealtimeChannelManager.getInstance(getStoredRoomCode(initialRoomCode), getOrCreateSessionId());
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem(AUTH_FLAG_KEY) === 'true' || localStorage.getItem(AUTH_FLAG_KEY) === 'true';
    }
    return false;
  });

  // Sync activeTab with URL Hash & Storage
  const setActiveTab = (tab: ActiveTabType) => {
    setActiveTabState(tab);
    try {
      sessionStorage.setItem(ACTIVE_TAB_KEY, tab);
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
      if (['quiz', 'polls', 'qa', 'leaderboard', 'rooms'].includes(hash)) {
        setActiveTabState(hash);
        sessionStorage.setItem(ACTIVE_TAB_KEY, hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Supabase Auth Listener (Auto-auth on active Supabase session with verified email)
  useEffect(() => {
    getCurrentUser().then((user) => {
      if (user && isEmailVerified(user)) {
        setCurrentUser(user);
        setIsAuthenticated(true);
        sessionStorage.setItem(AUTH_FLAG_KEY, 'true');
        localStorage.setItem(AUTH_FLAG_KEY, 'true');
        const name = user.user_metadata?.display_name || user.email?.split('@')[0];
        if (name) {
          setUserNameState(name);
          sessionStorage.setItem(NAME_KEY, name);
        }
      } else {
        if (user && !isEmailVerified(user)) {
          signOutUser();
        }
        setIsAuthenticated(false);
        sessionStorage.removeItem(AUTH_FLAG_KEY);
        localStorage.removeItem(AUTH_FLAG_KEY);
      }
    });

    const unsubscribe = onAuthChange((user) => {
      if (user && isEmailVerified(user)) {
        setCurrentUser(user);
        setIsAuthenticated(true);
        sessionStorage.setItem(AUTH_FLAG_KEY, 'true');
        localStorage.setItem(AUTH_FLAG_KEY, 'true');
        const name = user.user_metadata?.display_name || user.email?.split('@')[0];
        if (name) {
          sessionStorage.setItem(NAME_KEY, name);
          setUserNameState(name);
        }
      } else {
        setCurrentUser(null);
        setIsAuthenticated(false);
        sessionStorage.removeItem(AUTH_FLAG_KEY);
        localStorage.removeItem(AUTH_FLAG_KEY);
      }
    });

    return () => unsubscribe();
  }, []);

  const [promotionToast, setPromotionToast] = useState<string | null>(null);

  // Check if current user is pre-authorized as owner or co-admin for the active room
  useEffect(() => {
    dbFetchRooms().then((rooms) => {
      const current = rooms.find((r) => r.code.toUpperCase() === activeRoomCode.toUpperCase());
      if (current) {
        setRoom(current);
        const isAdmin = isUserRoomAdmin(current, currentUser, userName);
        if (isAdmin) {
          setUserRoleState('host');
          sessionStorage.setItem(ROLE_KEY, 'host');
          localStorage.setItem(ROLE_KEY, 'host');
        }
      }
    });
  }, [activeRoomCode, userName, currentUser]);

  // Realtime Channel & Presence setup
  useEffect(() => {
    const manager = RealtimeChannelManager.getInstance(activeRoomCode, sessionId);
    setChannelManager(manager);

    const unPresence = manager.on('presence_sync', (presenceList) => {
      setAttendees(presenceList);
    });

    const unAdminPromote = manager.on('room_admin_promoted', (event) => {
      if (event.roomId.toUpperCase().trim() === activeRoomCode.toUpperCase().trim()) {
        const isTarget = event.targetSessionId === sessionId || event.targetName.toLowerCase() === userName.toLowerCase();
        if (isTarget) {
          if (event.action === 'promote') {
            setUserRoleState('host');
            sessionStorage.setItem(ROLE_KEY, 'host');
            localStorage.setItem(ROLE_KEY, 'host');
            setPromotionToast(`🎉 You have been promoted to Room Admin! Host controls unlocked.`);
            try {
              confetti({
                particleCount: 120,
                spread: 80,
                origin: { y: 0.5 },
                colors: ['#FFE600', '#00F59B', '#00F0FF', '#FF2A6D'],
              });
            } catch {
              // ignore
            }
          } else if (event.action === 'demote') {
            setUserRoleState('attendee');
            sessionStorage.setItem(ROLE_KEY, 'attendee');
            localStorage.setItem(ROLE_KEY, 'attendee');
            setPromotionToast(`Your admin permissions for this room were updated.`);
          }
        }
      }
    });

    // Track presence immediately on room connection
    const initialPresence: AttendeePresence = {
      session_id: sessionId,
      name: userName,
      role: userRole,
      joined_at: Date.now(),
      last_active: Date.now(),
    };
    manager.trackPresence(initialPresence);

    return () => {
      unPresence();
      unAdminPromote();
    };
  }, [activeRoomCode, sessionId, userName]);

  // Keep presence updated when name or role changes
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
    if (channelManager) {
      channelManager.broadcast('room_admin_promoted', {
        roomId: activeRoomCode,
        targetSessionId,
        targetName,
        action: 'promote',
      });
    }

    const rooms = await dbFetchRooms();
    const current = rooms.find((r) => r.code.toUpperCase() === activeRoomCode.toUpperCase());
    const existingAdmins = current?.admins || [];
    if (!existingAdmins.some((a) => a.toLowerCase() === targetName.toLowerCase())) {
      const updatedAdmins = [...existingAdmins, targetName];
      await dbUpdateRoomAdmins(activeRoomCode, updatedAdmins);
      setRoom((prev) => ({ ...prev, admins: updatedAdmins }));
    }
  };

  const demoteFromAdmin = async (targetSessionId: string, targetName: string) => {
    if (channelManager) {
      channelManager.broadcast('room_admin_promoted', {
        roomId: activeRoomCode,
        targetSessionId,
        targetName,
        action: 'demote',
      });
    }

    const rooms = await dbFetchRooms();
    const current = rooms.find((r) => r.code.toUpperCase() === activeRoomCode.toUpperCase());
    const existingAdmins = current?.admins || [];
    const updatedAdmins = existingAdmins.filter((a) => a.toLowerCase() !== targetName.toLowerCase());
    await dbUpdateRoomAdmins(activeRoomCode, updatedAdmins);
    setRoom((prev) => ({ ...prev, admins: updatedAdmins }));
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
    
    sessionStorage.setItem(ROOM_CODE_KEY, targetRoomCode);
    sessionStorage.setItem(AUTH_FLAG_KEY, 'true');
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
    sessionStorage.removeItem(AUTH_FLAG_KEY);
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
    promotionToast,
    setPromotionToast,
    promoteToAdmin,
    demoteFromAdmin,
  };
}
