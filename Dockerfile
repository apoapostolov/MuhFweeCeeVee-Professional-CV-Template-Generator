FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/ ./packages/

RUN npm install --workspaces --include-workspace-root

COPY . .

RUN npm run build

RUN npx playwright install --with-deps chromium

EXPOSE 3000

CMD ["npm", "run", "start"]
