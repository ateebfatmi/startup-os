import type { ServerPlayer } from "./types.js";

/**
 * Grid-based spatial partitioning for virtual offices.
 * Cell size of 10m x 10m allows fast neighbor queries for proximity audio & rendering culling.
 */
export class SpatialPartitioning {
  private cellSize: number;
  private cells: Map<string, Set<string>> = new Map();

  constructor(cellSize: number = 8) {
    this.cellSize = cellSize;
  }

  private getCellKey(x: number, z: number): string {
    const cx = Math.floor(x / this.cellSize);
    const cz = Math.floor(z / this.cellSize);
    return `${cx}:${cz}`;
  }

  updatePlayer(player: ServerPlayer): void {
    const key = this.getCellKey(player.x, player.z);
    
    // Remove from previous cell if different
    for (const [cellKey, players] of this.cells.entries()) {
      if (cellKey !== key && players.has(player.id)) {
        players.delete(player.id);
      }
    }

    if (!this.cells.has(key)) {
      this.cells.set(key, new Set());
    }
    this.cells.get(key)!.add(player.id);
  }

  removePlayer(playerId: string): void {
    for (const players of this.cells.values()) {
      players.delete(playerId);
    }
  }

  /**
   * Returns player IDs in the player's cell and immediately adjacent 8 cells.
   */
  getNearbyPlayerIds(x: number, z: number): string[] {
    const cx = Math.floor(x / this.cellSize);
    const cz = Math.floor(z / this.cellSize);
    const nearby = new Set<string>();

    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const key = `${cx + dx}:${cz + dz}`;
        const cell = this.cells.get(key);
        if (cell) {
          for (const id of cell) {
            nearby.add(id);
          }
        }
      }
    }

    return Array.from(nearby);
  }
}
