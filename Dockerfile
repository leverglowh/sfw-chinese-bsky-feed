FROM node:18.20-bullseye-slim
WORKDIR /usr/src/app
COPY package.json ./
RUN yarn install --frozen-lockfile
COPY . .
EXPOSE 6688
CMD ["yarn", "start"]