import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { playClickSound } from '../../lib/soundFx';

interface FAQItem {
  q: string;
  a: string;
}

export const LandingFAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs: FAQItem[] = [
    {
      q: 'Do attendees need to download an app or register an account?',
      a: 'Never. Attendees join by scanning the presenter’s on-screen QR code or clicking a shared link in any mobile browser (Safari, Chrome, Firefox). With 1-tap guest access, attendees choose an alias and enter the arena immediately without entering passwords or installing anything.',
    },
    {
      q: 'How fast is the synchronization between the host and attendee screens?',
      a: 'Synchronization occurs in under 40 milliseconds globally. Powered by lightweight WebSockets broadcast channels with client-side mesh failover, questions, polls, votes, and reactions propagate instantaneously across thousands of devices simultaneously.',
    },
    {
      q: 'How do AI remediation polls and session summaries work?',
      a: 'When an audience struggles with a specific quiz question, our built-in Mesh AI engine automatically drafts a follow-up remediation poll or targeted takeaway. At the end of your masterclass, you can generate a complete executive recap report in Markdown with 1 click.',
    },
    {
      q: 'Can presenters export session analytics and audience reports?',
      a: 'Absolutely. Presenters can download complete session analytics, quiz score distributions, consensus breakdowns, and AI-generated executive summaries as Markdown, CSV, or JSON immediately following any keynote or workshop.',
    },
    {
      q: 'How does Q&A safeguard moderation protect the stage?',
      a: 'SketchCast incorporates automated AI content moderation. Submissions are screened in real time against configurable safeguard rules. Attendees with repeated violations receive automated warnings and strikes (up to 3 strikes), giving moderators full peace of mind.',
    },
    {
      q: 'Can presenters sponsor keynotes or embed affiliate tools?',
      a: 'Yes. Presenters can configure custom sponsor banners, call-to-actions, and recommended tools in the Room Settings and User Profile hub, making it easy to monetize workshops and direct attendees to technical resources.',
    },
  ];

  const handleToggle = (idx: number) => {
    playClickSound();
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 font-sans">
      <div className="text-center mb-12 space-y-4">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-lime/30 border border-lime text-ink font-mono text-xs font-bold">
          <HelpCircle className="w-3.5 h-3.5 text-orange" />
          <span className="uppercase tracking-wider">FREQUENTLY ASKED QUESTIONS</span>
        </div>

        <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-ink">
          Clear answers for presenters & attendees.
        </h2>
      </div>

      <div className="space-y-3 font-sans">
        {faqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className="bg-paper-card border border-hairline rounded-2xl overflow-hidden transition-all shadow-subtle hover:border-ink/20"
            >
              <button
                type="button"
                onClick={() => handleToggle(idx)}
                className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 cursor-pointer"
                aria-expanded={isOpen}
              >
                <span className="font-serif text-base sm:text-lg font-bold text-ink leading-snug">
                  {faq.q}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-muted transition-transform shrink-0 ${
                    isOpen ? 'rotate-180 text-orange' : ''
                  }`}
                />
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 sm:px-5 pb-5 pt-1 text-xs sm:text-sm text-muted leading-relaxed border-t border-hairline">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
};
