import { useState } from 'react';
import { useRoomSession } from './hooks/useRoomSession';
import { useQuizEngine } from './hooks/useQuizEngine';
import { usePollsEngine } from './hooks/usePollsEngine';
import { useQAFeed } from './hooks/useQAFeed';
import { AppHeader } from './components/common/AppHeader';
import { QuizArena } from './components/quiz/QuizArena';
import { QuizHostPanel } from './components/quiz/QuizHostPanel';
import { LeaderboardPodium } from './components/quiz/LeaderboardPodium';
import { LivePollsView } from './components/polls/LivePollsView';
import { CreatePollModal } from './components/polls/CreatePollModal';
import { QuestionFeed } from './components/qa/QuestionFeed';
import { QuestionModal } from './components/qa/QuestionModal';
import { QRCodeModal } from './components/common/QRCodeModal';
import { Zap, Vote, HelpCircle, Trophy } from 'lucide-react';

export function App() {
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isAskModalOpen, setIsAskModalOpen] = useState(false);
  const [isCreatePollModalOpen, setIsCreatePollModalOpen] = useState(false);

  // 1. Room Session & Presence
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
    channelManager,
  } = useRoomSession('SKT-789');

  // 2. Live Quiz Engine
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
  });

  // 3. Live Polls Engine
  const {
    polls,
    userVotes,
    createPoll,
    voteOnPoll,
  } = usePollsEngine({
    channelManager,
    sessionId,
    userName,
  });

  // 4. Live Q&A Feed Engine
  const {
    filteredQuestions,
    upvotedIds,
    activeTab: qaFilterTab,
    setActiveTab: setQAFilterTab,
    toggleUpvote,
    submitQuestion,
    updateQuestionStatus,
  } = useQAFeed({
    channelManager,
    sessionId,
    userName,
    userRole,
  });

  const activeViewerCount = Math.max(1, attendees.length);

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
        onOpenQRCode={() => setIsQRModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-y-auto relative p-2 sm:p-4 md:p-5 pb-20 md:pb-5">
        {/* TAB 1: Live Quiz Arena */}
        {activeTab === 'quiz' && (
          <div className="flex-1 flex flex-col lg:flex-row gap-4 max-w-7xl mx-auto w-full h-full">
            <div className="flex-1 flex flex-col overflow-y-auto">
              <QuizArena
                quizState={quizState}
                timeRemaining={timeRemaining}
                userStreak={userStreak}
                onSelectOption={selectOption}
                onRevealAnswer={revealAnswer}
                onNextQuestion={() => {}}
                isHost={userRole === 'host'}
              />
            </div>

            {/* Host Quiz Launcher & Pack Selector (Shown if Host) */}
            {userRole === 'host' && (
              <div className="w-full lg:w-96 flex-shrink-0 flex flex-col h-full">
                <QuizHostPanel
                  onStartQuiz={startQuizRound}
                  activeQuestionId={quizState.question?.id}
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
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 inset-x-0 h-16 bg-[#11131B] border-t-2 border-black px-2 flex items-center justify-around z-40">
        <button
          onClick={() => setActiveTab('quiz')}
          className={`flex-1 py-1.5 flex flex-col items-center justify-center font-mono text-[10px] font-black uppercase transition-all ${
            activeTab === 'quiz'
              ? 'bg-[#FFE600] text-black border-2 border-black brutal-shadow-sm'
              : 'text-slate-400'
          }`}
        >
          <Zap className="w-4 h-4 mb-0.5" />
          <span>QUIZ</span>
        </button>

        <button
          onClick={() => setActiveTab('polls')}
          className={`flex-1 py-1.5 flex flex-col items-center justify-center font-mono text-[10px] font-black uppercase transition-all ${
            activeTab === 'polls'
              ? 'bg-[#00F0FF] text-black border-2 border-black brutal-shadow-sm'
              : 'text-slate-400'
          }`}
        >
          <Vote className="w-4 h-4 mb-0.5" />
          <span>POLLS</span>
        </button>

        <button
          onClick={() => setActiveTab('qa')}
          className={`flex-1 py-1.5 flex flex-col items-center justify-center font-mono text-[10px] font-black uppercase transition-all ${
            activeTab === 'qa'
              ? 'bg-[#FF2A6D] text-white border-2 border-black brutal-shadow-sm'
              : 'text-slate-400'
          }`}
        >
          <HelpCircle className="w-4 h-4 mb-0.5" />
          <span>Q&A</span>
        </button>

        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`flex-1 py-1.5 flex flex-col items-center justify-center font-mono text-[10px] font-black uppercase transition-all ${
            activeTab === 'leaderboard'
              ? 'bg-[#00F59B] text-black border-2 border-black brutal-shadow-sm'
              : 'text-slate-400'
          }`}
        >
          <Trophy className="w-4 h-4 mb-0.5" />
          <span>SCORES</span>
        </button>
      </div>

      {/* Modals */}
      <QRCodeModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        roomCode={room.code}
        roomTitle={room.title}
        activeViewerCount={activeViewerCount}
      />

      <CreatePollModal
        isOpen={isCreatePollModalOpen}
        onClose={() => setIsCreatePollModalOpen(false)}
        onCreatePoll={createPoll}
      />

      <QuestionModal
        isOpen={isAskModalOpen}
        onClose={() => setIsAskModalOpen(false)}
        onSubmit={submitQuestion}
        userName={userName}
      />
    </div>
  );
}

export default App;
