/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import * as PIXI from "pixi.js";

import { useKeyboard } from "@/common/keyboard";
import { makeGame } from "@/gameplay";
import { GameComponent } from "@/gameplay/components";
import { buyAbility } from "@/gameplay/shop";
import { gameSystem } from "@/gameplay/systems";
import { useCooldownWidget } from "./widgets/cooldown";
import { useShopWidget } from "./widgets/shop";

(async function () {
  const isReplay = window.location.hash.startsWith("#replay");

  if (isReplay) {
    let replayName;
    if (window.location.hash.includes("=")) {
      replayName = window.location.hash.split("=", 2)[1];
    } else {
      replayName = (await fetch("/replay").then((resp) => resp.json())).name;
    }

    document.title = `Replay - ${replayName}`;

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
    let reloading = false;

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
      } else {
        if (!reloading) {
          reloading = true;
          window.location.reload();
        }
      }
    };

    localPlayerId = 1000;
    enemyPlayerId = 1001;
  } else {
    const {
      components: c,
      addPlayer,
      addPillar,
    } = makeGame({
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
  let zoom = 2;
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
  const { keyStates, clearKeyStates } = useKeyboard([
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "s",
  ]);
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
    } else if (keyStates["4"]) {
      components.orders[localPlayerId].order = {
        type: "useAbility",
        abilityId: "homing",
        target: { e1: x, e2: y },
      };
    } else if (keyStates["5"]) {
      components.orders[localPlayerId].order = {
        type: "useAbility",
        abilityId: "shield",
      };
    } else if (keyStates["6"]) {
      components.orders[localPlayerId].order = {
        type: "useAbility",
        abilityId: "swap",
        target: { e1: x, e2: y },
      };
    } else if (keyStates["s"]) {
      components.orders[localPlayerId].order = {
        type: "stop",
      };
    }

    clearKeyStates();
  }

  // UI Widgets
  const widgets: {
    container: PIXI.Container;
    update: (components: GameComponent) => void;
  }[] = [];

  const uiContainer = new PIXI.Container();
  uiContainer.zIndex = 10;
  app.stage.addChild(uiContainer);

  for (const playerId of [1000, 1001]) {
    // Cooldown
    {
      const { container, update } = useCooldownWidget(playerId);
      container.position.set(100, 100 + (playerId - 1000) * 400);
      uiContainer.addChild(container);
      widgets.push({ container, update });
    }

    // Shop
    {
      const { container, update } = useShopWidget(
        playerId,
        (abilityId) => {
          buyAbility(playerId, abilityId, components);
        },
        () =>
          (components.players[playerId].ready =
            !components.players[playerId].ready)
      );
      container.position.set(800, 100 + (playerId - 1000) * 400);
      uiContainer.addChild(container);
      widgets.push({ container, update });
    }
  }

  // Game state text (shop time, round time etc.)
  const gameStateText = new PIXI.Text("Shop", {
    align: "center",
    fontSize: 50,
    fill: "white",
    dropShadow: true,
    dropShadowColor: "black",
    dropShadowDistance: 0,
    dropShadowBlur: 5,
  });
  gameStateText.anchor.set(0.5, 0.0);
  gameStateText.position.set(app.view.width / 2, 50);
  app.stage.addChild(gameStateText);

  // Rendering
  const bodyContainers: Record<string, PIXI.Container> = {};
  const REFERENCE_WIDTH = 5_000;
  app.ticker.minFPS = 240;
  app.ticker.maxFPS = 240;

  function render() {
    // Update UI widgets
    widgets.forEach((widget) => widget.update(components));

    // Default scale so that vertical is REFERENCE_WIDTH
    const scale = (zoom * app.view.width) / REFERENCE_WIDTH;
    worldStage.scale = new PIXI.Point(scale, scale);
    worldStage.position = new PIXI.Point(
      app.view.width / 2,
      app.view.height / 2
    );

    // Update game state text
    switch (components.gameState.state.type) {
      case "shop":
        gameStateText.text = `Shop - ${(
          components.gameState.state.duration -
          (components.gameState.frameNumber -
            components.gameState.state.startFrame) *
            components.gameState.deltaTime
        ).toFixed(0)}s`;
        break;
      case "round":
        gameStateText.text = `Round ${components.gameState.round} - ${(
          (components.gameState.frameNumber -
            components.gameState.state.startFrame) *
          components.gameState.deltaTime
        ).toFixed(0)}s`;
        break;
    }

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

      // Cast state
      if (entityId in components.units) {
        const circle = bodyContainers[entityId].children[0] as PIXI.Graphics;
        circle.clear();

        if (entityId in components.shields) {
          circle.beginFill(0x0000ff);
          circle.drawCircle(0, 0, body.radius + 10);
          circle.endFill();
        }

        circle.beginFill(
          components.units[entityId].state.type !== "casting"
            ? 0x00ff00
            : 0xff0000
        );
        circle.drawCircle(0, 0, body.radius);
        circle.endFill();
      }

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

    for (const gameEvent of components.gameEvents.events) {
      console.log(
        "Frame",
        components.gameState.frameNumber,
        "event",
        gameEvent
      );
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
