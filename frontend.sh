#!/usr/bin/env bash
(
    trap 'kill 0' SIGINT
    bun build --watch ./src/render/index.ts --outdir ./build &
    bun run --watch src/serve.ts
)
