import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import GlobalLayout from '@/components/global-layout';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import AuthCheck from '@/components/auth-check';

const geistSans = localFont({
	src: './fonts/GeistVF.woff',
	variable: '--font-geist-sans',
	weight: '100 900',
});
const geistMono = localFont({
	src: './fonts/GeistMonoVF.woff',
	variable: '--font-geist-mono',
	weight: '100 900',
});

export const metadata: Metadata = {
	title: 'Gemini 2',
	description: '',
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang='en'>
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased`}
			>
				<AntdRegistry>
					<ConfigProvider locale={zhCN}>
						<AuthCheck>
							<GlobalLayout>{children}</GlobalLayout>
						</AuthCheck>
					</ConfigProvider>
				</AntdRegistry>
			</body>
		</html>
	);
}
