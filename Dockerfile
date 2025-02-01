FROM node:18.20-bullseye-slim
WORKDIR /usr/src/app
COPY package.json ./
COPY package-lock.json ./
COPY yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
EXPOSE 6688
CMD ["yarn", "start"]
