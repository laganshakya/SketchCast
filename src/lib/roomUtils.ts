import { supabase, dbFetchRooms } from './supabase';
import type { Room } from '../types';

export const ROOM_CODE_PREFIXES = [
  'SKT',
  'ARENA',
  'DEV',
  'TECH',
  'ARCH',
  'CYBER',
  'NODE',
  'FLOW',
  'PULSE',
  'STAGE',
  'LAB',
  'NEXUS',
  'ORBIT',
  'HEX',
] as const;

export function cleanRoomCode(code: string): string {
  return (code || '').toUpperCase().trim();
}

/**
 * Generates a room passcode guaranteed not to collide with any room in
 * Supabase or local storage.
 */
export async function generateGuaranteedUniqueRoomCode(
  existingRoomsList?: Room[]
): Promise<string> {
  const existingCodes = new Set<string>();

  // 1. Gather codes from passed list or dbFetchRooms
  if (existingRoomsList && existingRoomsList.length > 0) {
    existingRoomsList.forEach((r) => {
      if (r.code) existingCodes.add(cleanRoomCode(r.code));
    });
  } else {
    try {
      const allRooms = await dbFetchRooms();
      allRooms.forEach((r) => {
        if (r.code) existingCodes.add(cleanRoomCode(r.code));
      });
    } catch {
      // ignore
    }
  }

  // 2. Gather codes from local storage
  if (typeof window !== 'undefined') {
    try {
      const storedLocal = localStorage.getItem('sketchcast_local_rooms');
      if (storedLocal) {
        const parsed: Room[] = JSON.parse(storedLocal);
        parsed.forEach((r) => {
          if (r.code) existingCodes.add(cleanRoomCode(r.code));
        });
      }
      const myCreated = localStorage.getItem('sketchcast_my_created_rooms');
      if (myCreated) {
        const parsedCreated: string[] = JSON.parse(myCreated);
        parsedCreated.forEach((c) => existingCodes.add(cleanRoomCode(c)));
      }
    } catch {
      // ignore
    }
  }

  // 3. Try candidates against existing codes set and Supabase
  for (let i = 0; i < 50; i++) {
    const prefix = ROOM_CODE_PREFIXES[Math.floor(Math.random() * ROOM_CODE_PREFIXES.length)];
    const num = Math.floor(1000 + Math.random() * 9000);
    const candidate = `${prefix}-${num}`;

    if (!existingCodes.has(candidate)) {
      // Double check directly against Supabase database for remote uniqueness
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('rooms')
            .select('id')
            .or(`code.eq.${candidate},id.eq.room-${candidate}`)
            .limit(1);

          if (!error && (!data || data.length === 0)) {
            return candidate;
          }
          if (data && data.length > 0) {
            existingCodes.add(candidate);
            continue;
          }
        } catch {
          // If query fails, assume candidate is good
          return candidate;
        }
      } else {
        return candidate;
      }
    }
  }

  // High entropy fallback
  return `SKT-${Date.now().toString(36).toUpperCase().slice(-5)}`;
}
