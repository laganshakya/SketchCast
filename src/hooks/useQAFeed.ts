import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Question, QuestionStatus } from '../types';
import { RealtimeChannelManager } from '../lib/realtime/channelManager';
import {
  dbFetchQuestions,
  dbInsertQuestion,
  dbUpdateQuestionUpvotes,
  dbUpdateQuestionStatus,
  dbUpdateQuestionTalkingPoints,
} from '../lib/supabase';

export function useQAFeed({
  channelManager,
  sessionId,
  userName,
  userRole,
  roomCode,
  appActiveTab,
}: {
  channelManager: RealtimeChannelManager | null;
  sessionId: string;
  userName: string;
  userRole: 'host' | 'attendee';
  roomCode: string;
  appActiveTab?: string;
}) {
  const currentRoomKey = (roomCode || 'SKT-789').toUpperCase().trim();
  const qaTabKey = `sketchcast_qa_active_tab_${currentRoomKey}`;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [upvotedIds, setUpvotedIds] = useState<Set<string>>(() => {
    try {
      const primary = localStorage.getItem(`sketchcast_upvotes_${sessionId}_${currentRoomKey}`);
      if (primary) return new Set(JSON.parse(primary));
      const fallback = localStorage.getItem(`sketchcast_upvotes_name_${encodeURIComponent(userName)}_${currentRoomKey}`);
      return fallback ? new Set(JSON.parse(fallback)) : new Set();
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

  const hostPointsKey = `sketchcast_host_qa_points_${currentRoomKey}`;

  const getStoredPoints = useCallback((): Record<string, string[]> => {
    try {
      const raw = localStorage.getItem(hostPointsKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }, [hostPointsKey]);

  const syncQuestionsFromDB = useCallback(() => {
    dbFetchQuestions(currentRoomKey).then((remoteQuestions) => {
      if (remoteQuestions) {
        const storedPoints = getStoredPoints();
        setQuestions(
          remoteQuestions.map((q) => ({
            ...q,
            aiTalkingPoints: q.aiTalkingPoints || storedPoints[q.id],
          }))
        );
      }
    });
  }, [currentRoomKey, getStoredPoints]);

  // Load from Supabase DB on initialization, roomCode change, and tab switch to 'qa'
  useEffect(() => {
    syncQuestionsFromDB();
  }, [currentRoomKey, appActiveTab, syncQuestionsFromDB]);

  // Realtime synchronization
  useEffect(() => {
    if (!channelManager) return;

    const unQuestions = channelManager.on('question_list', (updatedQuestions) => {
      const storedPoints = getStoredPoints();
      setQuestions(
        updatedQuestions.map((q) => ({
          ...q,
          aiTalkingPoints: q.aiTalkingPoints || storedPoints[q.id],
        }))
      );
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
  }, [channelManager, getStoredPoints]);

  const persistUpvotes = useCallback((ids: Set<string>) => {
    setUpvotedIds(ids);
    try {
      const arr = JSON.stringify(Array.from(ids));
      localStorage.setItem(`sketchcast_upvotes_${sessionId}_${currentRoomKey}`, arr);
      localStorage.setItem(`sketchcast_upvotes_name_${encodeURIComponent(userName)}_${currentRoomKey}`, arr);
    } catch {
      // ignore
    }
  }, [sessionId, userName, currentRoomKey]);

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
    [upvotedIds, channelManager, sessionId, persistUpvotes]
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
    [userName, sessionId, upvotedIds, channelManager, currentRoomKey, persistUpvotes]
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

  // Host only: update AI speaker talking points on a question
  const updateQuestionTalkingPoints = useCallback(
    (questionId: string, points: string[]) => {
      try {
        const stored = getStoredPoints();
        stored[questionId] = points;
        localStorage.setItem(hostPointsKey, JSON.stringify(stored));
      } catch {
        // ignore
      }

      dbUpdateQuestionTalkingPoints(questionId, points);

      setQuestions((prev) => {
        const next = prev.map((q) =>
          q.id === questionId ? { ...q, aiTalkingPoints: points } : q
        );
        return next;
      });
    },
    [getStoredPoints, hostPointsKey]
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
    updateQuestionTalkingPoints,
    spotlightNextInQueue,
  };
}
