import { useState, useEffect, useCallback } from 'react';
import type { LivePoll } from '../types';
import { RealtimeChannelManager } from '../lib/realtime/channelManager';
import { dbFetchPolls, dbInsertPoll, dbUpdatePoll, dbDeletePoll } from '../lib/supabase';

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
    try {
      const stored = localStorage.getItem(pollStorageKey);
      if (stored) {
        setPolls(JSON.parse(stored));
      }
    } catch {
      // ignore
    }

    dbFetchPolls(currentRoomKey).then((remotePolls) => {
      if (remotePolls && remotePolls.length > 0) {
        setPolls((currentPolls) => {
          const merged = remotePolls.map((rp) => {
            const current = currentPolls.find((cp) => cp.id === rp.id);
            return {
              ...rp,
              aiConsensusNote: rp.aiConsensusNote || current?.aiConsensusNote || undefined,
            };
          });
          try {
            localStorage.setItem(pollStorageKey, JSON.stringify(merged));
          } catch {
            // ignore
          }
          return merged;
        });
      }
    });
  }, [currentRoomKey, pollStorageKey]);

  // Listen to remote poll updates and resets
  useEffect(() => {
    if (!channelManager) return;

    const unPolls = channelManager.on('poll_update', (updatedPolls) => {
      setPolls((currentPolls) => {
        const merged = updatedPolls.map((up: LivePoll) => {
          const current = currentPolls.find((cp) => cp.id === up.id);
          return {
            ...up,
            aiConsensusNote: up.aiConsensusNote || current?.aiConsensusNote || undefined,
          };
        });
        try {
          localStorage.setItem(pollStorageKey, JSON.stringify(merged));
        } catch {
          // ignore
        }
        return merged;
      });
    });

    const unReset = channelManager.on('poll_reset', ({ pollId }) => {
      setUserVotes((prev) => {
        const next = { ...prev };
        delete next[pollId];
        try {
          localStorage.setItem(voteStorageKey, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
    });

    return () => {
      unPolls();
      unReset();
    };
  }, [channelManager, pollStorageKey, voteStorageKey]);

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
    [polls, userName, channelManager, currentRoomKey, pollStorageKey]
  );

  // Vote on a Poll Option (Protected against duplicate votes on the same option)
  const voteOnPoll = useCallback(
    (pollId: string, optionId: string) => {
      const currentVotedOption = userVotes[pollId];

      // If user already selected this exact same option, ignore redundant clicks
      if (currentVotedOption === optionId) {
        return;
      }

      const nextVotes = { ...userVotes, [pollId]: optionId };
      persistUserVotes(nextVotes);

      let targetUpdatedPoll: LivePoll | null = null;

      const nextPolls = polls.map((poll) => {
        if (poll.id === pollId) {
          let updatedTotal = poll.totalVotes;
          if (!currentVotedOption) {
            // First time voting on this poll
            updatedTotal += 1;
          }

          const updatedOptions = poll.options.map((opt) => {
            if (opt.id === optionId) {
              return { ...opt, votesCount: opt.votesCount + 1 };
            }
            if (currentVotedOption && opt.id === currentVotedOption) {
              return { ...opt, votesCount: Math.max(0, opt.votesCount - 1) };
            }
            return opt;
          });

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
      }
    },
    [polls, userVotes, channelManager, pollStorageKey, voteStorageKey]
  );

  // Admin: Reset all votes for a poll back to 0 so attendees can vote again
  const resetPoll = useCallback(
    (pollId: string) => {
      let targetUpdatedPoll: LivePoll | null = null;

      const nextPolls = polls.map((poll) => {
        if (poll.id === pollId) {
          const resetOptions = poll.options.map((opt) => ({ ...opt, votesCount: 0 }));
          const updated: LivePoll = {
            ...poll,
            totalVotes: 0,
            options: resetOptions,
          };
          targetUpdatedPoll = updated;
          return updated;
        }
        return poll;
      });

      persistPolls(nextPolls);

      // Clear local user vote for this poll
      const nextVotes = { ...userVotes };
      delete nextVotes[pollId];
      persistUserVotes(nextVotes);

      if (targetUpdatedPoll) {
        dbUpdatePoll(targetUpdatedPoll);
      }

      if (channelManager) {
        channelManager.broadcast('poll_update', nextPolls);
        channelManager.broadcast('poll_reset', { pollId });
      }
    },
    [polls, userVotes, channelManager, pollStorageKey, voteStorageKey]
  );

  // Admin: Delete a poll completely
  const deletePoll = useCallback(
    (pollId: string) => {
      const nextPolls = polls.filter((poll) => poll.id !== pollId);
      persistPolls(nextPolls);

      const nextVotes = { ...userVotes };
      delete nextVotes[pollId];
      persistUserVotes(nextVotes);

      dbDeletePoll(pollId);

      if (channelManager) {
        channelManager.broadcast('poll_update', nextPolls);
        channelManager.broadcast('poll_reset', { pollId });
      }
    },
    [polls, userVotes, channelManager, pollStorageKey, voteStorageKey]
  );

  // Admin: Update AI Consensus summary on a poll
  const updatePollAIConsensus = useCallback(
    (pollId: string, consensusNote: string) => {
      setPolls((currentPolls) => {
        let targetUpdatedPoll: LivePoll | null = null;
        const nextPolls = currentPolls.map((poll) => {
          if (poll.id === pollId) {
            const updated: LivePoll = {
              ...poll,
              aiConsensusNote: consensusNote,
            };
            targetUpdatedPoll = updated;
            return updated;
          }
          return poll;
        });

        try {
          localStorage.setItem(pollStorageKey, JSON.stringify(nextPolls));
        } catch {
          // ignore
        }

        if (targetUpdatedPoll) {
          dbUpdatePoll(targetUpdatedPoll);
        }
        if (channelManager) {
          channelManager.broadcast('poll_update', nextPolls);
        }

        return nextPolls;
      });
    },
    [channelManager, pollStorageKey]
  );

  return {
    polls,
    userVotes,
    createPoll,
    voteOnPoll,
    resetPoll,
    deletePoll,
    updatePollAIConsensus,
  };
}
