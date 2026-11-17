FROM node:22-alpine
WORKDIR /app
COPY package.json server.js index.html test.html run_tests.js sw.js manifest.webmanifest ./
COPY icons ./icons/
ENV NODE_ENV=production
ENV PORT=10000
EXPOSE 10000
CMD ["node","server.js"]
