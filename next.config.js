/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Em dev no Windows, o watcher tentava "vigiar" arquivos de sistema do C:\
  // (pagefile.sys, etc.) e enchia o log de erros "Watchpack EINVAL".
  // Aqui mandamos ignorar esses arquivos e o node_modules.
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          "**/node_modules/**",
          "**/.next/**",
          "**/.git/**",
          "C:/pagefile.sys",
          "C:/swapfile.sys",
          "C:/hiberfil.sys",
          "C:/DumpStack.log.tmp",
        ],
      };
    }
    return config;
  },
};

module.exports = nextConfig;
