using UnityEngine;

namespace ElementalGuardians
{
    /// <summary>
    /// A single grid cell. Holds at most one tower; path tiles are not buildable.
    /// </summary>
    [RequireComponent(typeof(BoxCollider2D))]
    public class Tile : MonoBehaviour
    {
        [SerializeField] private SpriteRenderer spriteRenderer;

        public int X { get; private set; }
        public int Y { get; private set; }
        public bool IsBuildable { get; private set; }
        public Tower OccupyingTower { get; private set; }
        public bool IsOccupied => OccupyingTower != null;

        private void Awake()
        {
            if (spriteRenderer == null)
            {
                spriteRenderer = GetComponent<SpriteRenderer>();
            }
        }

        public void Init(int x, int y, bool buildable, Color color)
        {
            X = x;
            Y = y;
            IsBuildable = buildable;

            if (spriteRenderer == null)
            {
                spriteRenderer = GetComponent<SpriteRenderer>();
            }
            if (spriteRenderer != null)
            {
                spriteRenderer.color = color;
            }
        }

        public void Place(Tower tower)
        {
            OccupyingTower = tower;
        }
    }
}
