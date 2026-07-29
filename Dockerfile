# syntax=docker/dockerfile:1

FROM node:22.23.1-bookworm-slim AS build

WORKDIR /app

# Keep Chromium outside the application tree so it remains available after the
# non-root runtime handoff.
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages ./packages

RUN npm ci --include-workspace-root

# Copy only the runtime inputs. The Docker build context deliberately excludes
# local state, contributor tooling, and documentation.
COPY apps/web ./apps/web
COPY ai-skills ./ai-skills
COPY data ./data
COPY templates ./templates

RUN npm run build \
    && npx playwright install --with-deps chromium

FROM build AS runtime

ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

RUN apt-get update \
    && apt-get install --no-install-recommends -y dumb-init gosu \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system mfcv \
    && useradd --system --gid mfcv --create-home mfcv \
    && mkdir -p /app/data /app/photos /app/runtime-config \
    && chown -R mfcv:mfcv /app /ms-playwright

COPY deploy/docker/entrypoint.sh /usr/local/bin/mfcv-entrypoint
RUN chmod 0755 /usr/local/bin/mfcv-entrypoint

EXPOSE 3000

# The entrypoint starts as root only long enough to repair mounted-volume
# ownership, then uses dumb-init to run the application as the mfcv user.
ENTRYPOINT ["/usr/local/bin/mfcv-entrypoint"]
CMD ["npm", "run", "start"]
