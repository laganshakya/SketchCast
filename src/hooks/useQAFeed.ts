import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Question, QuestionStatus } from '../types';
import { RealtimeChannelManager } from '../lib/realtime/channelManager';

const INITIAL_QUESTIONS: Question[] = [
  {
    id: 'q-1',
    room_id: 'room-demo-101',
    author_name: 'Sarah (Infra Eng)',
    author_session_id: 'user_sarah_1',
    content: 'How do you handle multi-region cache invalidation with sub-millisecond p99 latency without thundering herds?',
    upvotes_count: 42,
    status: 'spotlight',
    created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
  },
  {
    id: 'q-2',
    room_id: 'room-demo-101',
    author_name: 'Marcus DEV',
    author_session_id: 'user_marcus_2',
    content: 'Can you sketch the consensus flow for Raft vs Paxos when a leader network partition occurs?',
    upvotes_count: 38,
    status: 'pending',
    created_at: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
  },
  {
    id: 'q-3',
    room_id: 'room-demo-101',
    author_name: 'Elena Rostova',
    author_session_id: 'user_elena_3',
    content: 'What is the trade-off between LSM-Trees and B-Trees in write-heavy time-series telemetry databases?',
    upvotes_count: 27,
    status: 'pending',
    created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    id: 'q-4',
    room_id: 'room-demo-101',
    author_name: 'Dave (SecOps)',
    author_session_id: 'user_dave_4',
    content: 'How do zero-trust service meshes implement mTLS rotation without dropping active streaming TCP connections?',
    upvotes_count: 19,
    status: 'answered',
    created_at: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
  }
];

export function useQAFeed({
  channelManager,
  sessionId,
  userName,
  userRole,
}: {
  channelManager: RealtimeChannelManager | null;
  sessionId: string;
  userName: string;
  userRole: 'host' | 'attendee';
}) {
  const [questions, setQuestions] = useState<Question[]>(INITIAL_QUESTIONS);
  const [upvotedIds, setUpvotedIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(`sketchcast_upvotes_${sessionId}`);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [activeTab, setActiveTab] = useState<'top' | 'recent' | 'answered' | 'spotlight'>('top');

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
      localStorage.setItem(`sketchcast_upvotes_${sessionId}`, JSON.stringify(Array.from(ids)));
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
        room_id: 'room-demo-101',
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

      setQuestions((prev) => {
        const next = [newQ, ...prev];
        if (channelManager) {
          channelManager.broadcast('question_list', next);
        }
        return next;
      });
    },
    [userName, sessionId, upvotedIds, channelManager]
  );

  const updateQuestionStatus = useCallback(
    (questionId: string, status: QuestionStatus) => {
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
