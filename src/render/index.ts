/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import * as PIXI from "pixi.js";

import { deepCopy } from "@/common";
import { makeGame } from "@/gameplay";
import { GameComponent } from "@/gameplay/components";
import { gameSystem } from "@/gameplay/systems";
import { useKeyboard } from "@/common/keyboard";

(async function () {
  const isReplay = window.location.hash.startsWith("#replay");

  if (isReplay) {
    let replayName;
    if (window.location.hash.includes("=")) {
      replayName = window.location.hash.split("=", 2)[1];
    } else {
      const replays: { name: string; createdAt: string }[] = await fetch(
        "/replay"
      ).then((resp) => resp.json());

      replayName = replays.sort(
        (a, b) => -a.createdAt.localeCompare(b.createdAt)
      )[0].name;
    }

    fetch(`/replay/${replayName}`)
      .then((resp) => {
        console.log(resp);
        return resp.json();
      })
      .then(startGame);
  } else {
    startGame();
  }
})();

function startGame(replay?: GameComponent[]) {
  const isReplay = replay !== undefined;

  document.oncontextmenu = (e) => e.preventDefault();

  let components: GameComponent;
  let localPlayerId: number;
  let enemyPlayerId: number;
  let replayIndex: number;
  let advanceReplay: (() => void) | undefined;

  if (isReplay) {
    replayIndex = 0;
    components = replay[0] as GameComponent;

    advanceReplay = () => {
      const previousComponents = replay[replayIndex];
      replayIndex++;
      if (replayIndex in replay) {
        components = replay[replayIndex];

        for (const entityId in components.healths) {
          if (
            components.healths[entityId].current -
              previousComponents.healths[entityId].current <
            -9
          ) {
            console.log(
              entityId,
              previousComponents.healths[entityId].current,
              "->",
              components.healths[entityId].current,
              "before:",
              previousComponents,
              "after:",
              components
            );
          }
        }
      }
    };

    localPlayerId = 1000;
    enemyPlayerId = 1001;
  } else {
    const { components: c, addPlayer } = makeGame({
      deltaTime: 1 / 30,
      seed: 0,
    });
    components = c;
    localPlayerId = addPlayer();
    enemyPlayerId = addPlayer();
  }

  const app = new PIXI.Application({
    background: "#7099bb",
    resizeTo: window,
    antialias: true,
  });
  // @ts-ignore
  document.body.appendChild(app.view);

  app.stage.sortableChildren = true;

  // UI
  let mousePosition = { x: 0, y: 0 };

  const background = new PIXI.Sprite(PIXI.Texture.WHITE);
  background.width = app.view.width;
  background.height = app.view.height;
  background.x = 0;
  background.y = 0;
  background.tint = 0xffaa11;

  if (!isReplay) {
    background.interactive = true;

    // Left click to move
    background.on("click", (e) => {
      const { x, y } = worldStage.transform.worldTransform.applyInverse(e);
      components.orders[localPlayerId].order = {
        type: "move",
        target: { e1: x, e2: y },
      };
    });

    // Track mouse position
    background.on("mousemove", ({ client }) => {
      mousePosition = worldStage.transform.worldTransform.applyInverse(client);
    });
  }

  // Zoom
  let zoom = 1;
  background.on("wheel", (e) => {
    zoom = Math.max(0.1, zoom - 0.1 * Math.sign(e.deltaY));
    e.preventDefault(); // doesn't work?
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
  const { keyStates, clearKeyStates } = useKeyboard(["1", "2", "3", "s"]);
  function handleInput() {
    const { x, y } = mousePosition;

    if (keyStates["1"]) {
      components.orders[localPlayerId].order = {
        type: "useAbility",
        abilityId: "shoot",
        target: { e1: x, e2: y },
      };
    } else if (keyStates["2"]) {
      components.orders[localPlayerId].order = {
        type: "useAbility",
        abilityId: "teleport",
        target: { e1: x, e2: y },
      };
    } else if (keyStates["3"]) {
      components.orders[localPlayerId].order = {
        type: "useAbility",
        abilityId: "scourge",
      };
    } else if (keyStates["s"]) {
      components.orders[localPlayerId].order = {
        type: "stop",
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
    const scale = (zoom * app.view.width) / REFERENCE_WIDTH;
    worldStage.scale = new PIXI.Point(scale, scale);
    worldStage.position = new PIXI.Point(
      app.view.width / 2,
      app.view.height / 2
    );

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

        const directionIndicator = new PIXI.Graphics();
        directionIndicator.beginFill(0x333333);
        directionIndicator.drawRect(10, -3, 32, 6);
        directionIndicator.rotation = body.facing;
        container.addChild(directionIndicator);

        if (entityId in components.healths) {
          const health = new PIXI.Text(components.healths[entityId].current, {
            fontSize: 30,
          });
          health.position.set(0, -40);
          health.anchor.set(0.5, 1.0);
          container.addChild(health);
        }

        if (entityId in components.units) {
          const knockbackMultiplier = new PIXI.Text(
            components.units[entityId].knockbackMultiplier,
            {
              fontSize: 20,
            }
          );
          knockbackMultiplier.position.set(0, -26);
          knockbackMultiplier.anchor.set(0.5, 1.0);
          container.addChild(knockbackMultiplier);
        }

        if (["1000", "1001"].includes(entityId)) {
          const playerName = new PIXI.Text(parseInt(entityId) - 1000, {
            fontSize: 24,
          });
          playerName.position.set(0, 0);
          playerName.anchor.set(0.5, 0.5);
          container.addChild(playerName);
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
      // TODO: Don't rely on indices

      // Health text
      if (entityId in components.healths) {
        (bodyContainers[entityId].children[2] as PIXI.Text).text =
          components.healths[entityId].current.toFixed(0);
      }
      // Knockback multiplier text
      if (entityId in components.units) {
        (bodyContainers[entityId].children[3] as PIXI.Text).text =
          components.units[entityId].knockbackMultiplier.toFixed(2);
      }
      // Direction indicator
      (bodyContainers[entityId].children[1] as PIXI.Graphics).rotation =
        body.facing;
      // Body position
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
}
