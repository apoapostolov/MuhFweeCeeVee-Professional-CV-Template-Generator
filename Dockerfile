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
    && apt-get install --no-install-recommends -y dumb-init \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system mfcv \
    && useradd --system --gid mfcv --create-home mfcv \
    && mkdir -p /app/data /app/photos /app/runtime-config \
    && chown -R mfcv:mfcv /app /ms-playwright

COPY deploy/docker/entrypoint.sh /usr/local/bin/mfcv-entrypoint
COPY THIRD_PARTY_NOTICES.md /app/THIRD_PARTY_NOTICES.md
COPY third-party-licenses/LGPL-3.0.txt /app/third-party-licenses/LGPL-3.0.txt
COPY --from=build /app/node_modules/sharp/LICENSE /app/third-party-licenses/sharp/LICENSE
COPY third-party-licenses/sharp-libvips/README.md /app/third-party-licenses/sharp-libvips/README.md
RUN chmod 0755 /usr/local/bin/mfcv-entrypoint

USER mfcv

EXPOSE 3000

# The image and its mutable volume mount points are owned by mfcv.
ENTRYPOINT ["/usr/local/bin/mfcv-entrypoint"]
CMD ["npm", "run", "start"]
