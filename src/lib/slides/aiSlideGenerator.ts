import { callMeshChatCompletion } from '../meshApi';
import { searchWeb, scrapeUrlContent } from '../aiTools';
import type { SlideDeck, Slide, SlideType } from '../../types';

export interface AISlideGeneratorParams {
  topic: string;
  slideCount?: number;
  seniority?: 'beginner' | 'intermediate' | 'senior' | 'staff';
  includeQuiz?: boolean;
  includePoll?: boolean;
  webSearchEnabled?: boolean;
  sourceUrl?: string;
  authorName?: string;
  onStatusUpdate?: (status: string) => void;
}

export async function generateAISlideDeck(params: AISlideGeneratorParams): Promise<SlideDeck> {
  const {
    topic,
    slideCount = 5,
    seniority = 'senior',
    includeQuiz = true,
    includePoll = true,
    webSearchEnabled = true,
    sourceUrl,
    authorName = 'AI Presenter',
    onStatusUpdate,
  } = params;

  const count = Math.min(Math.max(slideCount, 3), 8);

  // --- Real-time Web Search & Scraping Grounding ---
  let researchGrounding = '';

  if (webSearchEnabled || sourceUrl) {
    try {
      const researchSnippets: string[] = [];

      // 1. Scrape provided documentation or article link if provided
      if (sourceUrl && sourceUrl.trim().startsWith('http')) {
        onStatusUpdate?.('Scraping documentation / source content...');
        const scraped = await scrapeUrlContent(sourceUrl.trim());
        if (scraped.markdown) {
          researchSnippets.push(
            `### Source Documentation: ${scraped.title} (${scraped.url})\n${scraped.markdown.slice(0, 1800)}`
          );
        }
      }

      // 2. Perform live web search for fresh 2025/2026 data
      if (webSearchEnabled) {
        onStatusUpdate?.('Searching web for latest benchmarks and real-time facts...');
        const searchResults = await searchWeb(`${topic} best practices architecture benchmarks 2025 2026`, 4);
        if (searchResults && searchResults.length > 0) {
          const formattedSearch = searchResults
            .map((r, i) => `[${i + 1}] ${r.title}: "${r.snippet}" (${r.url})`)
            .join('\n');
          researchSnippets.push(`### Live Web Search Insights:\n${formattedSearch}`);
        }
      }

      if (researchSnippets.length > 0) {
        researchGrounding = `\nREAL-TIME GROUNDING & FRESH WEB RESEARCH (Ground slides in these real facts and sources):\n${researchSnippets.join('\n\n')}\n`;
      }
    } catch {
      // Gracefully continue even if web search network fails
    }
  }

  onStatusUpdate?.('Synthesizing structured presentation deck with AI...');

  const prompt = `You are a world-class tech conference speaker and presentation designer.
Create an interactive, high-impact presentation slide deck on the topic: "${topic}".
Target Audience Seniority: ${seniority}.
Total Slides Required: exactly ${count} slides.
${researchGrounding}
Ensure the deck includes:
1. Slide 1 MUST be a "title" slide with an engaging title, subtitle, and badge.
2. Interleave rich content:
   - "content" slides with 3-4 impactful bullet points.
   - At least one "code" slide with realistic production code syntax and explanation (if technical).
   - At least one "stat" slide highlighting a high-impact metric or benchmark.
   - At least one "quote" slide with a thought-provoking industry quote.
   ${includePoll ? '- Exactly one "interactive_poll" slide with a pollQuestion and 4 pollOptions inviting the audience to vote.' : ''}
   ${includeQuiz ? '- Exactly one "interactive_quiz" slide with quizQuestion, 4 quizOptions, quizCorrectIndex (0-3), quizExplanation, and quizTimeLimitSeconds (20).' : ''}
3. Comprehensive, conversational "speakerNotes" for EVERY slide so the presenter knows exactly what to say.
4. Optional "imageUrl" (high quality Unsplash direct photo URL) and "imageCaption" where visual diagrams enhance the slide.
5. Optional "linkUrl" and "linkLabel" referencing documentation or sources.

Return ONLY a valid JSON object with this exact structure:
{
  "title": "Presentation Title",
  "subtitle": "Compelling Subtitle",
  "category": "Category name (e.g. System Design, AI, DevOps)",
  "description": "Brief description of the deck",
  "slides": [
    {
      "type": "title" | "content" | "code" | "stat" | "quote" | "interactive_quiz" | "interactive_poll",
      "title": "Slide Title",
      "subtitle": "Slide Subtitle (optional)",
      "badge": "Short badge text (optional)",
      "bullets": ["Bullet 1", "Bullet 2", "Bullet 3"],
      "codeSnippet": "// code here",
      "codeLanguage": "typescript",
      "codeExplanation": "Explanation callout",
      "statValue": "99.99%",
      "statLabel": "Metric description",
      "statTrend": "▲ 3.5x improvement",
      "quoteText": "Quote statement",
      "quoteAuthor": "Author name",
      "quoteRole": "Author title / company",
      "quizQuestion": "Question prompt",
      "quizOptions": ["Option A", "Option B", "Option C", "Option D"],
      "quizCorrectIndex": 1,
      "quizExplanation": "Why B is correct",
      "quizTimeLimitSeconds": 20,
      "pollQuestion": "Poll prompt",
      "pollOptions": ["Option A", "Option B", "Option C", "Option D"],
      "imageUrl": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80",
      "imageCaption": "System Diagram",
      "imagePosition": "right",
      "linkUrl": "https://...",
      "linkLabel": "Documentation",
      "speakerNotes": "What the presenter should say for 30-60 seconds on this slide."
    }
  ]
}`;

  try {
    const rawResponse = await callMeshChatCompletion(
      [
        {
          role: 'system',
          content: 'You are a professional presentation architect. Always respond with strict, well-formed JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      {
        temperature: 0.7,
        maxTokens: 3200,
        jsonMode: true,
      }
    );

    // Extract JSON from response
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI slide deck: No JSON found in response.');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed || !Array.isArray(parsed.slides) || parsed.slides.length === 0) {
      throw new Error('AI response did not contain a valid slides array.');
    }

    const validatedSlides: Slide[] = parsed.slides.map((s: any, idx: number) => {
      const type: SlideType = [
        'title',
        'content',
        'code',
        'stat',
        'quote',
        'interactive_quiz',
        'interactive_poll',
      ].includes(s.type)
        ? s.type
        : idx === 0
        ? 'title'
        : 'content';

      return {
        id: `ai-slide-${Date.now()}-${idx + 1}`,
        type,
        title: s.title || `Slide ${idx + 1}`,
        subtitle: s.subtitle,
        badge: s.badge || (type === 'title' ? 'AI MASTERCLASS' : undefined),
        bullets: Array.isArray(s.bullets) ? s.bullets.slice(0, 5) : undefined,
        codeSnippet: s.codeSnippet,
        codeLanguage: s.codeLanguage || 'typescript',
        codeExplanation: s.codeExplanation,
        statValue: s.statValue,
        statLabel: s.statLabel,
        statTrend: s.statTrend,
        quoteText: s.quoteText,
        quoteAuthor: s.quoteAuthor,
        quoteRole: s.quoteRole,
        imageUrl: s.imageUrl,
        imageCaption: s.imageCaption,
        imagePosition: s.imagePosition || 'right',
        linkUrl: s.linkUrl,
        linkLabel: s.linkLabel,
        quizQuestion: s.quizQuestion || s.title,
        quizOptions: Array.isArray(s.quizOptions) && s.quizOptions.length >= 2
          ? s.quizOptions
          : ['Option A', 'Option B', 'Option C', 'Option D'],
        quizCorrectIndex: typeof s.quizCorrectIndex === 'number' ? s.quizCorrectIndex : 0,
        quizExplanation: s.quizExplanation,
        quizTimeLimitSeconds: s.quizTimeLimitSeconds || 20,
        pollQuestion: s.pollQuestion || s.title,
        pollOptions: Array.isArray(s.pollOptions) && s.pollOptions.length >= 2
          ? s.pollOptions
          : ['Option A', 'Option B', 'Option C', 'Option D'],
        speakerNotes: s.speakerNotes || 'Walk through the core concepts presented on this slide.',
      };
    });

    const deck: SlideDeck = {
      id: `deck-ai-${Date.now()}`,
      title: parsed.title || topic,
      subtitle: parsed.subtitle || `AI-Generated Masterclass on ${topic}`,
      category: parsed.category || 'Architecture',
      description: parsed.description || `Generated slide deck on ${topic}`,
      authorName,
      slides: validatedSlides,
      currentSlideIndex: 0,
      isPresenting: false,
      theme: 'neo-brutalist',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return deck;
  } catch {
    // Fallback deck generator so user experience never fails
    return createEmergencyFallbackDeck(topic, authorName);
  }
}

function createEmergencyFallbackDeck(topic: string, authorName: string): SlideDeck {
  return {
    id: `deck-fallback-${Date.now()}`,
    title: topic,
    subtitle: 'Interactive Architecture Presentation',
    category: 'Engineering',
    authorName,
    theme: 'neo-brutalist',
    currentSlideIndex: 0,
    isPresenting: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    slides: [
      {
        id: `slide-f-1-${Date.now()}`,
        type: 'title',
        title: topic,
        subtitle: 'Foundations, Architecture & Scalable Execution',
        badge: 'PRESENTATION',
        speakerNotes: `Welcome everyone to this presentation on ${topic}. Let's dive into the core architecture.`,
      },
      {
        id: `slide-f-2-${Date.now()}`,
        type: 'content',
        title: 'Core Fundamentals',
        subtitle: 'Key pillars every architect must understand',
        bullets: [
          `Foundational concepts and trade-offs of ${topic}`,
          'Design patterns for maintainability, fault tolerance, and speed',
          'Production reliability benchmarks and telemetry monitoring',
          'Lessons learned from high-traffic deployments',
        ],
        speakerNotes: 'Walk through each key pillar and explain why they matter in production environments.',
      },
      {
        id: `slide-f-3-${Date.now()}`,
        type: 'interactive_poll',
        title: `Audience Poll: Your Experience with ${topic}`,
        subtitle: 'How mature is your team in implementing this technology?',
        speakerNotes: 'Pause for 30 seconds and let the audience vote on their devices.',
      },
      {
        id: `slide-f-4-${Date.now()}`,
        type: 'stat',
        title: 'Performance & Scale Trajectory',
        statValue: '10x',
        statLabel: 'Developer Velocity and Reliability Multiplier',
        statTrend: '▲ Reduced deployment risk through automated validation',
        speakerNotes: 'Discuss how adopting standard patterns yields exponential productivity dividends.',
      },
      {
        id: `slide-f-5-${Date.now()}`,
        type: 'interactive_quiz',
        title: 'Trivia Checkpoint',
        subtitle: 'Test your understanding before we wrap up',
        speakerNotes: 'Trigger the live quiz round now to reward attentive audience members.',
      },
    ],
  };
}
