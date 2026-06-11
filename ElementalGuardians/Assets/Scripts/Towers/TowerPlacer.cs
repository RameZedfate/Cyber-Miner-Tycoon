using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.EventSystems;

namespace ElementalGuardians
{
    /// <summary>
    /// Handles tile taps: if the selected tower is affordable and the tile is
    /// free and buildable, the tower is placed and gold is spent. Occupied or
    /// path tiles are ignored.
    /// </summary>
    public class TowerPlacer : MonoBehaviour
    {
        [Serializable]
        public class TowerOption
        {
            public string displayName = "Tower";
            public GameObject prefab;
        }

        public static TowerPlacer Instance { get; private set; }

        [SerializeField] private List<TowerOption> towerOptions = new List<TowerOption>();

        public int SelectedIndex { get; private set; }
        public IReadOnlyList<TowerOption> TowerOptions => towerOptions;

        public event Action<int> SelectionChanged;

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }

            Instance = this;
        }

        private void OnDestroy()
        {
            if (Instance == this)
            {
                Instance = null;
            }
        }

        public void SelectTower(int index)
        {
            if (index < 0 || index >= towerOptions.Count || index == SelectedIndex)
            {
                return;
            }

            SelectedIndex = index;
            SelectionChanged?.Invoke(SelectedIndex);
        }

        private void Update()
        {
            if (GameManager.Instance != null && GameManager.Instance.State != GameState.Playing)
            {
                return;
            }

            if (!Input.GetMouseButtonDown(0) || IsPointerOverUI())
            {
                return;
            }

            Camera cam = Camera.main;
            if (cam == null)
            {
                return;
            }

            Vector2 worldPoint = cam.ScreenToWorldPoint(Input.mousePosition);
            Collider2D hit = Physics2D.OverlapPoint(worldPoint);
            if (hit == null)
            {
                return;
            }

            Tile tile = hit.GetComponentInParent<Tile>();
            if (tile != null)
            {
                TryPlaceTower(tile);
            }
        }

        public bool TryPlaceTower(Tile tile)
        {
            if (tile == null || !tile.IsBuildable || tile.IsOccupied)
            {
                return false;
            }

            if (towerOptions.Count == 0)
            {
                return false;
            }

            TowerOption option = towerOptions[Mathf.Clamp(SelectedIndex, 0, towerOptions.Count - 1)];
            if (option.prefab == null)
            {
                return false;
            }

            Tower towerTemplate = option.prefab.GetComponent<Tower>();
            int cost = towerTemplate != null ? towerTemplate.Cost : 0;

            if (GameManager.Instance == null || !GameManager.Instance.TrySpendGold(cost))
            {
                return false;
            }

            GameObject instance = Instantiate(option.prefab, tile.transform.position, Quaternion.identity);
            tile.Place(instance.GetComponent<Tower>());
            return true;
        }

        private static bool IsPointerOverUI()
        {
            if (EventSystem.current == null)
            {
                return false;
            }

            if (Input.touchCount > 0)
            {
                return EventSystem.current.IsPointerOverGameObject(Input.GetTouch(0).fingerId);
            }

            return EventSystem.current.IsPointerOverGameObject();
        }
    }
}
