import { useState, useEffect, useCallback, useRef } from 'react';
import type { LivePoll } from '../types';
import { RealtimeChannelManager } from '../lib/realtime/channelManager';
import { dbFetchPolls, dbInsertPoll, dbUpdatePoll, dbDeletePoll, dbVoteOnPoll } from '../lib/supabase';

export function usePollsEngine({
  channelManager,
  sessionId,
  userName,
  roomCode,
  activeTab,
}: {
  channelManager: RealtimeChannelManager | null;
  sessionId: string;
  userName: string;
  roomCode: string;
  activeTab?: string;
}) {
  const currentRoomKey = (roomCode || 'SKT-789').toUpperCase().trim();
  const pollStorageKey = `sketchcast_polls_${currentRoomKey}`;
  const voteStorageKey = `sketchcast_poll_votes_${sessionId}_${currentRoomKey}`;
  const voteNameStorageKey = `sketchcast_poll_votes_name_${encodeURIComponent(userName)}_${currentRoomKey}`;

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
      const stored = localStorage.getItem(voteStorageKey) || localStorage.getItem(voteNameStorageKey);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Synchronous refs to prevent stale closure races during rapid clicking
  const userVotesRef = useRef<Record<string, string>>(userVotes);
  const pollsRef = useRef<LivePoll[]>(polls);
  const votingLockRef = useRef<Record<string, number>>({});

  useEffect(() => {
    userVotesRef.current = userVotes;
  }, [userVotes]);

  useEffect(() => {
    pollsRef.current = polls;
  }, [polls]);

  // When roomCode switches, immediately load or reset polls and userVotes for the new room
  const [prevRoomKey, setPrevRoomKey] = useState(currentRoomKey);
  if (prevRoomKey !== currentRoomKey) {
    setPrevRoomKey(currentRoomKey);
    try {
      const stored = localStorage.getItem(pollStorageKey);
      setPolls(stored ? JSON.parse(stored) : []);
      const storedVotes = localStorage.getItem(voteStorageKey) || localStorage.getItem(voteNameStorageKey);
      setUserVotes(storedVotes ? JSON.parse(storedVotes) : {});
    } catch {
      setPolls([]);
      setUserVotes({});
    }
  }

  const syncPollsFromDB = useCallback(() => {
    dbFetchPolls(currentRoomKey).then((remotePolls) => {
      if (remotePolls) {
        setPolls((currentPolls) => {
          const merged = remotePolls.map((rp) => {
            const current = currentPolls.find((cp) => cp.id === rp.id);
            const sumVotes = rp.options.reduce((sum, opt) => sum + Math.max(0, opt.votesCount || 0), 0);
            return {
              ...rp,
              totalVotes: Math.max(sumVotes, rp.totalVotes || 0),
              aiConsensusNote: rp.aiConsensusNote || current?.aiConsensusNote || undefined,
            };
          });
          pollsRef.current = merged;
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

  // Load from Supabase DB on initialization, roomCode change, and tab switch to 'polls'
  useEffect(() => {
    syncPollsFromDB();
  }, [currentRoomKey, activeTab, syncPollsFromDB]);

  // Listen to remote poll updates and resets
  useEffect(() => {
    if (!channelManager) return;

    const unPolls = channelManager.on('poll_update', (updatedPolls) => {
      setPolls((currentPolls) => {
        const merged = updatedPolls.map((up: LivePoll) => {
          const current = currentPolls.find((cp) => cp.id === up.id);
          const sumVotes = up.options.reduce((sum, opt) => sum + Math.max(0, opt.votesCount || 0), 0);
          return {
            ...up,
            totalVotes: Math.max(sumVotes, up.totalVotes || 0),
            aiConsensusNote: up.aiConsensusNote || current?.aiConsensusNote || undefined,
          };
        });
        pollsRef.current = merged;
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
        userVotesRef.current = next;
        try {
          localStorage.setItem(voteStorageKey, JSON.stringify(next));
          localStorage.setItem(voteNameStorageKey, JSON.stringify(next));
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
  }, [channelManager, pollStorageKey, voteStorageKey, voteNameStorageKey]);

  const persistPolls = useCallback(
    (newPolls: LivePoll[]) => {
      pollsRef.current = newPolls;
      setPolls(newPolls);
      try {
        localStorage.setItem(pollStorageKey, JSON.stringify(newPolls));
      } catch {
        // ignore
      }
    },
    [pollStorageKey]
  );

  const persistUserVotes = useCallback(
    (votes: Record<string, string>) => {
      userVotesRef.current = votes;
      setUserVotes(votes);
      try {
        localStorage.setItem(voteStorageKey, JSON.stringify(votes));
        localStorage.setItem(voteNameStorageKey, JSON.stringify(votes));
      } catch {
        // ignore
      }
    },
    [voteStorageKey, voteNameStorageKey]
  );

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

      const nextPolls = [newPoll, ...pollsRef.current];
      persistPolls(nextPolls);
      dbInsertPoll(newPoll);

      if (channelManager) {
        channelManager.broadcast('poll_update', nextPolls);
      }
    },
    [userName, channelManager, currentRoomKey, persistPolls]
  );

  // Vote on a Poll Option (Supports option change and un-voting toggle with anti-spam concurrency lock)
  const voteOnPoll = useCallback(
    (pollId: string, optionId: string) => {
      const now = Date.now();
      const lastVoteTime = votingLockRef.current[pollId] || 0;
      if (now - lastVoteTime < 300) {
        return; // Guard against rapid multi-click race conditions
      }
      votingLockRef.current[pollId] = now;

      // Always read from synchronous refs to guarantee we never read a stale render closure
      const currentVotedOption = userVotesRef.current[pollId];
      const currentPolls = pollsRef.current;

      // If user clicked the exact same option, UN-VOTE (toggle off)
      if (currentVotedOption === optionId) {
        const nextVotes = { ...userVotesRef.current };
        delete nextVotes[pollId];
        persistUserVotes(nextVotes);

        let targetUpdatedPoll: LivePoll | null = null;
        const nextPolls = currentPolls.map((poll) => {
          if (poll.id === pollId) {
            const updatedOptions = poll.options.map((opt) => {
              if (opt.id === optionId) {
                return { ...opt, votesCount: Math.max(0, opt.votesCount - 1) };
              }
              return opt;
            });
            // Total votes strictly equals sum of all options
            const recalculatedTotal = updatedOptions.reduce((acc, opt) => acc + opt.votesCount, 0);
            const updated: LivePoll = {
              ...poll,
              totalVotes: Math.max(0, recalculatedTotal),
              options: updatedOptions,
            };
            targetUpdatedPoll = updated;
            return updated;
          }
          return poll;
        });

        persistPolls(nextPolls);
        if (channelManager) channelManager.broadcast('poll_update', nextPolls);

        // Atomic DB mutation via stored procedure with fallback
        dbVoteOnPoll(pollId, null, optionId).then((serverPoll) => {
          if (serverPoll) {
            setPolls((prev) => prev.map((p) => (p.id === pollId ? { ...p, ...serverPoll } : p)));
          }
        }).catch(() => {
          if (targetUpdatedPoll) dbUpdatePoll(targetUpdatedPoll);
        });
        return;
      }

      // User voted for a new or changed option
      const nextVotes = { ...userVotesRef.current, [pollId]: optionId };
      persistUserVotes(nextVotes);

      let targetUpdatedPoll: LivePoll | null = null;

      const nextPolls = currentPolls.map((poll) => {
        if (poll.id === pollId) {
          const updatedOptions = poll.options.map((opt) => {
            if (opt.id === optionId) {
              return { ...opt, votesCount: opt.votesCount + 1 };
            }
            if (currentVotedOption && opt.id === currentVotedOption) {
              return { ...opt, votesCount: Math.max(0, opt.votesCount - 1) };
            }
            return opt;
          });

          // Strict mathematical consistency: totalVotes always equals sum of options
          const recalculatedTotal = updatedOptions.reduce((acc, opt) => acc + opt.votesCount, 0);

          const updated: LivePoll = {
            ...poll,
            totalVotes: Math.max(0, recalculatedTotal),
            options: updatedOptions,
          };
          targetUpdatedPoll = updated;
          return updated;
        }
        return poll;
      });

      persistPolls(nextPolls);

      if (channelManager) {
        channelManager.broadcast('poll_update', nextPolls);
      }

      // Atomic DB mutation via stored procedure with fallback
      dbVoteOnPoll(pollId, optionId, currentVotedOption || null).then((serverPoll) => {
        if (serverPoll) {
          setPolls((prev) => prev.map((p) => (p.id === pollId ? { ...p, ...serverPoll } : p)));
        }
      }).catch(() => {
        if (targetUpdatedPoll) dbUpdatePoll(targetUpdatedPoll);
      });
    },
    [channelManager, persistPolls, persistUserVotes]
  );

  // Admin: Reset all votes for a poll back to 0 so attendees can vote again
  const resetPoll = useCallback(
    (pollId: string) => {
      let targetUpdatedPoll: LivePoll | null = null;
      const currentPolls = pollsRef.current;

      const nextPolls = currentPolls.map((poll) => {
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
      const nextVotes = { ...userVotesRef.current };
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
    [channelManager, persistPolls, persistUserVotes]
  );

  // Admin: Delete a poll completely
  const deletePoll = useCallback(
    (pollId: string) => {
      const nextPolls = pollsRef.current.filter((poll) => poll.id !== pollId);
      persistPolls(nextPolls);

      const nextVotes = { ...userVotesRef.current };
      delete nextVotes[pollId];
      persistUserVotes(nextVotes);

      dbDeletePoll(pollId);

      if (channelManager) {
        channelManager.broadcast('poll_update', nextPolls);
        channelManager.broadcast('poll_reset', { pollId });
      }
    },
    [channelManager, persistPolls, persistUserVotes]
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
