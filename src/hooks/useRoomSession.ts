import { useState, useEffect, useRef } from 'react';
import type { Room, AttendeePresence, ActiveTabType } from '../types';
import { RealtimeChannelManager } from '../lib/realtime/channelManager';

const SESSION_KEY = 'sketchcast_session_id';
const NAME_KEY = 'sketchcast_user_name';
const ROLE_KEY = 'sketchcast_user_role';

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

const DEFAULT_ROOM: Room = {
  id: 'room-demo-101',
  code: 'SKT-789',
  title: 'NextGen Tech Arena — Live Voting & Quizzing',
  host_id: 'host-root-1',
  host_name: 'Alex Chen (Host)',
  created_at: new Date().toISOString(),
};

export function useRoomSession(_initialRoomCode: string = 'SKT-789') {
  const [sessionId] = useState<string>(getOrCreateSessionId);
  const [userName, setUserNameState] = useState<string>(getStoredUserName);
  const [userRole, setUserRoleState] = useState<'host' | 'attendee'>('host'); // Default to host for rich immediate exploration
  const [room, setRoom] = useState<Room>(DEFAULT_ROOM);
  const [activeTab, setActiveTab] = useState<ActiveTabType>('quiz');
  const [attendees, setAttendees] = useState<AttendeePresence[]>([]);

  const channelManagerRef = useRef<RealtimeChannelManager | null>(null);

  useEffect(() => {
    const manager = new RealtimeChannelManager(room.code);
    channelManagerRef.current = manager;

    const unPresence = manager.on('presence_sync', (presenceList) => {
      setAttendees(presenceList);
    });

    const myPresence: AttendeePresence = {
      session_id: sessionId,
      name: userName,
      role: userRole,
      joined_at: Date.now(),
      last_active: Date.now(),
    };
    manager.trackPresence(myPresence);

    return () => {
      unPresence();
      manager.destroy();
    };
  }, [room.code]);

  useEffect(() => {
    if (channelManagerRef.current) {
      const myPresence: AttendeePresence = {
        session_id: sessionId,
        name: userName,
        role: userRole,
        joined_at: Date.now(),
        last_active: Date.now(),
      };
      channelManagerRef.current.trackPresence(myPresence);
    }
  }, [userName, userRole]);

  const setUserName = (name: string) => {
    localStorage.setItem(NAME_KEY, name);
    setUserNameState(name);
  };

  const setUserRole = (role: 'host' | 'attendee') => {
    localStorage.setItem(ROLE_KEY, role);
    setUserRoleState(role);
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
    channelManager: channelManagerRef.current,
  };
}
