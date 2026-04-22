/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Aviso: Isso permite que builds de produção terminem com sucesso mesmo se
    // o seu projeto tiver erros do ESLint.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;