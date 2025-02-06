'use client';

import { LiveAPIProvider as Provider } from '@/vendor/contexts/LiveAPIContext';
import { useEffect, useState } from 'react';
import { Spin } from 'antd';
import { decrypt } from '@/vendor/lib/crypto';

type Props = {
	children: React.ReactNode;
	url?: string;
	apiKey?: string;
};

const LiveAPIProvider = ({ children, url: propUrl, apiKey: propApiKey }: Props) => {
	const [config, setConfig] = useState<{ host: string; apiKey: string }>({
		host: 'generativelanguage.googleapis.com',
		apiKey: '',
	});
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		// 获取配置
		console.log('Fetching config...');
		fetch('/api/x1')
			.then((res) => res.json())
			.then((data) => {
				console.log('Received config data:', data);
				try {
					if (!data || !data.data) {
						throw new Error('Invalid response format');
					}
					const decryptedConfig = JSON.parse(decrypt(data.data));
					console.log('Decrypted config:', decryptedConfig);
					if (!decryptedConfig || !decryptedConfig.apiKey) {
						throw new Error('Invalid config format');
					}
					setConfig(decryptedConfig);
				} catch (error) {
					console.error('Failed to decrypt config:', error);
					setConfig({
						host: 'generativelanguage.googleapis.com',
						apiKey: '',  // 清空 API key 以触发错误提示
					});
				}
			})
			.catch((err) => {
				console.error('Failed to load config:', err);
				setConfig({
					host: 'generativelanguage.googleapis.com',
					apiKey: '',  // 清空 API key 以触发错误提示
				});
			})
			.finally(() => {
				setIsLoading(false);
			});
	}, []);

	const defaultUri = `wss://${config.host}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent`;

	if (isLoading) {
		return (
			<div style={{ 
				height: '100vh', 
				display: 'flex', 
				justifyContent: 'center', 
				alignItems: 'center' 
			}}>
				<Spin size="large" tip="Loading configuration..." />
			</div>
		);
	}

	if (!propApiKey && !config.apiKey) {
		console.error('API key not found, config:', config);
		return (
			<div style={{ 
				height: '100vh', 
				display: 'flex', 
				justifyContent: 'center', 
				alignItems: 'center',
				flexDirection: 'column',
				gap: '1rem'
			}}>
				<div>Error: API key not found</div>
				<div>Please check your configuration</div>
			</div>
		);
	}

	return (
		<Provider url={propUrl || defaultUri} apiKey={propApiKey || config.apiKey}>
			{children}
		</Provider>
	);
};

export default LiveAPIProvider;
