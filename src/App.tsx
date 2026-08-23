import { useState, useMemo } from 'react';
import { useRoomSession } from './hooks/useRoomSession';
import { useQuizEngine } from './hooks/useQuizEngine';
import { usePollsEngine } from './hooks/usePollsEngine';
import { useQAFeed } from './hooks/useQAFeed';
import { LandingAuthPage } from './components/auth/LandingAuthPage';
import { AppHeader } from './components/common/AppHeader';
import { QuizArena } from './components/quiz/QuizArena';
import { QuizHostPanel } from './components/quiz/QuizHostPanel';
import { LeaderboardPodium } from './components/quiz/LeaderboardPodium';
import { LivePollsView } from './components/polls/LivePollsView';
import { CreatePollModal } from './components/polls/CreatePollModal';
import { QuestionFeed } from './components/qa/QuestionFeed';
import { QuestionModal } from './components/qa/QuestionModal';
import { QRCodeModal } from './components/common/QRCodeModal';
import { AuthModal } from './components/common/AuthModal';
import { RoomsAdminView } from './components/rooms/RoomsAdminView';
import { ChangeRoomModal } from './components/rooms/ChangeRoomModal';
import { ActiveAttendeesModal } from './components/common/ActiveAttendeesModal';
import { AISettingsModal } from './components/common/AISettingsModal';
import { AISessionReportModal } from './components/common/AISessionReportModal';
import { Zap, Vote, HelpCircle, Trophy, Layers, Sparkles, X } from 'lucide-react';

export function App() {
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [qrRoomData, setQrRoomData] = useState<{ code: string; title: string } | null>(null);
  const [isAskModalOpen, setIsAskModalOpen] = useState(false);
  const [isCreatePollModalOpen, setIsCreatePollModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isChangeRoomModalOpen, setIsChangeRoomModalOpen] = useState(false);
  const [isActiveAttendeesModalOpen, setIsActiveAttendeesModalOpen] = useState(false);
  const [isAISettingsModalOpen, setIsAISettingsModalOpen] = useState(false);
  const [isAISessionReportModalOpen, setIsAISessionReportModalOpen] = useState(false);
  const [mobileHostQuizView, setMobileHostQuizView] = useState<'arena' | 'controls'>('arena');

  // 1. Dynamic Room Session, Presence & Supabase Auth User
  const {
    sessionId,
    userName,
    setUserName,
    userRole,
    setUserRole,
    room,
    activeTab,
    setActiveTab,
    attendees,
    currentUser,
    isAuthenticated,
    handleAuthenticated,
    handleSignOut,
    channelManager,
    promotionToast,
    setPromotionToast,
    promoteToAdmin,
    demoteFromAdmin,
  } = useRoomSession('SKT-789');

  // 2. Live Quiz Engine (Isolated to room.code)
  const {
    quizState,
    leaderboard,
    timeRemaining,
    userStreak,
    startQuizRound,
    revealAnswer,
    selectOption,
  } = useQuizEngine({
    channelManager,
    sessionId,
    userName,
    userRole,
    roomCode: room.code,
  });

  // 3. Live Polls Engine (Isolated to room.code)
  const {
    polls,
    userVotes,
    createPoll,
    voteOnPoll,
    resetPoll,
    deletePoll,
    updatePollAIConsensus,
  } = usePollsEngine({
    channelManager,
    sessionId,
    userName,
    roomCode: room.code,
  });

  // 4. Live Q&A Feed Engine (Isolated to room.code)
  const {
    questions,
    filteredQuestions,
    upvotedIds,
    activeTab: qaFilterTab,
    setActiveTab: setQAFilterTab,
    toggleUpvote,
    submitQuestion,
    updateQuestionStatus,
    updateQuestionTalkingPoints,
  } = useQAFeed({
    channelManager,
    sessionId,
    userName,
    userRole,
    roomCode: room.code,
  });

  const activeViewerCount = Math.max(1, attendees.length);

  // Host quiz queue for AI report export
  const queuedQuizzes = useMemo(() => {
    try {
      const queueKey = `sketchcast_host_quiz_queue_${room.code.toUpperCase().trim()}`;
      const stored = localStorage.getItem(queueKey) || localStorage.getItem('sketchcast_host_quiz_queue');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, [room.code]);

  // Handle switching rooms from Rooms Admin Hub
  const handleSwitchRoom = (newCode: string, _newTitle?: string) => {
    handleAuthenticated(userName, userRole, newCode);
    setActiveTab('quiz');
  };

  const handleOpenQRForRoom = (code: string, title: string) => {
    setQrRoomData({ code, title });
    setIsQRModalOpen(true);
  };

  // Host action: Launch next queued question in sequence
  const handleNextQuestion = () => {
    try {
      const queueKey = `sketchcast_host_quiz_queue_${room.code.toUpperCase().trim()}`;
      const stored = localStorage.getItem(queueKey) || localStorage.getItem('sketchcast_host_quiz_queue');
      if (stored) {
        const queue = JSON.parse(stored);
        if (queue && Array.isArray(queue) && queue.length > 0) {
          const currentId = quizState.question?.id;
          const currentIndex = queue.findIndex((q: any) => q.id === currentId);
          if (currentIndex >= 0 && currentIndex + 1 < queue.length) {
            startQuizRound(queue[currentIndex + 1]);
            return;
          }
          if (currentIndex === -1) {
            startQuizRound(queue[0]);
          }
        }
      }
    } catch {
      // ignore
    }
  };

  // Check if there is a subsequent queued question
  const hasNextQuestion = useMemo(() => {
    try {
      const queueKey = `sketchcast_host_quiz_queue_${room.code.toUpperCase().trim()}`;
      const stored = localStorage.getItem(queueKey) || localStorage.getItem('sketchcast_host_quiz_queue');
      if (stored) {
        const queue = JSON.parse(stored);
        if (Array.isArray(queue) && queue.length > 0) {
          const currentId = quizState.question?.id;
          const currentIndex = queue.findIndex((q: any) => q.id === currentId);
          return currentIndex >= 0 && currentIndex + 1 < queue.length;
        }
      }
    } catch {
      // ignore
    }
    return false;
  }, [room.code, quizState.question?.id]);

  // If user is not authenticated, show the Landing / Auth Page
  if (!isAuthenticated) {
    return (
      <LandingAuthPage
        onAuthenticated={handleAuthenticated}
        roomCode={room.code}
      />
    );
  }

  // Once authenticated (or signed in as guest), show the Live Arena
  return (
    <div className="h-screen w-screen flex flex-col bg-retro-grid text-slate-100 overflow-hidden font-sans select-none">
      {/* Top Header */}
      <AppHeader
        room={room}
        userName={userName}
        setUserName={setUserName}
        userRole={userRole}
        setUserRole={setUserRole}
        activeViewerCount={activeViewerCount}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        questionsCount={filteredQuestions.length}
        onOpenQRCode={() => {
          setQrRoomData({ code: room.code, title: room.title });
          setIsQRModalOpen(true);
        }}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenChangeRoom={() => setIsChangeRoomModalOpen(true)}
        onOpenActiveAttendees={() => setIsActiveAttendeesModalOpen(true)}
        onOpenAISettings={() => setIsAISettingsModalOpen(true)}
        onOpenAISummary={() => setIsAISessionReportModalOpen(true)}
        onSignOut={handleSignOut}
        currentUser={currentUser}
      />

      {/* Floating Promotion Toast Notification */}
      {promotionToast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className="bg-neo-yellow text-black font-mono font-black text-xs px-4 py-2 border-3 border-black brutal-shadow-lg flex items-center space-x-2">
            <Sparkles className="w-4 h-4 fill-black shrink-0" />
            <span>{promotionToast}</span>
            <button
              onClick={() => setPromotionToast(null)}
              className="p-1 hover:bg-black hover:text-white transition-colors border border-black ml-2 cursor-pointer"
            >
              <X className="w-3 h-3 stroke-3" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-y-auto relative p-2 sm:p-4 md:p-5 pb-24 sm:pb-28 md:pb-6">
        {/* TAB 1: Live Quiz Arena */}
        {activeTab === 'quiz' && (
          <div className="flex-1 flex flex-col lg:flex-row gap-4 max-w-7xl mx-auto w-full h-full">
            {/* Mobile Host Switcher Bar (Screen < lg) */}
            {userRole === 'host' && (
              <div className="lg:hidden flex items-center justify-center p-1 bg-[#11131B] border-2 border-black font-mono text-xs font-black shrink-0 brutal-shadow-sm">
                <button
                  onClick={() => setMobileHostQuizView('arena')}
                  className={`flex-1 py-1.5 flex items-center justify-center space-x-1.5 uppercase transition-all cursor-pointer ${
                    mobileHostQuizView === 'arena'
                      ? 'bg-neo-yellow text-black border-2 border-black brutal-shadow-sm -translate-x-px -translate-y-px'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>LIVE ARENA</span>
                </button>
                <button
                  onClick={() => setMobileHostQuizView('controls')}
                  className={`flex-1 py-1.5 flex items-center justify-center space-x-1.5 uppercase transition-all cursor-pointer ${
                    mobileHostQuizView === 'controls'
                      ? 'bg-neo-mint text-black border-2 border-black brutal-shadow-sm -translate-x-px -translate-y-px'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>HOST CONTROLS</span>
                </button>
              </div>
            )}

            {/* Arena View */}
            <div
              className={`flex-1 flex flex-col overflow-y-auto ${
                userRole === 'host' && mobileHostQuizView === 'controls' ? 'hidden lg:flex' : 'flex'
              }`}
            >
              <QuizArena
                quizState={quizState}
                timeRemaining={timeRemaining}
                userStreak={userStreak}
                onSelectOption={selectOption}
                onRevealAnswer={revealAnswer}
                onNextQuestion={handleNextQuestion}
                hasNextQuestion={hasNextQuestion}
                onViewScores={() => setActiveTab('leaderboard')}
                isHost={userRole === 'host'}
              />
            </div>

            {/* Host Quiz Launcher & Pack Selector (Shown if Host) */}
            {userRole === 'host' && (
              <div
                className={`w-full lg:w-96 shrink-0 flex flex-col h-full ${
                  mobileHostQuizView === 'arena' ? 'hidden lg:flex' : 'flex'
                }`}
              >
                <QuizHostPanel
                  onStartQuiz={startQuizRound}
                  activeQuestionId={quizState.question?.id}
                  isRevealed={quizState.isRevealed}
                  roomCode={room.code}
                  onOpenAISettings={() => setIsAISettingsModalOpen(true)}
                />
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Live Polls & Voting */}
        {activeTab === 'polls' && (
          <div className="flex-1 flex flex-col overflow-y-auto">
            <LivePollsView
              polls={polls}
              userVotes={userVotes}
              onVote={voteOnPoll}
              onOpenCreatePoll={() => setIsCreatePollModalOpen(true)}
              onResetPoll={resetPoll}
              onDeletePoll={deletePoll}
              onUpdateAIConsensus={updatePollAIConsensus}
              onOpenAISettings={() => setIsAISettingsModalOpen(true)}
              isHost={userRole === 'host'}
            />
          </div>
        )}

        {/* TAB 3: Q&A Upvoting Feed */}
        {activeTab === 'qa' && (
          <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full h-full overflow-hidden">
            <QuestionFeed
              questions={filteredQuestions}
              upvotedIds={upvotedIds}
              onToggleUpvote={toggleUpvote}
              onStatusChange={updateQuestionStatus}
              onUpdateTalkingPoints={updateQuestionTalkingPoints}
              onOpenAISettings={() => setIsAISettingsModalOpen(true)}
              activeTab={qaFilterTab}
              setActiveTab={setQAFilterTab}
              onOpenAskModal={() => setIsAskModalOpen(true)}
              isHost={userRole === 'host'}
            />
          </div>
        )}

        {/* TAB 4: Leaderboard Podium */}
        {activeTab === 'leaderboard' && (
          <div className="flex-1 flex flex-col overflow-y-auto">
            <LeaderboardPodium leaderboard={leaderboard} />
          </div>
        )}

        {/* TAB 5: Rooms Admin Management */}
        {activeTab === 'rooms' && (
          <div className="flex-1 flex flex-col overflow-y-auto">
            <RoomsAdminView
              currentRoomCode={room.code}
              onSwitchRoom={handleSwitchRoom}
              onOpenQRCodeForRoom={handleOpenQRForRoom}
              onOpenAISummary={() => setIsAISessionReportModalOpen(true)}
              onOpenAISettings={() => setIsAISettingsModalOpen(true)}
              userName={userName}
              currentUser={currentUser}
            />
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 inset-x-0 h-16 bg-neo-card-darker border-t-2 border-black px-1.5 flex items-center justify-around z-40 pb-safe shadow-[0_-4px_16px_rgba(0,0,0,0.6)]">
        <button
          onClick={() => setActiveTab('quiz')}
          className={`flex-1 py-1.5 flex flex-col items-center justify-center font-mono text-[9px] xs:text-[10px] font-black uppercase transition-all cursor-pointer ${
            activeTab === 'quiz'
              ? 'bg-neo-yellow text-black border-2 border-black brutal-shadow-sm -translate-y-0.5'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Zap className="w-4 h-4 mb-0.5" />
          <span>QUIZ</span>
        </button>

        <button
          onClick={() => setActiveTab('polls')}
          className={`flex-1 py-1.5 flex flex-col items-center justify-center font-mono text-[9px] xs:text-[10px] font-black uppercase transition-all cursor-pointer ${
            activeTab === 'polls'
              ? 'bg-neo-pink text-white border-2 border-black brutal-shadow-sm -translate-y-0.5'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Vote className="w-4 h-4 mb-0.5" />
          <span>POLLS</span>
        </button>

        <button
          onClick={() => setActiveTab('qa')}
          className={`flex-1 py-1.5 flex flex-col items-center justify-center font-mono text-[9px] xs:text-[10px] font-black uppercase transition-all cursor-pointer relative ${
            activeTab === 'qa'
              ? 'bg-neo-cyan text-black border-2 border-black brutal-shadow-sm -translate-y-0.5'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <HelpCircle className="w-4 h-4 mb-0.5" />
          <span>Q&A</span>
          {filteredQuestions.length > 0 && (
            <span className="absolute top-1 right-2 w-2 h-2 bg-neo-yellow rounded-full animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`flex-1 py-1.5 flex flex-col items-center justify-center font-mono text-[9px] xs:text-[10px] font-black uppercase transition-all cursor-pointer ${
            activeTab === 'leaderboard'
              ? 'bg-neo-mint text-black border-2 border-black brutal-shadow-sm -translate-y-0.5'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Trophy className="w-4 h-4 mb-0.5" />
          <span>SCORES</span>
        </button>

        {userRole === 'host' && (
          <button
            onClick={() => setActiveTab('rooms')}
            className={`flex-1 py-1.5 flex flex-col items-center justify-center font-mono text-[9px] xs:text-[10px] font-black uppercase transition-all cursor-pointer ${
              activeTab === 'rooms'
                ? 'bg-neo-yellow text-black border-2 border-black brutal-shadow-sm -translate-y-0.5'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4 mb-0.5" />
            <span>ROOMS</span>
          </button>
        )}
      </div>

      {/* Modals */}
      <QRCodeModal
        isOpen={isQRModalOpen}
        onClose={() => {
          setIsQRModalOpen(false);
          setQrRoomData(null);
        }}
        roomCode={qrRoomData?.code || room.code}
        roomTitle={qrRoomData?.title || room.title}
        activeViewerCount={activeViewerCount}
      />

      <CreatePollModal
        isOpen={isCreatePollModalOpen}
        onClose={() => setIsCreatePollModalOpen(false)}
        onCreatePoll={createPoll}
        onOpenAISettings={() => setIsAISettingsModalOpen(true)}
      />

      <QuestionModal
        isOpen={isAskModalOpen}
        onClose={() => setIsAskModalOpen(false)}
        onSubmit={submitQuestion}
        userName={userName}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        userName={userName}
        setUserName={setUserName}
      />

      <ChangeRoomModal
        isOpen={isChangeRoomModalOpen}
        onClose={() => setIsChangeRoomModalOpen(false)}
        onSwitchRoom={handleSwitchRoom}
        currentRoomCode={room.code}
        currentUser={currentUser}
        userName={userName}
        onOpenRoomsHub={() => setActiveTab('rooms')}
      />

      <ActiveAttendeesModal
        isOpen={isActiveAttendeesModalOpen}
        onClose={() => setIsActiveAttendeesModalOpen(false)}
        attendees={attendees}
        currentSessionId={sessionId}
        isHost={userRole === 'host'}
        roomCode={room.code}
        onPromoteToAdmin={promoteToAdmin}
        onDemoteFromAdmin={demoteFromAdmin}
        onRefresh={() => channelManager?.pingPresence()}
      />

      <AISettingsModal
        isOpen={isAISettingsModalOpen}
        onClose={() => setIsAISettingsModalOpen(false)}
      />

      <AISessionReportModal
        isOpen={isAISessionReportModalOpen}
        onClose={() => setIsAISessionReportModalOpen(false)}
        roomTitle={room.title}
        roomCode={room.code}
        totalAttendees={activeViewerCount}
        quizzes={queuedQuizzes}
        polls={polls}
        questions={questions}
        leaderboard={leaderboard}
        onOpenAISettings={() => setIsAISettingsModalOpen(true)}
      />
    </div>
  );
}

export default App;
