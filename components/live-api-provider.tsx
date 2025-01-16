import { LiveAPIProvider as Provider } from '@/vendor/contexts/LiveAPIContext';

type Props = {
	children: React.ReactNode;
	url?: string;
	apiKey?: string;
};

const LiveAPIProvider = ({ children, url: propUrl, apiKey: propApiKey }: Props) => {
	const host = 'generativelanguage.googleapis.com';
	const defaultUri = `wss://${host}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent`;

	const API_KEY = (process.env.NEXT_PUBLIC_GEMINI_API_KEY as string) || '';
	if (!propApiKey && typeof API_KEY !== 'string') {
		throw new Error('set NEXT_PUBLIC_GEMINI_API_KEY in .env');
	}

	return (
		<Provider url={propUrl || defaultUri} apiKey={propApiKey || API_KEY}>
			{children}
		</Provider>
	);
};

export default LiveAPIProvider;
