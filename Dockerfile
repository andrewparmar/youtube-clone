FROM node:18

WORKDIR /app

COPY package*.json /

RUN apt-get update && apt-get install -y ffmpeg

RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "start"]