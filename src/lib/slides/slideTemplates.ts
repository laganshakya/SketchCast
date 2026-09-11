import type { Slide, SlideDeck, SlideType } from '../../types';

export function createCustomBlankSlide(index: number = 1): Slide {
  const id = `slide-${Date.now()}-${index}`;
  return {
    id,
    type: 'custom',
    title: 'Custom Canvas Slide',
    subtitle: 'Designed in SketchCast Studio',
    canvasTheme: 'retro-grid',
    layout: 'single',
    verticalAlign: 'center',
    horizontalAlign: 'center',
    transition: 'arcade-pop',
    elementAnimation: 'pop-in',
    animationDuration: 0.45,
    animationDelay: 0.08,
    animationPreset: 'neo-arcade',
    blocks: [
      {
        id: `blk-${Date.now()}-1`,
        type: 'badge',
        badgeText: 'CUSTOM SLIDE CANVAS',
        badgeColor: 'bg-neo-yellow text-black',
        align: 'center',
      },
      {
        id: `blk-${Date.now()}-2`,
        type: 'heading',
        headingText: 'YOUR CUSTOM TITLE HERE',
        headingLevel: 'h1',
        headingColor: 'text-white',
        align: 'center',
      },
      {
        id: `blk-${Date.now()}-3`,
        type: 'text',
        bodyText: 'Start designing your slide! Add custom blocks, choose column layouts, and position elements freely.',
        align: 'center',
      },
    ],
    speakerNotes: 'Custom presentation slide with modular blocks.',
  };
}

export function createBlankSlide(type: SlideType = 'content', index: number = 1): Slide {
  const id = `slide-${Date.now()}-${index}`;
  switch (type) {
    case 'custom':
      return createCustomBlankSlide(index);
    case 'title':
      return {
        id,
        type: 'title',
        title: 'Enter Presentation Title',
        subtitle: 'Enter your compelling subtitle or presenter credentials',
        badge: 'KEYNOTE',
        canvasTheme: 'dark',
        speakerNotes: 'Introduce yourself and set the agenda for the session.',
      };
    case 'code':
      return {
        id,
        type: 'code',
        title: 'Implementation Deep Dive',
        subtitle: 'Production code pattern',
        canvasTheme: 'neo-card',
        codeLanguage: 'typescript',
        codeSnippet: `// Example Distributed Lock Implementation
async function acquireLock(resourceKey: string, ttlMs: number = 5000): Promise<boolean> {
  const token = crypto.randomUUID();
  const acquired = await redis.set(resourceKey, token, 'PX', ttlMs, 'NX');
  return acquired === 'OK';
}`,
        codeExplanation: 'Atomic set with NX flag prevents race conditions across worker nodes.',
        speakerNotes: 'Walk through line by line highlighting the atomic guarantees.',
      };
    case 'stat':
      return {
        id,
        type: 'stat',
        title: 'Scale & Performance Impact',
        canvasTheme: 'dark',
        statValue: '99.99%',
        statLabel: 'Operational Uptime across Multi-Region Clusters',
        statTrend: '▲ 4.2x throughput increase after connection pooling',
        speakerNotes: 'Contrast this metric with traditional monolith architectures.',
      };
    case 'quote':
      return {
        id,
        type: 'quote',
        title: 'Core Architectural Philosophy',
        canvasTheme: 'neo-card',
        quoteText: 'Everything fails, all the time. Plan for failure and nothing will surprise you.',
        quoteAuthor: 'Werner Vogels',
        quoteRole: 'CTO, Amazon.com',
        speakerNotes: 'Emphasize that software resiliency must be designed from day one.',
      };
    case 'interactive_quiz':
      return {
        id,
        type: 'interactive_quiz',
        title: 'Live Arena Challenge',
        subtitle: 'Test your audience in real-time with points & leaderboard',
        canvasTheme: 'dark',
        quizQuestion: 'In a Raft consensus cluster of 5 nodes, what is the minimum quorum required to commit a log entry?',
        quizOptions: ['2 nodes', '3 nodes (Majority)', '4 nodes', 'All 5 nodes'],
        quizCorrectIndex: 1,
        quizExplanation: 'A Raft quorum requires a strict majority: floor(N/2) + 1 = 3 nodes for N=5.',
        quizTimeLimitSeconds: 20,
        speakerNotes: 'Pause here, countdown 20 seconds, and watch the live answer distribution.',
      };
    case 'interactive_poll':
      return {
        id,
        type: 'interactive_poll',
        title: 'Audience Pulse Check',
        subtitle: 'Cast your live votes and view instant analytics',
        canvasTheme: 'dark',
        pollQuestion: 'Which cloud database architecture does your production stack rely on?',
        pollOptions: [
          'Single-Leader (Postgres/MySQL)',
          'Multi-Master Active-Active',
          'Distributed / Dynamo-Style (Cassandra)',
          'Serverless Global (Spanner/CockroachDB)',
        ],
        speakerNotes: 'Ask participants to vote on their mobile devices now.',
      };
    case 'content':
    default:
      return {
        id,
        type: 'content',
        title: 'Key System Principles',
        subtitle: 'Foundational concepts to keep in mind',
        canvasTheme: 'dark',
        bullets: [
          'High cohesion and loose coupling between distributed domain boundaries',
          'Idempotent operations to withstand at-least-once message retries',
          'Graceful degradation with circuit breakers and fallback queues',
          'Zero-trust authentication and end-to-end telemetry observability',
        ],
        speakerNotes: 'Cover each bullet point concisely before moving to the live demo.',
      };
  }
}

export function getStarterSlideDecks(roomCode: string = 'SKT-789'): SlideDeck[] {
  const code = (roomCode || 'SKT-789').toUpperCase().trim();
  return [
    {
      id: `deck-dist-sys-${code}`,
      title: 'High-Scale Distributed Systems Architecture',
      subtitle: 'Resiliency, Consensus & Zero-Downtime Multi-Region Deployments',
      description: 'A masterclass presentation on designing reliable systems at scale, with live interactive quizzes and audience polls.',
      category: 'System Design',
      authorName: 'Alex Chen (Host)',
      theme: 'neo-brutalist',
      currentSlideIndex: 0,
      isPresenting: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      slides: [
        {
          id: `slide-1-${code}`,
          type: 'title',
          title: 'High-Scale Distributed Systems Architecture',
          subtitle: 'Resiliency, Consensus & Zero-Downtime Multi-Region Deployments',
          badge: 'TECH MASTERCLASS',
          speakerNotes: 'Welcome everyone! Today we examine the principles of resilient distributed systems. Keep your phones ready for interactive polls and quiz questions throughout the session.',
        },
        {
          id: `slide-2-${code}`,
          type: 'content',
          title: 'The Realities of the CAP Theorem',
          subtitle: 'Partition tolerance is not optional in distributed computing',
          badge: 'THEORY & PRACTICE',
          imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80',
          imageCaption: 'Cloud Data Center Edge Nodes & Global Backbones',
          imagePosition: 'right',
          linkUrl: 'https://en.wikipedia.org/wiki/CAP_theorem',
          linkLabel: 'CAP Theorem Formal Proof',
          bullets: [
            'Network partitions are inevitable across cloud regions (fiber cuts, DNS drops, GC pauses)',
            'System designs must make a deliberate choice: Consistency (CP) or Availability (AP)',
            'Modern systems favor Tunable Consistency: Strong consistency for finances, Eventual consistency for timelines',
            'SLA guarantees require circuit breakers and fallback read-replicas',
          ],
          speakerNotes: 'Discuss how real-world network partitions happen. Mention AWS us-east-1 fiber cut incidents as concrete examples.',
        },
        {
          id: `slide-3-${code}`,
          type: 'code',
          title: 'Raft Leader Heartbeat & Lease Routine',
          subtitle: 'Preventing split-brain elections using monotonic clock terms',
          codeLanguage: 'typescript',
          codeSnippet: `// Raft Node Election Timeout & Heartbeat Loop
async function processRaftHeartbeat(node: RaftNode, leaderTerm: number): Promise<boolean> {
  if (leaderTerm < node.currentTerm) {
    return false; // Reject stale leader heartbeat
  }
  node.currentTerm = leaderTerm;
  node.state = 'follower';
  node.lastHeartbeatTime = Date.now();
  resetElectionTimer(node);
  return true;
}`,
          codeExplanation: 'Monotonic terms ensure that partitioned nodes can never usurp authority from a valid quorum leader.',
          speakerNotes: 'Point out the leaderTerm check. This simple monotonic comparison is what protects distributed consensus.',
        },
        {
          id: `slide-4-${code}`,
          type: 'stat',
          title: 'Multi-Region Throughput Benchmarks',
          statValue: '99.999%',
          statLabel: 'Availability Target across 5 Global Edge Clusters',
          statTrend: '▲ 8.4x faster write latency with Raft pipeline batching',
          speakerNotes: 'Highlight that 99.999% availability equates to less than 5 minutes of unplanned downtime per year globally.',
        },
        {
          id: `slide-5-${code}`,
          type: 'quote',
          title: 'The Golden Rule of Distributed Architecture',
          quoteText: 'Everything fails, all the time. The only difference between a novice and a master architect is designing for failure before it happens.',
          quoteAuthor: 'Dr. Werner Vogels',
          quoteRole: 'VP & Chief Technology Officer, Amazon.com',
          speakerNotes: 'Pause for impact. Software reliability is not about eliminating bugs, it is about surviving failures gracefully.',
        },
        {
          id: `slide-6-${code}`,
          type: 'interactive_poll',
          title: 'Audience Poll: Preferred Replication Strategy',
          subtitle: 'What replication model does your production system rely on?',
          pollQuestion: 'What replication model does your production system rely on?',
          pollOptions: [
            'Single-Leader (Postgres/MySQL)',
            'Multi-Leader / Active-Active',
            'Leaderless Dynamo-style (Cassandra/Scylla)',
            'Serverless Global (Spanner/Neon/Aurora)',
          ],
          speakerNotes: 'Launch the poll! Let audience vote whether they use Multi-Master, Single Leader, or Serverless DBs.',
        },
        {
          id: `slide-7-${code}`,
          type: 'interactive_quiz',
          title: 'Live Arena Trivia: Raft Quorum Calculation',
          subtitle: 'Compete for the leaderboard podium with your knowledge of consensus algorithms',
          quizQuestion: 'In a Raft cluster of 5 nodes, what is the minimum quorum required to commit a log entry?',
          quizOptions: ['2 nodes', '3 nodes (Majority)', '4 nodes', 'All 5 nodes'],
          quizCorrectIndex: 1,
          quizExplanation: 'A Raft quorum requires a strict majority: floor(N/2) + 1. For N=5, floor(5/2) + 1 = 3 nodes.',
          quizTimeLimitSeconds: 20,
          speakerNotes: 'Start the live quiz round. Encourage attendees to answer fast for streak multipliers!',
        },
        {
          id: `slide-8-${code}`,
          type: 'content',
          title: 'Core Takeaways for Resilient Engineering',
          subtitle: 'Checklist to audit your production services tomorrow',
          badge: 'SUMMARY',
          bullets: [
            '1. Implement exponential backoff with full jitter on all external network calls',
            '2. Ensure database mutations are idempotent with unique idempotency keys',
            '3. Run chaos engineering drills (kill pods, inject 200ms latency spikes) in staging',
            '4. Measure latency at p99 and p99.9, never solely by averages',
          ],
          speakerNotes: 'Summarize the four key takeaways and open the floor for audience Q&A.',
        },
      ],
    },
    {
      id: `deck-ai-edge-${code}`,
      title: 'Modern Edge AI & Fullstack Architecture',
      subtitle: 'Serverless Functions, Streaming LLMs & Real-time WebSockets',
      description: 'Explore the modern fullstack AI stack: Supabase Edge Functions, streaming completions, and responsive client UIs.',
      category: 'AI & Web Engineering',
      authorName: 'Sarah Jenkins (Tech Lead)',
      theme: 'cyber',
      currentSlideIndex: 0,
      isPresenting: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      slides: [
        {
          id: `slide-ai-1-${code}`,
          type: 'title',
          title: 'Modern Edge AI & Fullstack Architecture',
          subtitle: 'Serverless Functions, Streaming LLMs & Real-time WebSockets',
          badge: 'AI ENGINEERING',
          speakerNotes: 'Introduce the paradigm shift from heavy backend containers to lightweight V8 edge isolates for AI inference orchestration.',
        },
        {
          id: `slide-ai-2-${code}`,
          type: 'content',
          title: 'Why Edge Functions for AI Orchestration?',
          subtitle: 'Zero cold starts, global distribution, and complete API key isolation',
          badge: 'ARCHITECTURE',
          bullets: [
            'Deno V8 isolates spin up in less than 5 milliseconds (no Docker container boot penalty)',
            'API keys stay strictly server-side inside Supabase secrets, never exposed in client network tabs',
            'Streams Server-Sent Events (SSE) directly to browser DOM without buffering memory',
            'Zero compute charges when idle: pay only for active request CPU cycles',
          ],
          speakerNotes: 'Contrast Docker cold starts (3-8 seconds) with Deno isolate instant instantiation (<5ms).',
        },
        {
          id: `slide-ai-3-${code}`,
          type: 'code',
          title: 'Supabase Edge Function Mesh AI Proxy',
          subtitle: 'Server-side key resolution and streaming chat completion',
          codeLanguage: 'typescript',
          codeSnippet: `// Supabase Deno Edge Function
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  
  const serverKey = Deno.env.get('MESH_API_KEY');
  const payload = await req.json();

  const response = await fetch('https://api.meshapi.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': \`Bearer \${serverKey}\`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return new Response(response.body, { headers: corsHeaders });
});`,
          codeExplanation: 'Direct response streaming pipes tokens to the browser as they are generated by the model.',
          speakerNotes: 'Show how simple the proxy is when leveraging native fetch and streaming response bodies.',
        },
        {
          id: `slide-ai-4-${code}`,
          type: 'stat',
          title: 'Global Latency Optimization',
          statValue: '28ms',
          statLabel: 'Average Edge Compute Time Before First Token Return',
          statTrend: '▲ 65% faster perceived response with streaming tokens',
          speakerNotes: 'Explain why Time To First Token (TTFT) is the most critical metric in AI user experience.',
        },
        {
          id: `slide-ai-5-${code}`,
          type: 'interactive_quiz',
          title: 'AI Edge Knowledge Challenge',
          subtitle: 'Show off your mastery of serverless edge computing',
          speakerNotes: 'Start the live quiz round! Let attendees compete for first place on the leaderboard.',
        },
      ],
    },
  ];
}
