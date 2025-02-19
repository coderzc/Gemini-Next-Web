import { NextResponse } from 'next/server';
import { encrypt } from '@/vendor/lib/crypto';
import { headers } from 'next/headers';

interface Config {
  host: string;
  apiKey: string;
  azureSpeechKey: string;
  azureSpeechRegion: string;
}

export async function GET(request: Request) {
  try {
    await request.text();

    // Get client IP address from various headers
    const headersList = headers();
    const forwardedFor = headersList.get('x-forwarded-for');
    const realIP = headersList.get('x-real-ip');
    const clientIP = forwardedFor?.split(',')[0] || realIP || 'Unknown IP';
    
    console.log(`[XA] request from IP: ${clientIP}`);

    let config: Config = {
      host: '',
      apiKey: '',
      azureSpeechKey: '',
      azureSpeechRegion: ''
    }
    // @ts-ignore
    if (typeof Deno !== 'undefined') {
      config = {
        // @ts-ignore
        host: Deno.env.get('GEMINI_HOST') || 'generativelanguage.googleapis.com',
        // @ts-ignore
        apiKey: Deno.env.get('GEMINI_API_KEY') || '',
        // @ts-ignore
        azureSpeechKey: Deno.env.get('AZURE_SPEECH_KEY') || '',
        // @ts-ignore
        azureSpeechRegion: Deno.env.get('AZURE_SPEECH_REGION') || 'eastasia',
      };
    } else {
      config = {
        host: process.env.GEMINI_HOST || 'generativelanguage.googleapis.com',
        apiKey: process.env.GEMINI_API_KEY || '',
        azureSpeechKey: process.env.AZURE_SPEECH_KEY || '',
        azureSpeechRegion: process.env.AZURE_SPEECH_REGION || 'eastasia',
      };
    }

    console.log('Config prepared, gemini host:' + config.host);

    // 加密配置数据
    const encryptedData = encrypt(JSON.stringify(config));

    return NextResponse.json({ data: encryptedData });
  } catch (error) {
    return new NextResponse('获取数据失败，error:' + error, { status: 500 });
  }
} 