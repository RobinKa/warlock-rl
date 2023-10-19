# warlock

Development: `bun build --watch ./src/render/index.ts --outdir ./build`

Frontend server to visualize replays: `bun run --watch src/serve.ts`

- http://localhost:3000 to play the game
- http://localhost:3000#replay to watch the latest replay in ./logs
- http://localhost:3000#replay=uuid to watch a specific replay in ./logs
