/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	experimental: {},
	// Inject build metadata to verify deployments on Vercel
	env: {
		BUILD_TIME: new Date().toISOString(),
	}
};
export default nextConfig;
