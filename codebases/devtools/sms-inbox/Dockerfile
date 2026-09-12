FROM node:24-alpine
WORKDIR /app
COPY packages/notifications/package.json packages/notifications/package.json
COPY packages/notifications/dist packages/notifications/dist
COPY node_modules/zod node_modules/zod
COPY codebases/devtools/sms-inbox/package.json codebases/devtools/sms-inbox/package.json
COPY codebases/devtools/sms-inbox/dist codebases/devtools/sms-inbox/dist
COPY codebases/devtools/sms-inbox/public codebases/devtools/sms-inbox/public
RUN mkdir -p node_modules/@dealpme && ln -s ../../packages/notifications node_modules/@dealpme/notifications
USER node
ENV NODE_ENV=development SMS_INBOX_HOST=0.0.0.0
EXPOSE 8026
CMD ["node", "codebases/devtools/sms-inbox/dist/server.js"]
