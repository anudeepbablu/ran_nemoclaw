FROM node:22-bookworm-slim

WORKDIR /workspace

ENV NODE_ENV=development

COPY package.json ./
RUN npm install

COPY . .

EXPOSE 5173 4173

CMD ["npm", "run", "dev:ui"]
