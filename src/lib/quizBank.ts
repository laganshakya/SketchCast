import type { QuizPack, LivePoll } from '../types';

export const QUIZ_PACKS: QuizPack[] = [
  {
    id: 'system-design',
    name: 'System Design & Arch',
    icon: '🏗️',
    description: 'Distributed systems, caching, replication, and CAP theorem',
    questions: [
      {
        id: 'sd-1',
        category: 'System Design',
        question: 'Under the CAP theorem, during a network partition in a distributed database, what must a system choose between?',
        options: [
          { id: 'A', text: 'Consistency vs Availability' },
          { id: 'B', text: 'Latency vs Throughput' },
          { id: 'C', text: 'Durability vs Atomicity' },
          { id: 'D', text: 'Replication vs Sharding' },
        ],
        correctOptionId: 'A',
        explanation: 'According to Eric Brewer’s CAP Theorem, when a network partition (P) occurs, a distributed data store must trade off either Consistency (C) or Availability (A).',
        timeLimitSeconds: 25,
      },
      {
        id: 'sd-2',
        category: 'System Design',
        question: 'Which caching strategy writes data directly to the cache and the backing database simultaneously before confirming success?',
        options: [
          { id: 'A', text: 'Write-Through' },
          { id: 'B', text: 'Write-Around' },
          { id: 'C', text: 'Write-Back (Write-Behind)' },
          { id: 'D', text: 'Cache-Aside' },
        ],
        correctOptionId: 'A',
        explanation: 'Write-Through updates both the cache and the primary database synchronously before returning, ensuring high data consistency at the expense of higher write latency.',
        timeLimitSeconds: 25,
      },
      {
        id: 'sd-3',
        category: 'System Design',
        question: 'What is the primary benefit of using Consistent Hashing in distributed cache clusters?',
        options: [
          { id: 'A', text: 'Minimizes key remapping when nodes are added or removed' },
          { id: 'B', text: 'Guarantees sub-millisecond cryptographic encryption' },
          { id: 'C', text: 'Eliminates all cache invalidation events completely' },
          { id: 'D', text: 'Compresses data into binary Protobuf payloads' },
        ],
        correctOptionId: 'A',
        explanation: 'Consistent Hashing maps both keys and nodes to a circular hash ring, so adding or removing a node only remaps k/N keys on average rather than all keys.',
        timeLimitSeconds: 25,
      }
    ]
  },
  {
    id: 'web-dev',
    name: 'Web Dev & JavaScript',
    icon: '⚡',
    description: 'Event loop, React rendering, DOM, and async programming',
    questions: [
      {
        id: 'wd-1',
        category: 'Web Dev',
        question: 'In the JavaScript Event Loop, which queue is processed with the highest priority immediately after the current call stack clears?',
        options: [
          { id: 'A', text: 'Microtask Queue (Promises, queueMicrotask)' },
          { id: 'B', text: 'Macrotask Queue (setTimeout, setInterval)' },
          { id: 'C', text: 'I/O Polling Queue' },
          { id: 'D', text: 'requestIdleCallback Queue' },
        ],
        correctOptionId: 'A',
        explanation: 'Microtasks (like Promise callbacks and process.nextTick / queueMicrotask) are drained completely before the event loop picks the next macrotask.',
        timeLimitSeconds: 25,
      },
      {
        id: 'wd-2',
        category: 'Web Dev',
        question: 'In React 18+, what mechanism enables interrupting a low-priority render to keep user typing interactions snappy?',
        options: [
          { id: 'A', text: 'Concurrent Rendering & useTransition' },
          { id: 'B', text: 'Synchronous flushSync loops' },
          { id: 'C', text: 'PureComponent shouldComponentUpdate' },
          { id: 'D', text: 'Web Workers multi-threading' },
        ],
        correctOptionId: 'A',
        explanation: 'React Concurrent Mode and useTransition mark updates as non-urgent transitions, allowing high-priority events (e.g. typing) to interrupt background rendering.',
        timeLimitSeconds: 25,
      }
    ]
  },
  {
    id: 'cloud-devops',
    name: 'Cloud & DevOps',
    icon: '☁️',
    description: 'Kubernetes, containers, CI/CD, and infrastructure as code',
    questions: [
      {
        id: 'cd-1',
        category: 'Cloud & DevOps',
        question: 'In Kubernetes, which component is responsible for maintaining the desired state of pods across the cluster worker nodes?',
        options: [
          { id: 'A', text: 'Kube-Controller-Manager' },
          { id: 'B', text: 'Kube-Proxy' },
          { id: 'C', text: 'CoreDNS' },
          { id: 'D', text: 'Container Runtime Interface (CRI)' },
        ],
        correctOptionId: 'A',
        explanation: 'The Kube-Controller-Manager runs controller loops (e.g. Node Controller, Deployment Controller) that continuously reconcile the current state with the desired state.',
        timeLimitSeconds: 25,
      },
      {
        id: 'cd-2',
        category: 'Cloud & DevOps',
        question: 'Which deployment strategy provisions a complete duplicate production environment to achieve zero downtime during releases?',
        options: [
          { id: 'A', text: 'Blue-Green Deployment' },
          { id: 'B', text: 'Rolling Update' },
          { id: 'C', text: 'Canary Release' },
          { id: 'D', text: 'Recreate Strategy' },
        ],
        correctOptionId: 'A',
        explanation: 'Blue-Green uses two identical environments (Blue active, Green idle) and switches the router/load balancer once Green is verified.',
        timeLimitSeconds: 25,
      }
    ]
  },
  {
    id: 'ai-ml',
    name: 'AI & Machine Learning',
    icon: '🤖',
    description: 'Transformers, embeddings, LLM fine-tuning, and loss functions',
    questions: [
      {
        id: 'ai-1',
        category: 'AI & ML',
        question: 'In the Transformer architecture, what computational mechanism allows words to attend to every other word regardless of distance in the sequence?',
        options: [
          { id: 'A', text: 'Multi-Head Self-Attention' },
          { id: 'B', text: 'Recurrent Hidden States' },
          { id: 'C', text: 'Convolutional Pooling' },
          { id: 'D', text: 'Dropout Regularization' },
        ],
        correctOptionId: 'A',
        explanation: 'Multi-Head Self-Attention computes Query-Key-Value dot products across all token positions simultaneously, capturing long-range semantic dependencies in O(1) sequential steps.',
        timeLimitSeconds: 25,
      }
    ]
  }
];

export const INITIAL_LIVE_POLLS: LivePoll[] = [
  {
    id: 'poll-1',
    room_id: 'room-demo-101',
    question: 'What is your team’s primary primary database choice for new high-scale microservices?',
    author_name: 'Alex Chen (Host)',
    created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    totalVotes: 84,
    options: [
      { id: 'opt-1', text: 'PostgreSQL / Supabase (Relational & Extensions)', votesCount: 46 },
      { id: 'opt-2', text: 'Redis / In-Memory KV (Sub-millisecond latency)', votesCount: 18 },
      { id: 'opt-3', text: 'MongoDB / Document DB (Flexible Schema)', votesCount: 12 },
      { id: 'opt-4', text: 'Cassandra / ScyllaDB (Massive write throughput)', votesCount: 8 },
    ],
  },
  {
    id: 'poll-2',
    room_id: 'room-demo-101',
    question: 'Which API architecture paradigm do you prefer for real-time frontend applications in 2026?',
    author_name: 'Alex Chen (Host)',
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    totalVotes: 62,
    options: [
      { id: 'opt-1', text: 'WebSockets & Server-Sent Events (SSE)', votesCount: 34 },
      { id: 'opt-2', text: 'tRPC + React Server Actions', votesCount: 16 },
      { id: 'opt-3', text: 'GraphQL Subscriptions', votesCount: 9 },
      { id: 'opt-4', text: 'Standard REST Polling', votesCount: 3 },
    ],
  }
];
