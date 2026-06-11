using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

namespace ElementalGuardians
{
    /// <summary>
    /// Pure presentation layer: displays gold/wave/lives, drives the Add Gold
    /// and tower-selection buttons, and shows the Victory/Defeat panels.
    /// Reads game state only through manager events — no gameplay logic here.
    /// </summary>
    public class UIManager : MonoBehaviour
    {
        public static UIManager Instance { get; private set; }

        [Header("HUD")]
        [SerializeField] private Text goldText;
        [SerializeField] private Text waveText;
        [SerializeField] private Text livesText;
        [SerializeField] private Button addGoldButton;

        [Header("Tower Selection")]
        [Tooltip("Index-aligned with TowerPlacer's tower options.")]
        [SerializeField] private List<Button> towerButtons = new List<Button>();
        [Tooltip("Highlight frames toggled to show the selected tower button.")]
        [SerializeField] private List<GameObject> towerSelectionFrames = new List<GameObject>();

        [Header("End Panels")]
        [SerializeField] private GameObject victoryPanel;
        [SerializeField] private GameObject defeatPanel;
        [SerializeField] private Button victoryRestartButton;
        [SerializeField] private Button defeatRestartButton;

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

            if (GameManager.Instance != null)
            {
                GameManager.Instance.GoldChanged -= HandleGoldChanged;
                GameManager.Instance.LivesChanged -= HandleLivesChanged;
                GameManager.Instance.StateChanged -= HandleStateChanged;
            }

            if (WaveManager.Instance != null)
            {
                WaveManager.Instance.WaveChanged -= HandleWaveChanged;
            }

            if (TowerPlacer.Instance != null)
            {
                TowerPlacer.Instance.SelectionChanged -= HandleSelectionChanged;
            }
        }

        private void Start()
        {
            if (GameManager.Instance != null)
            {
                GameManager.Instance.GoldChanged += HandleGoldChanged;
                GameManager.Instance.LivesChanged += HandleLivesChanged;
                GameManager.Instance.StateChanged += HandleStateChanged;
                HandleGoldChanged(GameManager.Instance.CurrentGold);
                HandleLivesChanged(GameManager.Instance.CurrentLives);
            }

            if (WaveManager.Instance != null)
            {
                WaveManager.Instance.WaveChanged += HandleWaveChanged;
                HandleWaveChanged(WaveManager.Instance.CurrentWave, WaveManager.Instance.TotalWaves);
            }

            if (TowerPlacer.Instance != null)
            {
                TowerPlacer.Instance.SelectionChanged += HandleSelectionChanged;
                HandleSelectionChanged(TowerPlacer.Instance.SelectedIndex);
            }

            WireButtons();

            if (victoryPanel != null)
            {
                victoryPanel.SetActive(false);
            }
            if (defeatPanel != null)
            {
                defeatPanel.SetActive(false);
            }
        }

        private void WireButtons()
        {
            if (addGoldButton != null)
            {
                addGoldButton.onClick.AddListener(OnAddGoldClicked);
            }

            for (int i = 0; i < towerButtons.Count; i++)
            {
                if (towerButtons[i] == null)
                {
                    continue;
                }

                int index = i;
                towerButtons[i].onClick.AddListener(() => OnTowerButtonClicked(index));
            }

            if (victoryRestartButton != null)
            {
                victoryRestartButton.onClick.AddListener(OnRestartClicked);
            }
            if (defeatRestartButton != null)
            {
                defeatRestartButton.onClick.AddListener(OnRestartClicked);
            }
        }

        private void OnAddGoldClicked()
        {
            if (GameManager.Instance != null)
            {
                GameManager.Instance.AddGold(GameManager.Instance.AddGoldAmount);
            }
        }

        private void OnTowerButtonClicked(int index)
        {
            if (TowerPlacer.Instance != null)
            {
                TowerPlacer.Instance.SelectTower(index);
            }
        }

        private void OnRestartClicked()
        {
            if (GameManager.Instance != null)
            {
                GameManager.Instance.RestartGame();
            }
        }

        private void HandleGoldChanged(int gold)
        {
            if (goldText != null)
            {
                goldText.text = $"Gold: {gold}";
            }
        }

        private void HandleLivesChanged(int lives)
        {
            if (livesText != null)
            {
                livesText.text = $"Lives: {lives}";
            }
        }

        private void HandleWaveChanged(int current, int total)
        {
            if (waveText != null)
            {
                waveText.text = current <= 0 ? $"Get Ready! ({total} waves)" : $"Wave: {current} / {total}";
            }
        }

        private void HandleSelectionChanged(int selectedIndex)
        {
            for (int i = 0; i < towerSelectionFrames.Count; i++)
            {
                if (towerSelectionFrames[i] != null)
                {
                    towerSelectionFrames[i].SetActive(i == selectedIndex);
                }
            }
        }

        private void HandleStateChanged(GameState state)
        {
            if (victoryPanel != null)
            {
                victoryPanel.SetActive(state == GameState.Victory);
            }
            if (defeatPanel != null)
            {
                defeatPanel.SetActive(state == GameState.Defeat);
            }
        }
    }
}
