import { openai } from '@ai-sdk/openai';
import { Message, streamText } from 'ai';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: messages,
        file_ids: ['file-2fu8vYP2ixhJMGULt5SuhC'], // 指定されたファイルIDを使用
        stream: true,
      }),
    });

    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(JSON.stringify({ error: 'チャットの処理中にエラーが発生しました' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
