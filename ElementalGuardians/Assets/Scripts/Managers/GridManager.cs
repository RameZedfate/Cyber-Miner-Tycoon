using System.Collections.Generic;
using UnityEngine;

namespace ElementalGuardians
{
    /// <summary>
    /// Generates the 5x8 battlefield grid automatically. One column is the
    /// enemy path (spawn at top, goal at bottom); every other tile can hold
    /// exactly one tower.
    /// </summary>
    public class GridManager : MonoBehaviour
    {
        public static GridManager Instance { get; private set; }

        [Header("Grid")]
        [SerializeField] private int width = 5;
        [SerializeField] private int height = 8;
        [SerializeField] private float tileSize = 1f;
        [Tooltip("Column enemies walk down. Tiles in this column are not buildable.")]
        [SerializeField] private int pathColumn = 2;

        [Header("References")]
        [SerializeField] private GameObject tilePrefab;

        [Header("Tile Colors")]
        [SerializeField] private Color lightTileColor = new Color(0.30f, 0.42f, 0.32f);
        [SerializeField] private Color darkTileColor = new Color(0.24f, 0.35f, 0.26f);
        [SerializeField] private Color pathTileColor = new Color(0.55f, 0.45f, 0.30f);

        private Tile[,] tiles;
        private readonly List<Vector3> pathWaypoints = new List<Vector3>();

        public int Width => width;
        public int Height => height;
        public float TileSize => tileSize;

        /// <summary>Waypoints from spawn (index 0, above the grid) to goal (below the grid).</summary>
        public IReadOnlyList<Vector3> PathWaypoints => pathWaypoints;

        public Vector3 SpawnPosition => pathWaypoints.Count > 0 ? pathWaypoints[0] : Vector3.zero;

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }

            Instance = this;
            BuildGrid();
            BuildPath();
        }

        private void OnDestroy()
        {
            if (Instance == this)
            {
                Instance = null;
            }
        }

        public Tile GetTile(int x, int y)
        {
            if (tiles == null || x < 0 || x >= width || y < 0 || y >= height)
            {
                return null;
            }

            return tiles[x, y];
        }

        /// <summary>World position of a tile center. Row 0 is the bottom row.</summary>
        public Vector3 TileToWorld(int x, int y)
        {
            float worldX = (x - (width - 1) * 0.5f) * tileSize;
            float worldY = (y - (height - 1) * 0.5f) * tileSize;
            return transform.position + new Vector3(worldX, worldY, 0f);
        }

        private void BuildGrid()
        {
            tiles = new Tile[width, height];
            pathColumn = Mathf.Clamp(pathColumn, 0, width - 1);

            for (int x = 0; x < width; x++)
            {
                for (int y = 0; y < height; y++)
                {
                    GameObject tileObject = CreateTileObject();
                    tileObject.name = $"Tile_{x}_{y}";
                    tileObject.transform.SetParent(transform, false);
                    tileObject.transform.position = TileToWorld(x, y);
                    tileObject.transform.localScale = Vector3.one * tileSize;

                    bool isPath = x == pathColumn;
                    Color color = isPath
                        ? pathTileColor
                        : ((x + y) % 2 == 0 ? lightTileColor : darkTileColor);

                    Tile tile = tileObject.GetComponent<Tile>();
                    tile.Init(x, y, !isPath, color);
                    tiles[x, y] = tile;
                }
            }
        }

        private GameObject CreateTileObject()
        {
            if (tilePrefab != null)
            {
                return Instantiate(tilePrefab);
            }

            // Fallback so the scene still works if the prefab reference is lost.
            GameObject go = new GameObject("Tile", typeof(SpriteRenderer), typeof(BoxCollider2D), typeof(Tile));
            go.GetComponent<SpriteRenderer>().sprite = RuntimeSpriteFactory.Square;
            go.GetComponent<BoxCollider2D>().size = Vector2.one;
            return go;
        }

        private void BuildPath()
        {
            pathWaypoints.Clear();
            pathWaypoints.Add(TileToWorld(pathColumn, height - 1) + Vector3.up * tileSize);
            for (int y = height - 1; y >= 0; y--)
            {
                pathWaypoints.Add(TileToWorld(pathColumn, y));
            }
            pathWaypoints.Add(TileToWorld(pathColumn, 0) + Vector3.down * tileSize);
        }
    }
}
