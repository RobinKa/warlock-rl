/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import * as PIXI from "pixi.js";

import { makeGame } from "@/gameplay";
import { GameComponent } from "@/gameplay/components";
import { gameSystem } from "@/gameplay/systems";
import rfdc from "rfdc";

import { useKeyboard } from "@/common/keyboard";
import replay from "./state_history.json";

document.oncontextmenu = (e) => e.preventDefault();

const clone = rfdc({ proto: false });

const params = new URL(document.location).searchParams;
const isReplay = !!params.get("isReplay");

let components: GameComponent;
let localPlayerId: number;
let enemyPlayerId: number;
let replayIndex: number;
let advanceReplay: (() => void) | undefined;

if (isReplay) {
  replayIndex = 0;
  components = replay[0] as GameComponent;

  advanceReplay = () => {
    replayIndex++;
    if (replayIndex in replay) {
      components = replay[replayIndex];
    }
    console.log("advanceReplay", replayIndex, replay.length);
  };

  localPlayerId = 1000;
  enemyPlayerId = 1001;
} else {
  const { components: c, addPlayer } = makeGame({ deltaTime: 1 / 30, seed: 0 });
  components = c;
  localPlayerId = addPlayer({ e1: 0, e2: 0 }, true);
  enemyPlayerId = addPlayer({ e1: 0, e2: 200 }, false);
}

const app = new PIXI.Application({ background: "#7099bb", resizeTo: window });
// @ts-ignore
document.body.appendChild(app.view);

app.stage.sortableChildren = true;

// UI
const background = new PIXI.Sprite(PIXI.Texture.WHITE);
background.width = app.view.width;
background.height = app.view.height;
background.x = 0;
background.y = 0;
background.tint = 0xffaa11;
background.interactive = true;
background.on("click", (e) => {
  const { x, y } = worldStage.transform.worldTransform.applyInverse(e);
  components.orders[localPlayerId].order = {
    type: "move",
    target: { e1: x, e2: y },
  };
});
background.on("rightclick", (e) => {
  const { x, y } = worldStage.transform.worldTransform.applyInverse(e);
  components.orders[localPlayerId].order = {
    type: "useAbility",
    abilityId: "shoot",
    target: { e1: x, e2: y },
  };
});
let mousePosition = { x: 0, y: 0 };
background.on("mousemove", ({ client }) => {
  mousePosition = worldStage.transform.worldTransform.applyInverse(client);
});
app.stage.addChild(background);

// World
const worldStage = new PIXI.Container();
worldStage.zIndex = 1;
app.stage.addChild(worldStage);

const arena = {
  radius: components.arena.radius,
  sprite: new PIXI.Graphics(),
  redraw: () => {
    arena.sprite.clear();
    arena.sprite.beginFill(0xcccccc);
    arena.sprite.drawCircle(0, 0, components.arena.radius);
    arena.sprite.endFill();
  },
};
arena.redraw();
worldStage.addChild(arena.sprite);

// Input
const { keyStates, clearKeyStates } = useKeyboard(["1", "2"]);
function handleInput() {
  const { x, y } = mousePosition;

  if (keyStates["1"]) {
    console.log("Input 1");
    components.orders[localPlayerId].order = {
      type: "useAbility",
      abilityId: "shoot",
      target: { e1: x, e2: y },
    };
  } else if (keyStates["2"]) {
    console.log("Input 2");
    components.orders[localPlayerId].order = {
      type: "useAbility",
      abilityId: "teleport",
      target: { e1: x, e2: y },
    };
  }

  clearKeyStates();
}

// Rendering
const bodyContainers: Record<string, PIXI.Container> = {};
const REFERENCE_WIDTH = 5_000;
app.ticker.minFPS = 30;
app.ticker.maxFPS = 30;

function render() {
  // Default scale so that vertical is REFERENCE_WIDTH
  const scale = app.view.width / REFERENCE_WIDTH;
  worldStage.scale = new PIXI.Point(scale, scale);
  worldStage.position = new PIXI.Point(app.view.width / 2, app.view.height / 2);

  // Draw arena
  if (arena.radius !== components.arena.radius) {
    arena.redraw();
  }

  // Add bodies
  for (const [entityId, body] of Object.entries(components.bodies)) {
    if (!(entityId in bodyContainers)) {
      const container = new PIXI.Container();

      const circle = new PIXI.Graphics();
      circle.beginFill(0x00ff00);
      circle.drawCircle(0, 0, body.radius);
      circle.endFill();
      container.addChild(circle);

      if (entityId in components.healths) {
        const health = new PIXI.Text(components.healths[entityId].current, {
          fontSize: 30,
        });
        health.position.set(0, -40);
        health.anchor.set(0.5, 1.0);
        container.addChild(health);
      }

      worldStage.addChild(container);
      bodyContainers[entityId] = container;
    }
  }

  // Remove bodies
  for (const [entityId, sprite] of Object.entries(bodyContainers)) {
    if (!(entityId in components.bodies)) {
      worldStage.removeChild(sprite);
    }
  }

  // Update bodies
  for (const [entityId, body] of Object.entries(components.bodies)) {
    if (entityId in components.healths) {
      (bodyContainers[entityId].children[1] as PIXI.Text).text =
        components.healths[entityId].current.toFixed(0);
    }
    bodyContainers[entityId].position.set(body.location.e1, body.location.e2);
  }
}

// Debugging
// let previousComponents: GameComponent = clone(components);
// let nextDiffTime = app.ticker.lastTime;

// Loop
app.ticker.add((delta) => {
  if (isReplay) {
    advanceReplay!();
  } else {
    handleInput();
    gameSystem(components);
  }
  render();

  // Log debug info
  // if (app.ticker.lastTime >= nextDiffTime) {
  //   nextDiffTime += 3000;
  //   const componentsDiff = diff(previousComponents, components);
  //   if (Object.keys(componentsDiff).length > 0) {
  //     console.log("Diff: " + JSON.stringify(componentsDiff, undefined, 2));
  //     previousComponents = clone(components);
  //   }
  // }
});
