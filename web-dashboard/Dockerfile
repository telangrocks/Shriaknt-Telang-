FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json yarn.lock .yarnrc.yml ./

RUN corepack enable \
  && yarn install --immutable --mode=skip-build --production=true --cwd /app

COPY . .

RUN yarn run build

FROM nginx:1.27-alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
## Build stage ---------------------------------------------------------------
FROM node:18-alpine AS builder

WORKDIR /app

# Copy dependency manifests first to leverage Docker layer caching
COPY package.json yarn.lock .yarnrc.yml ./

# Enable Yarn via Corepack and install dependencies
RUN corepack enable \
  && yarn install --immutable --mode=skip-build

# Copy the rest of the source and build the production bundle
COPY . .
RUN yarn run build

## Runtime stage -------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

WORKDIR /usr/share/nginx/html

# Remove default nginx assets and copy built dashboard
RUN rm -rf ./*
COPY --from=builder /app/dist ./

# Copy nginx configuration if provided
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]


