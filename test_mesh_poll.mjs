const apiKey = 'rsk_01KX0AG4V5BR0PCAV4F6WGJK1Q';

async function testPoll(topic) {
  console.log(`\n=== Testing topic: "${topic}" ===`);
  const systemPrompt = `You are an interactive audience poll designer.
Create 3 tailored, creative, and highly relevant audience polls specifically about the user's topic: "${topic}".
Ensure each poll has:
- A clear, engaging, and varied question directly addressing "${topic}".
- 2 to 5 distinct, concise, and realistic option choices.
- DO NOT default to generic software architecture (like monolith vs microservices) unless the topic explicitly asks for it.
- Match the context: if the user asks for rating/feedback, provide rating and satisfaction options; if they ask for technology, provide relevant tech choices; if opinion/debate, provide contrasting viewpoints.

Return valid JSON ONLY in this format:
{
  "polls": [
    {
      "question": "Clear question specific to ${topic}?",
      "options": ["Choice 1", "Choice 2", "Choice 3", "Choice 4"]
    }
  ]
}`;

  const res = await fetch('https://api.meshapi.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate 3 interactive live audience polls about: "${topic}". Make each poll unique and directly tailored to this exact subject.` }
      ],
      temperature: 0.8,
      response_format: { type: 'json_object' }
    })
  });

  const data = await res.json();
  console.log('Response content:', data.choices?.[0]?.message?.content);
}

async function run() {
  await testPoll('Rate this Web App');
  await testPoll('Favorite Sci-Fi Movie of all time');
  await testPoll('Kubernetes vs Docker Swarm');
}

run();
