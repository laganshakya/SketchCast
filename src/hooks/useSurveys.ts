import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Survey, SurveyResponse, SurveyQuestion } from '../types';
import { RealtimeChannelManager } from '../lib/realtime/channelManager';
import { synthesizeSurveySentimentAndTakeaways } from '../lib/meshApi';
import { playPopSound, playWhoosh, playFanfare } from '../lib/soundFx';
import {
  dbFetchSurveys,
  dbUpsertSurvey,
  dbFetchSurveyResponses,
  dbInsertSurveyResponse,
} from '../lib/supabase';

export const PRESET_SURVEY_TEMPLATES: Omit<Survey, 'id' | 'room_id' | 'created_at' | 'responses_count' | 'status' | 'author_name'>[] = [
  {
    title: 'SESSION & SPEAKER FEEDBACK',
    description: 'Help the speaker calibrate pacing, depth, and presentation clarity for future sessions.',
    questions: [
      {
        id: 'q_satisfaction',
        type: 'rating',
        title: 'Overall session technical depth and value',
        maxRating: 5,
        required: true,
      },
      {
        id: 'q_pacing',
        type: 'choice',
        title: 'How was the presentation pace and complexity?',
        options: ['Too elementary / slow', 'Just right / well paced', 'A bit fast / dense', 'Need deeper hands-on code'],
        required: true,
      },
      {
        id: 'q_takeaway',
        type: 'text',
        title: 'What was your most valuable technical takeaway or architectural insight?',
        required: false,
      },
      {
        id: 'q_critique',
        type: 'text',
        title: 'What is one topic you would like explored in greater detail?',
        required: false,
      },
    ],
  },
  {
    title: 'WORKSHOP USABILITY & HANDS-ON CHECK',
    description: 'Evaluate the setup ease, architecture flow, and clarity of the live interactive examples.',
    questions: [
      {
        id: 'q_setup',
        type: 'rating',
        title: 'Ease of following along with live whiteboard & voting concepts',
        maxRating: 5,
        required: true,
      },
      {
        id: 'q_stack',
        type: 'choice',
        title: 'Which live interactive feature added the most value today?',
        options: ['Real-time Architecture Quizzes', 'Live Audience Polls', 'Safe Guarded Q&A Feed', 'Masterclass Pass & Credential'],
        required: true,
      },
      {
        id: 'q_feedback',
        type: 'text',
        title: 'Any blockers, latency quirks, or UI improvements you suggest?',
        required: false,
      },
    ],
  },
  {
    title: 'TECH STACK PULSE CHECK',
    description: 'Quick poll of production stack choices and distributed system challenges across the audience.',
    questions: [
      {
        id: 'q_maturity',
        type: 'choice',
        title: 'What is your primary production deployment target today?',
        options: ['Kubernetes / Containers', 'Serverless / Cloud Run / Workers', 'Managed PaaS (Vercel/Fly)', 'Bare Metal / VMs'],
        required: true,
      },
      {
        id: 'q_scale_rating',
        type: 'rating',
        title: 'Confidence in your current distributed cache & database failover',
        maxRating: 5,
        required: true,
      },
      {
        id: 'q_challenge',
        type: 'text',
        title: 'What is the #1 scalability or consensus bottleneck your team faces?',
        required: false,
      },
    ],
  },
];

export function useSurveys(
  roomCode: string,
  sessionId: string,
  userName: string,
  channelManager: RealtimeChannelManager | null
) {
  const cleanRoomCode = (roomCode || 'SKT-789').toUpperCase().trim();
  const surveysKey = `sketchcast_surveys_${cleanRoomCode}`;
  const responsesKey = `sketchcast_survey_responses_${cleanRoomCode}`;
  const submittedKey = `sketchcast_submitted_surveys_${cleanRoomCode}_${sessionId}`;

  // 1. Initial State Load
  const [surveys, setSurveys] = useState<Survey[]>(() => {
    try {
      const stored = localStorage.getItem(surveysKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Filter out legacy default/demo surveys
          return parsed.filter((s) => !s.id.endsWith('_default') && s.id !== `survey_${cleanRoomCode}_default`);
        }
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [responsesBySurvey, setResponsesBySurvey] = useState<Record<string, SurveyResponse[]>>(() => {
    try {
      const stored = localStorage.getItem(responsesKey);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const [userSubmittedIds, setUserSubmittedIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(submittedKey);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [incomingSurveyAlert, setIncomingSurveyAlert] = useState<{
    surveyId: string;
    surveyTitle: string;
    launchedBy: string;
  } | null>(null);

  const [isSummarizing, setIsSummarizing] = useState<string | null>(null);

  // When roomCode switches, immediately load or reset surveys, responses, and submitted state for the new room
  const [prevRoomKey, setPrevRoomKey] = useState(cleanRoomCode);
  if (prevRoomKey !== cleanRoomCode) {
    setPrevRoomKey(cleanRoomCode);
    try {
      const stored = localStorage.getItem(surveysKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setSurveys(parsed.filter((s) => !s.id.endsWith('_default') && s.id !== `survey_${cleanRoomCode}_default`));
        } else {
          setSurveys([]);
        }
      } else {
        setSurveys([]);
      }

      const storedResponses = localStorage.getItem(responsesKey);
      setResponsesBySurvey(storedResponses ? JSON.parse(storedResponses) : {});

      const storedSubmitted = localStorage.getItem(submittedKey);
      setUserSubmittedIds(storedSubmitted ? new Set(JSON.parse(storedSubmitted)) : new Set());
    } catch {
      setSurveys([]);
      setResponsesBySurvey({});
      setUserSubmittedIds(new Set());
    }
  }

  // Load from Supabase DB on initialization and room change
  useEffect(() => {
    dbFetchSurveys(cleanRoomCode).then((remoteSurveys) => {
      if (remoteSurveys) {
        const clean = remoteSurveys.filter((s) => !s.id.endsWith('_default') && s.id !== `survey_${cleanRoomCode}_default`);
        setSurveys(clean);
      }
    });
    dbFetchSurveyResponses(cleanRoomCode).then((remoteResponses) => {
      if (remoteResponses) {
        setResponsesBySurvey(remoteResponses);
      }
    });
  }, [cleanRoomCode]);

  // 2. LocalStorage Persistence
  useEffect(() => {
    try {
      localStorage.setItem(surveysKey, JSON.stringify(surveys));
    } catch {
      // ignore
    }
  }, [surveys, surveysKey]);

  useEffect(() => {
    try {
      localStorage.setItem(responsesKey, JSON.stringify(responsesBySurvey));
    } catch {
      // ignore
    }
  }, [responsesBySurvey, responsesKey]);

  useEffect(() => {
    try {
      localStorage.setItem(submittedKey, JSON.stringify(Array.from(userSubmittedIds)));
    } catch {
      // ignore
    }
  }, [userSubmittedIds, submittedKey]);

  // 3. Realtime Event Listeners
  useEffect(() => {
    if (!channelManager) return;

    const unSurveyList = channelManager.on('survey_list_update', (incomingList) => {
      if (Array.isArray(incomingList)) {
        setSurveys(incomingList);
      }
    });

    const unResponse = channelManager.on('survey_response_submit', (payload) => {
      const { surveyId, response } = payload;
      setResponsesBySurvey((prev) => {
        const list = prev[surveyId] || [];
        // Prevent duplicate session responses
        if (list.some((r) => r.session_id === response.session_id)) {
          return prev;
        }
        const updated = [...list, response];
        return {
          ...prev,
          [surveyId]: updated,
        };
      });

      setSurveys((prev) =>
        prev.map((s) => {
          if (s.id === surveyId) {
            return {
              ...s,
              responses_count: (s.responses_count || 0) + 1,
            };
          }
          return s;
        })
      );
    });

    const unAlert = channelManager.on('survey_launched_alert', (payload) => {
      if (!userSubmittedIds.has(payload.surveyId)) {
        playPopSound();
        setIncomingSurveyAlert({
          surveyId: payload.surveyId,
          surveyTitle: payload.surveyTitle,
          launchedBy: payload.launchedBy,
        });
      }
    });

    return () => {
      unSurveyList();
      unResponse();
      unAlert();
    };
  }, [channelManager, userSubmittedIds]);

  // 4. Survey Creation
  const createSurvey = useCallback(
    (data: { title: string; description: string; questions: SurveyQuestion[]; launchImmediately?: boolean }) => {
      const newSurvey: Survey = {
        id: `survey_${cleanRoomCode}_${Date.now()}`,
        room_id: cleanRoomCode,
        title: data.title.trim() || 'NEW AUDIENCE SURVEY',
        description: data.description.trim() || 'Please share your technical feedback.',
        questions: data.questions,
        status: data.launchImmediately ? 'active' : 'draft',
        created_at: new Date().toISOString(),
        responses_count: 0,
        author_name: userName,
      };

      setSurveys((prev) => {
        // If launching immediately, close others or keep active
        const updated = [newSurvey, ...prev];
        if (channelManager) {
          channelManager.broadcast('survey_list_update', updated);
          if (data.launchImmediately) {
            channelManager.broadcast('survey_launched_alert', {
              surveyId: newSurvey.id,
              surveyTitle: newSurvey.title,
              launchedBy: userName,
              timestamp: Date.now(),
            });
          }
        }
        return updated;
      });

      // Persist to Supabase DB
      dbUpsertSurvey(newSurvey);

      playPopSound();
      return newSurvey;
    },
    [cleanRoomCode, userName, channelManager]
  );

  // 5. Launch Survey
  const launchSurvey = useCallback(
    (surveyId: string) => {
      setSurveys((prev) => {
        const updated = prev.map((s) => (s.id === surveyId ? { ...s, status: 'active' as const } : s));
        const target = updated.find((s) => s.id === surveyId);
        if (target) {
          dbUpsertSurvey(target);
        }
        if (channelManager) {
          channelManager.broadcast('survey_list_update', updated);
          if (target) {
            channelManager.broadcast('survey_launched_alert', {
              surveyId: target.id,
              surveyTitle: target.title,
              launchedBy: userName,
              timestamp: Date.now(),
            });
          }
        }
        return updated;
      });
      playFanfare();
    },
    [channelManager, userName]
  );

  // 6. Close Survey
  const closeSurvey = useCallback(
    (surveyId: string) => {
      setSurveys((prev) => {
        const updated = prev.map((s) => (s.id === surveyId ? { ...s, status: 'closed' as const } : s));
        const target = updated.find((s) => s.id === surveyId);
        if (target) {
          dbUpsertSurvey(target);
        }
        if (channelManager) {
          channelManager.broadcast('survey_list_update', updated);
        }
        return updated;
      });
      playWhoosh();
    },
    [channelManager]
  );

  // 7. Delete Survey
  const deleteSurvey = useCallback(
    (surveyId: string) => {
      setSurveys((prev) => {
        const updated = prev.filter((s) => s.id !== surveyId);
        if (channelManager) {
          channelManager.broadcast('survey_list_update', updated);
        }
        return updated;
      });
    },
    [channelManager]
  );

  // 8. Submit Response
  const submitResponse = useCallback(
    (surveyId: string, answers: Record<string, any>) => {
      if (userSubmittedIds.has(surveyId)) return;

      const response: SurveyResponse = {
        id: `resp_${surveyId}_${sessionId}_${Date.now()}`,
        survey_id: surveyId,
        room_id: cleanRoomCode,
        session_id: sessionId,
        attendee_name: userName,
        answers,
        submitted_at: Date.now(),
      };

      // Mark user as submitted
      setUserSubmittedIds((prev) => {
        const next = new Set(prev);
        next.add(surveyId);
        return next;
      });

      // Update local responses
      setResponsesBySurvey((prev) => {
        const list = prev[surveyId] || [];
        return {
          ...prev,
          [surveyId]: [...list, response],
        };
      });

      // Update survey count
      setSurveys((prev) => {
        const updated = prev.map((s) => {
          if (s.id === surveyId) {
            return {
              ...s,
              responses_count: (s.responses_count || 0) + 1,
            };
          }
          return s;
        });

        if (channelManager) {
          channelManager.broadcast('survey_response_submit', {
            surveyId,
            response,
          });
          channelManager.broadcast('survey_list_update', updated);
        }

        return updated;
      });

      playFanfare();
      setIncomingSurveyAlert((prev) => (prev?.surveyId === surveyId ? null : prev));

      // Persist response to Supabase DB
      dbInsertSurveyResponse(response);
    },
    [userSubmittedIds, cleanRoomCode, sessionId, userName, channelManager]
  );

  // 9. Generate AI Summary & Takeaways
  const generateAISummary = useCallback(
    async (surveyId: string) => {
      const targetSurvey = surveys.find((s) => s.id === surveyId);
      if (!targetSurvey) return null;

      const responses = responsesBySurvey[surveyId] || [];
      if (responses.length === 0) return null;

      setIsSummarizing(surveyId);
      try {
        const aiResult = await synthesizeSurveySentimentAndTakeaways(
          targetSurvey.title,
          targetSurvey.questions,
          responses
        );

        const summary = {
          sentiment: aiResult.sentiment,
          score: aiResult.score,
          takeaways: aiResult.takeaways,
          keyQuotes: aiResult.keyQuotes,
          generatedAt: Date.now(),
        };

        setSurveys((prev) => {
          const updated = prev.map((s) => (s.id === surveyId ? { ...s, aiSummary: summary } : s));
          if (channelManager) {
            channelManager.broadcast('survey_list_update', updated);
          }
          return updated;
        });

        // Persist AI summary to Supabase DB
        dbUpsertSurvey({ ...targetSurvey, aiSummary: summary });

        playPopSound();
        return summary;
      } catch (err) {
        console.warn('[useSurveys] AI Summary failed:', err);
        return null;
      } finally {
        setIsSummarizing(null);
      }
    },
    [surveys, responsesBySurvey, channelManager]
  );

  // 10. Export Responses (JSON / CSV)
  const exportResponses = useCallback(
    (surveyId: string, format: 'json' | 'csv' = 'json') => {
      const target = surveys.find((s) => s.id === surveyId);
      const responses = responsesBySurvey[surveyId] || [];
      if (!target) return;

      if (format === 'json') {
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({ survey: target, responses }, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute('href', dataStr);
        downloadAnchor.setAttribute('download', `${target.title.toLowerCase().replace(/\s+/g, '_')}_responses.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
      } else {
        // CSV
        const headers = ['Attendee Name', 'Submitted At', ...target.questions.map((q) => `"${q.title.replace(/"/g, '""')}"`)];
        const rows = responses.map((r) => [
          `"${r.attendee_name.replace(/"/g, '""')}"`,
          new Date(r.submitted_at).toISOString(),
          ...target.questions.map((q) => {
            const val = r.answers[q.id];
            if (val === undefined || val === null) return '""';
            return `"${String(val).replace(/"/g, '""')}"`;
          }),
        ]);

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `${target.title.toLowerCase().replace(/\s+/g, '_')}_responses.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    },
    [surveys, responsesBySurvey]
  );

  // Active survey for attendee quick-take
  const activeSurvey = useMemo(() => {
    return surveys.find((s) => s.status === 'active') || null;
  }, [surveys]);

  return {
    surveys,
    activeSurvey,
    responsesBySurvey,
    userSubmittedIds,
    incomingSurveyAlert,
    dismissSurveyAlert: () => setIncomingSurveyAlert(null),
    isSummarizing,
    createSurvey,
    launchSurvey,
    closeSurvey,
    deleteSurvey,
    submitResponse,
    generateAISummary,
    exportResponses,
  };
}
