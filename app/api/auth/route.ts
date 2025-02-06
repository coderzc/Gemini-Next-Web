import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

// Helper function to format IP address
function formatIP(ip: string | null): string {
  if (!ip) return 'Unknown IP';
  
  // Handle common local addresses
  if (ip === '::1' || ip === '::ffff:127.0.0.1') return 'localhost';
  // Handle IPv4-mapped IPv6 addresses
  if (ip.startsWith('::ffff:')) return ip.substring(7);
  
  return ip;
}

export async function POST(req: Request) {
  try {
    const { password } = await req.json();
    const accessCode = process.env.ACCESS_CODE;
    
    // Get client IP address from various headers
    const headersList = headers();
    const forwardedFor = headersList.get('x-forwarded-for');
    const realIP = headersList.get('x-real-ip');
    const clientIP = formatIP(forwardedFor?.split(',')[0] || realIP);

    console.log(`[Auth] auth request from IP: ${clientIP}`);

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