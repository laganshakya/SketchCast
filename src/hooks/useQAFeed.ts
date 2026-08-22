import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Question, QuestionStatus } from '../types';
import { RealtimeChannelManager } from '../lib/realtime/channelManager';
import {
  dbFetchQuestions,
  dbInsertQuestion,
  dbUpdateQuestionUpvotes,
  dbUpdateQuestionStatus,
} from '../lib/supabase';

export function useQAFeed({
  channelManager,
  sessionId,
  userName,
  userRole,
  roomCode,
}: {
  channelManager: RealtimeChannelManager | null;
  sessionId: string;
  userName: string;
  userRole: 'host' | 'attendee';
  roomCode: string;
}) {
  const currentRoomKey = (roomCode || 'SKT-789').toUpperCase().trim();
  const qaTabKey = `sketchcast_qa_active_tab_${currentRoomKey}`;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [upvotedIds, setUpvotedIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(`sketchcast_upvotes_${sessionId}_${currentRoomKey}`);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [activeTab, setActiveTabState] = useState<'top' | 'recent' | 'answered' | 'spotlight'>(() => {
    try {
      const stored = localStorage.getItem(qaTabKey) as 'top' | 'recent' | 'answered' | 'spotlight';
      if (['top', 'recent', 'answered', 'spotlight'].includes(stored)) {
        return stored;
      }
    } catch {
      // ignore
    }
    return 'top';
  });

  const setActiveTab = (tab: 'top' | 'recent' | 'answered' | 'spotlight') => {
    setActiveTabState(tab);
    try {
      localStorage.setItem(qaTabKey, tab);
    } catch {
      // ignore
    }
  };

  // Load from Supabase DB on initialization & roomCode change
  useEffect(() => {
    dbFetchQuestions(currentRoomKey).then((remoteQuestions) => {
      if (remoteQuestions) {
        setQuestions(remoteQuestions);
      }
    });
  }, [currentRoomKey]);

  // Realtime synchronization
  useEffect(() => {
    if (!channelManager) return;

    const unQuestions = channelManager.on('question_list', (updatedQuestions) => {
      setQuestions(updatedQuestions);
    });

    const unUpvote = channelManager.on('question_upvote', ({ questionId, upvotesCount }) => {
      setQuestions((prev) =>
        prev.map((q) => (q.id === questionId ? { ...q, upvotes_count: upvotesCount } : q))
      );
    });

    return () => {
      unQuestions();
      unUpvote();
    };
  }, [channelManager]);

  const persistUpvotes = (ids: Set<string>) => {
    setUpvotedIds(ids);
    try {
      localStorage.setItem(`sketchcast_upvotes_${sessionId}_${currentRoomKey}`, JSON.stringify(Array.from(ids)));
    } catch {
      // ignore
    }
  };

  const toggleUpvote = useCallback(
    (questionId: string) => {
      const hasUpvoted = upvotedIds.has(questionId);
      const nextUpvoted = new Set(upvotedIds);

      if (hasUpvoted) {
        nextUpvoted.delete(questionId);
      } else {
        nextUpvoted.add(questionId);
      }
      persistUpvotes(nextUpvoted);

      setQuestions((prev) => {
        const next = prev.map((q) => {
          if (q.id === questionId) {
            const newCount = hasUpvoted ? Math.max(0, q.upvotes_count - 1) : q.upvotes_count + 1;
            dbUpdateQuestionUpvotes(questionId, newCount);
            if (channelManager) {
              channelManager.broadcast('question_upvote', {
                questionId,
                upvotesCount: newCount,
                voterSession: sessionId,
              });
            }
            return { ...q, upvotes_count: newCount };
          }
          return q;
        });

        if (channelManager) {
          channelManager.broadcast('question_list', next);
        }
        return next;
      });
    },
    [upvotedIds, channelManager, sessionId]
  );

  const submitQuestion = useCallback(
    (content: string) => {
      if (!content.trim()) return;

      const newQ: Question = {
        id: 'q_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
        room_id: currentRoomKey,
        author_name: userName,
        author_session_id: sessionId,
        content: content.trim(),
        upvotes_count: 1,
        status: 'pending',
        created_at: new Date().toISOString(),
      };

      const nextUpvoted = new Set(upvotedIds);
      nextUpvoted.add(newQ.id);
      persistUpvotes(nextUpvoted);

      dbInsertQuestion(newQ);

      setQuestions((prev) => {
        const next = [newQ, ...prev];
        if (channelManager) {
          channelManager.broadcast('question_list', next);
        }
        return next;
      });
    },
    [userName, sessionId, upvotedIds, channelManager, currentRoomKey]
  );

  const updateQuestionStatus = useCallback(
    (questionId: string, status: QuestionStatus) => {
      dbUpdateQuestionStatus(questionId, status);

      setQuestions((prev) => {
        const next = prev.map((q) => {
          if (status === 'spotlight') {
            if (q.id === questionId) return { ...q, status: 'spotlight' as QuestionStatus };
            if (q.status === 'spotlight') return { ...q, status: 'pending' as QuestionStatus };
            return q;
          }
          if (q.id === questionId) return { ...q, status };
          return q;
        });

        if (channelManager) {
          channelManager.broadcast('question_list', next);
        }
        return next;
      });
    },
    [channelManager]
  );

  const spotlightNextInQueue = useCallback(() => {
    const pendingQuestions = questions
      .filter((q) => q.status === 'pending')
      .sort((a, b) => b.upvotes_count - a.upvotes_count);

    if (pendingQuestions.length > 0) {
      updateQuestionStatus(pendingQuestions[0].id, 'spotlight');
    }
  }, [questions, updateQuestionStatus]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['input', 'textarea'].includes((e.target as HTMLElement)?.tagName?.toLowerCase())) {
        return;
      }
      if (e.key.toLowerCase() === 's' && userRole === 'host') {
        e.preventDefault();
        spotlightNextInQueue();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [spotlightNextInQueue, userRole]);

  const spotlightQuestion = useMemo(() => {
    return questions.find((q) => q.status === 'spotlight') || null;
  }, [questions]);

  const filteredQuestions = useMemo(() => {
    let list = [...questions];

    if (activeTab === 'spotlight') {
      return list.filter((q) => q.status === 'spotlight');
    }
    if (activeTab === 'answered') {
      return list.filter((q) => q.status === 'answered');
    }
    if (activeTab === 'recent') {
      return list
        .filter((q) => q.status !== 'dismissed')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return list
      .filter((q) => q.status !== 'dismissed')
      .sort((a, b) => {
        if (a.status === 'spotlight') return -1;
        if (b.status === 'spotlight') return 1;
        return b.upvotes_count - a.upvotes_count;
      });
  }, [questions, activeTab]);

  return {
    questions,
    filteredQuestions,
    spotlightQuestion,
    upvotedIds,
    activeTab,
    setActiveTab,
    toggleUpvote,
    submitQuestion,
    updateQuestionStatus,
    spotlightNextInQueue,
  };
}
