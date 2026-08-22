import { useState, useEffect, useCallback } from 'react';
import type { LivePoll } from '../types';
import { RealtimeChannelManager } from '../lib/realtime/channelManager';
import { dbFetchPolls, dbInsertPoll, dbUpdatePoll } from '../lib/supabase';

export function usePollsEngine({
  channelManager,
  sessionId,
  userName,
  roomCode,
}: {
  channelManager: RealtimeChannelManager | null;
  sessionId: string;
  userName: string;
  roomCode: string;
}) {
  const currentRoomKey = (roomCode || 'SKT-789').toUpperCase().trim();
  const pollStorageKey = `sketchcast_polls_${currentRoomKey}`;
  const voteStorageKey = `sketchcast_poll_votes_${sessionId}_${currentRoomKey}`;

  const [polls, setPolls] = useState<LivePoll[]>(() => {
    try {
      const stored = localStorage.getItem(pollStorageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [userVotes, setUserVotes] = useState<Record<string, string>>(() => {
    try {
      const stored = localStorage.getItem(voteStorageKey);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Load from Supabase DB on initialization & roomCode change
  useEffect(() => {
    dbFetchPolls(currentRoomKey).then((remotePolls) => {
      if (remotePolls) {
        setPolls(remotePolls);
      }
    });
  }, [currentRoomKey]);

  // Listen to remote poll updates
  useEffect(() => {
    if (!channelManager) return;

    const unPolls = channelManager.on('poll_update', (updatedPolls) => {
      setPolls(updatedPolls);
    });

    const unVote = channelManager.on('poll_vote', ({ pollId, optionId }) => {
      setPolls((prev) =>
        prev.map((poll) => {
          if (poll.id === pollId) {
            const updatedOptions = poll.options.map((opt) =>
              opt.id === optionId ? { ...opt, votesCount: opt.votesCount + 1 } : opt
            );
            return {
              ...poll,
              totalVotes: poll.totalVotes + 1,
              options: updatedOptions,
            };
          }
          return poll;
        })
      );
    });

    return () => {
      unPolls();
      unVote();
    };
  }, [channelManager]);

  const persistPolls = (newPolls: LivePoll[]) => {
    setPolls(newPolls);
    try {
      localStorage.setItem(pollStorageKey, JSON.stringify(newPolls));
    } catch {
      // ignore
    }
  };

  const persistUserVotes = (votes: Record<string, string>) => {
    setUserVotes(votes);
    try {
      localStorage.setItem(voteStorageKey, JSON.stringify(votes));
    } catch {
      // ignore
    }
  };

  // Create a new Live Poll for this room
  const createPoll = useCallback(
    (question: string, optionsText: string[]) => {
      if (!question.trim() || optionsText.filter((t) => t.trim()).length < 2) return;

      const newPoll: LivePoll = {
        id: 'poll_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
        room_id: currentRoomKey,
        question: question.trim(),
        author_name: userName,
        created_at: new Date().toISOString(),
        totalVotes: 0,
        options: optionsText
          .filter((t) => t.trim())
          .map((text, idx) => ({
            id: `opt-${idx + 1}`,
            text: text.trim(),
            votesCount: 0,
          })),
      };

      const nextPolls = [newPoll, ...polls];
      persistPolls(nextPolls);
      dbInsertPoll(newPoll);

      if (channelManager) {
        channelManager.broadcast('poll_update', nextPolls);
      }
    },
    [polls, userName, channelManager, currentRoomKey]
  );

  // Vote on a Poll Option
  const voteOnPoll = useCallback(
    (pollId: string, optionId: string) => {
      const currentVotedOption = userVotes[pollId];

      const nextVotes = { ...userVotes, [pollId]: optionId };
      persistUserVotes(nextVotes);

      let targetUpdatedPoll: LivePoll | null = null;

      const nextPolls = polls.map((poll) => {
        if (poll.id === pollId) {
          let updatedTotal = poll.totalVotes;
          const updatedOptions = poll.options.map((opt) => {
            if (opt.id === optionId) {
              return { ...opt, votesCount: opt.votesCount + 1 };
            }
            if (currentVotedOption && opt.id === currentVotedOption) {
              return { ...opt, votesCount: Math.max(0, opt.votesCount - 1) };
            }
            return opt;
          });

          if (!currentVotedOption) {
            updatedTotal += 1;
          }

          const updated: LivePoll = {
            ...poll,
            totalVotes: updatedTotal,
            options: updatedOptions,
          };
          targetUpdatedPoll = updated;
          return updated;
        }
        return poll;
      });

      persistPolls(nextPolls);

      if (targetUpdatedPoll) {
        dbUpdatePoll(targetUpdatedPoll);
      }

      if (channelManager) {
        channelManager.broadcast('poll_update', nextPolls);
        channelManager.broadcast('poll_vote', {
          pollId,
          optionId,
          voterSession: sessionId,
        });
      }
    },
    [polls, userVotes, sessionId, channelManager]
  );

  return {
    polls,
    userVotes,
    createPoll,
    voteOnPoll,
  };
}
