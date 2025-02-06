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
		fetch('/api/x1')
			.then((res) => res.json())
			.then((data) => {
				try {
					const decryptedConfig = JSON.parse(decrypt(data.data));
					setConfig(decryptedConfig);
				} catch (error) {
					console.error('Failed to decrypt config:', error);
				}
			})
			.catch((err) => {
				console.error('Failed to load config:', err);
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
		throw new Error('API key not found');
	}

	return (
		<Provider url={propUrl || defaultUri} apiKey={propApiKey || config.apiKey}>
			{children}
		</Provider>
	);
};

export default LiveAPIProvider;
