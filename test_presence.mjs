import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rkwrlyjdntwgvzgfxphv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrd3JseWpkbnR3Z3Z6Z2Z4cGh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczNzU5NzYsImV4cCI6MjEwMjk1MTk3Nn0.sqkO1wWH-g1RW6osbLaZN-1QXeKnTtfcgjxxcIL4q8k';

const client1 = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
const client2 = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

async function main() {
  console.log('Testing 2 clients on room sketchcast-room-NODE-7545...');
  const ch1 = client1.channel('sketchcast-room-NODE-7545', {
    config: { broadcast: { self: false, ack: true }, presence: { key: 'user_client1' } }
  });
  const ch2 = client2.channel('sketchcast-room-NODE-7545', {
    config: { broadcast: { self: false, ack: true }, presence: { key: 'user_client2' } }
  });

  ch1.on('presence', { event: 'sync' }, () => {
    console.log('[CH1 Presence Sync]', ch1.presenceState());
  });

  ch2.on('presence', { event: 'sync' }, () => {
    console.log('[CH2 Presence Sync]', ch2.presenceState());
  });

  ch1.subscribe(async (status) => {
    console.log('CH1 Status:', status);
    if (status === 'SUBSCRIBED') {
      const res = await ch1.track({ session_id: 'user_client1', name: 'Lagan Host', role: 'host' });
      console.log('CH1 tracked:', res);
    }
  });

  setTimeout(() => {
    ch2.subscribe(async (status) => {
      console.log('CH2 Status:', status);
      if (status === 'SUBSCRIBED') {
        const res = await ch2.track({ session_id: 'user_client2', name: 'Sanskari Attendee', role: 'attendee' });
        console.log('CH2 tracked:', res);
      }
    });
  }, 2000);

  setTimeout(() => {
    console.log('Final CH1 State:', ch1.presenceState());
    console.log('Final CH2 State:', ch2.presenceState());
    process.exit(0);
  }, 6000);
}

main();
