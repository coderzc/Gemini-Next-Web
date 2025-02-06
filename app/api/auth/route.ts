import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    // 使用 Response header 输出日志
    const logs: string[] = [];
    const log = (msg: string) => {
      logs.push(msg);
      console.log(msg); // 本地开发时仍然可以看到
    };
  try {
    const { password } = await req.json();
    const accessCode = process.env.ACCESS_CODE;

    log('[Auth] accessCode:' + accessCode);
    log('[Auth] process.env:' + process.env);

    if (!accessCode) {
      return new NextResponse('未配置访问密码', { status: 500 });
    }

    if (password === accessCode) {
      return new NextResponse('验证成功', { status: 200 });
    }

    return new NextResponse('密码错误', { status: 401 });
  } catch (error) {
    return new NextResponse('验证失败', { status: 500 });
  }
} 