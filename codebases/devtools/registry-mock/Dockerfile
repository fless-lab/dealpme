FROM node:24-alpine
WORKDIR /app
COPY codebases/external_connectors/registry/package.json codebases/external_connectors/registry/package.json
COPY codebases/external_connectors/registry/dist codebases/external_connectors/registry/dist
COPY node_modules/zod node_modules/zod
COPY codebases/devtools/registry-mock/package.json codebases/devtools/registry-mock/package.json
COPY codebases/devtools/registry-mock/dist codebases/devtools/registry-mock/dist
RUN mkdir -p node_modules/@dealpme && ln -s ../../codebases/external_connectors/registry node_modules/@dealpme/connector-registry
USER node
ENV NODE_ENV=development HOST=0.0.0.0
EXPOSE 8027
CMD ["node", "codebases/devtools/registry-mock/dist/server.js"]
