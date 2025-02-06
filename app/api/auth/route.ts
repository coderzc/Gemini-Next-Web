import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { password } = await req.json();
    const accessCode = process.env.ACCESS_CODE;

    console.log('[Auth] auth request' + req.headers);

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