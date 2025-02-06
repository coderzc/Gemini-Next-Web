'use client';

import { FC, ReactNode, useEffect, useState } from 'react';
import { Input, Button, Form, message } from 'antd';
import { useRouter } from 'next/navigation';

interface AuthCheckProps {
  children: ReactNode;
}

const AuthCheck: FC<AuthCheckProps> = ({ children }) => {
  const [isAuthed, setIsAuthed] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const auth = localStorage.getItem('auth');
    if (auth === 'true') {
      setIsAuthed(true);
    }
    setIsLoading(false);
  }, []);

  const onFinish = async (values: { password: string }) => {
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: values.password }),
      });

      if (response.ok) {
        localStorage.setItem('auth', 'true');
        setIsAuthed(true);
        message.success('验证成功');
      } else {
        message.error('密码错误');
      }
    } catch (error) {
      message.error('验证失败，请重试');
    }
  };

  // 在加载状态下返回空内容，避免闪烁
  if (isLoading) {
    return null;
  }

  if (!isAuthed) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        background: '#f5f5f5'
      }}>
        <div style={{ 
          padding: '2rem',
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <Form onFinish={onFinish}>
            <Form.Item
              name="password"
              rules={[{ required: true, message: '请输入访问密码' }]}
            >
              <Input.Password placeholder="请输入访问密码" style={{ width: '300px' }} />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" style={{ width: '100%' }}>
                验证
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthCheck; 