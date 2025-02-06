import { NextResponse } from 'next/server';
import { encrypt } from '@/vendor/lib/crypto';

interface Config {
  host: string;
  apiKey: string;
  azureSpeechKey: string;
  azureSpeechRegion: string;
}

export async function GET(request: Request) {
  try {
    // 使用 Response header 输出日志
    const logs: string[] = [];
    const log = (msg: string) => {
      logs.push(msg);
      console.log(msg); // 本地开发时仍然可以看到
    };

    // 获取所有环境变量
    let envStr = '';
    try {
      // @ts-ignore
      envStr = JSON.stringify(typeof Deno !== 'undefined' ? Deno.env.toObject() : process.env);
    } catch (error: any) {
      envStr = 'Failed to get env: ' + (error?.message || String(error));
    }

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

    log('Config prepared, gemini host:' + config.host);

    // 加密配置数据
    const encryptedData = encrypt(JSON.stringify(config));

    return NextResponse.json({ data: encryptedData });
  } catch (error) {
    return new NextResponse('获取数据失败', { status: 500 });
  }
} 