import { useState, useEffect, useCallback } from 'react';
import type { LivePoll } from '../types';
import { INITIAL_LIVE_POLLS } from '../lib/quizBank';
import { RealtimeChannelManager } from '../lib/realtime/channelManager';

export function usePollsEngine({
  channelManager,
  sessionId,
  userName,
}: {
  channelManager: RealtimeChannelManager | null;
  sessionId: string;
  userName: string;
}) {
  const [polls, setPolls] = useState<LivePoll[]>(() => {
    try {
      const stored = localStorage.getItem('sketchcast_polls');
      return stored ? JSON.parse(stored) : INITIAL_LIVE_POLLS;
    } catch {
      return INITIAL_LIVE_POLLS;
    }
  });

  const [userVotes, setUserVotes] = useState<Record<string, string>>(() => {
    try {
      const stored = localStorage.getItem(`sketchcast_poll_votes_${sessionId}`);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

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

  // Persist polls
  const persistPolls = (newPolls: LivePoll[]) => {
    setPolls(newPolls);
    try {
      localStorage.setItem('sketchcast_polls', JSON.stringify(newPolls));
    } catch {
      // ignore
    }
  };

  // Persist user votes
  const persistUserVotes = (votes: Record<string, string>) => {
    setUserVotes(votes);
    try {
      localStorage.setItem(`sketchcast_poll_votes_${sessionId}`, JSON.stringify(votes));
    } catch {
      // ignore
    }
  };

  // Host Action: Create a new Live Poll
  const createPoll = useCallback(
    (question: string, optionsText: string[]) => {
      if (!question.trim() || optionsText.filter((t) => t.trim()).length < 2) return;

      const newPoll: LivePoll = {
        id: 'poll_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
        room_id: 'room-demo-101',
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

      if (channelManager) {
        channelManager.broadcast('poll_update', nextPolls);
      }
    },
    [polls, userName, channelManager]
  );

  // Attendee Action: Vote on a Poll Option
  const voteOnPoll = useCallback(
    (pollId: string, optionId: string) => {
      const currentVotedOption = userVotes[pollId];

      const nextVotes = { ...userVotes, [pollId]: optionId };
      persistUserVotes(nextVotes);

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

          return {
            ...poll,
            totalVotes: updatedTotal,
            options: updatedOptions,
          };
        }
        return poll;
      });

      persistPolls(nextPolls);

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
