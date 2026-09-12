FROM node:24-alpine
WORKDIR /app
COPY codebases/external_connectors/remo/package.json codebases/external_connectors/remo/package.json
COPY codebases/external_connectors/remo/dist codebases/external_connectors/remo/dist
COPY node_modules/zod node_modules/zod
COPY codebases/devtools/event-simulator/package.json codebases/devtools/event-simulator/package.json
COPY codebases/devtools/event-simulator/dist codebases/devtools/event-simulator/dist
COPY codebases/devtools/event-simulator/public codebases/devtools/event-simulator/public
RUN mkdir -p node_modules/@dealpme /data && ln -s ../../codebases/external_connectors/remo node_modules/@dealpme/connector-remo && chown node /data
USER node
ENV NODE_ENV=development HOST=0.0.0.0 EVENT_SIMULATOR_DB=/data/events.sqlite
EXPOSE 8028
CMD ["node", "codebases/devtools/event-simulator/dist/server.js"]
