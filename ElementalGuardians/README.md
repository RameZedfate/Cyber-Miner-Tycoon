# Elemental Guardians (MVP)

A mobile tower defense game built with **Unity 6** for iOS / Android, portrait orientation, 2D fantasy style.

## How to Open & Play

1. Open the `ElementalGuardians/` folder as a project in Unity Hub (Unity 6, e.g. `6000.0.x`).
2. On first open, an editor script (`Tools > Elemental Guardians > Generate Game Assets And Scene`) runs **automatically** and generates:
   - Sprites (`Assets/Sprites`)
   - All prefabs (`Assets/Prefabs`) — Tile, 3 enemies, 2 towers, 2 projectiles
   - The fully wired sample scene `Assets/Scenes/Main.unity` (also added to Build Settings)
   - Portrait-only player settings
3. Open `Assets/Scenes/Main.unity` (the generator opens it for you) and press **Play**.

If anything is ever deleted, re-run **Tools > Elemental Guardians > Generate Game Assets And Scene**.

## Core Loop

- Enemies spawn at the **top** and walk down the path column to the goal at the **bottom**.
- Tap a free grass tile to build the currently selected tower (Fire or Water — choose at the bottom).
- Towers automatically attack the nearest enemy in range; kills award gold.
- **Win:** clear all 10 waves → "Victory". **Lose:** an enemy reaches the goal → "Defeat".
- **Add Gold** button grants +100 gold (MVP testing economy — no IAP/shop/pass/login).

## Systems (per the design doc)

| System | Implementation |
|---|---|
| Gold | Start 100, +100 button, kills award gold (`GameManager`) |
| Grid | Auto-generated 5×8, one tower per tile (`GridManager`, `Tile`) |
| Placement | Tap tile → checks gold & occupancy (`TowerPlacer`) |
| Spawning | Top spawn, bottom goal, 10 waves, Normal/Fast/Tank (`WaveManager`, `EnemySpawner`) |
| Combat | Auto-target nearest, pooled homing projectiles (`Tower`, `Projectile`, `Enemy`) |

**Towers:** Fire — 50g, 10 dmg, 1s, range 3. Water — 50g, 5 dmg, 1s, range 3, slows 30% for 2s.
**Elements:** `Element` enum contains Fire/Water/Nature/Light/Dark/Hell; combinations intentionally not implemented in MVP.

## Architecture Notes

- Managers use the **singleton** pattern (`GameManager`, `GridManager`, `WaveManager`, `PoolManager`, `EnemySpawner`, `TowerPlacer`, `UIManager`).
- Enemies and projectiles use **object pooling** (`PoolManager` + `PooledObject`).
- **UI is fully separated** from gameplay: `UIManager` only listens to manager events and forwards button presses.
- No hardcoded cross-references: scene references are wired in the generated scene/prefabs and **all values are editable in the Inspector** (tower stats, enemy stats, wave list, colors, grid size...).

## Folder Structure

```
Assets/
  Editor/            Project generator (sprites, prefabs, scene)
  Scripts/
    Managers/        GameManager, GridManager, WaveManager, PoolManager, PooledObject
    Enemies/         Enemy, EnemySpawner
    Towers/          Tower, TowerPlacer, Projectile
    UI/              UIManager
    Element.cs, Tile.cs, CameraFitter.cs, RuntimeSpriteFactory.cs
  Prefabs/           Tile + Enemies/ + Towers/   (generated)
  Sprites/           square.png, circle.png      (generated)
  Scenes/            Main.unity                  (generated)
```
