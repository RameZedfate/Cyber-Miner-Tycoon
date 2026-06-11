using System;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace ElementalGuardians
{
    public enum GameState
    {
        Playing,
        Victory,
        Defeat
    }

    /// <summary>
    /// Central game state: gold economy, lives, win/lose conditions.
    /// Gameplay scripts talk to this singleton; UI listens to its events.
    /// </summary>
    public class GameManager : MonoBehaviour
    {
        public static GameManager Instance { get; private set; }

        [Header("Economy")]
        [SerializeField] private int startingGold = 100;
        [SerializeField] private int addGoldAmount = 100;

        [Header("Defense")]
        [Tooltip("How many enemies may reach the goal before defeat.")]
        [SerializeField] private int startingLives = 1;

        public int CurrentGold { get; private set; }
        public int CurrentLives { get; private set; }
        public GameState State { get; private set; } = GameState.Playing;
        public int AddGoldAmount => addGoldAmount;

        public event Action<int> GoldChanged;
        public event Action<int> LivesChanged;
        public event Action<GameState> StateChanged;

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }

            Instance = this;
            CurrentGold = startingGold;
            CurrentLives = startingLives;
            State = GameState.Playing;
            Time.timeScale = 1f;
        }

        private void OnDestroy()
        {
            if (Instance == this)
            {
                Instance = null;
            }
        }

        public void AddGold(int amount)
        {
            if (amount <= 0 || State != GameState.Playing)
            {
                return;
            }

            CurrentGold += amount;
            GoldChanged?.Invoke(CurrentGold);
        }

        public bool TrySpendGold(int amount)
        {
            if (State != GameState.Playing || amount < 0 || CurrentGold < amount)
            {
                return false;
            }

            CurrentGold -= amount;
            GoldChanged?.Invoke(CurrentGold);
            return true;
        }

        /// <summary>Called by an Enemy when it reaches the goal point.</summary>
        public void OnEnemyReachedGoal()
        {
            if (State != GameState.Playing)
            {
                return;
            }

            CurrentLives = Mathf.Max(0, CurrentLives - 1);
            LivesChanged?.Invoke(CurrentLives);

            if (CurrentLives <= 0)
            {
                SetState(GameState.Defeat);
            }
        }

        /// <summary>Called by the WaveManager once every wave is cleared.</summary>
        public void NotifyAllWavesCleared()
        {
            if (State == GameState.Playing)
            {
                SetState(GameState.Victory);
            }
        }

        public void RestartGame()
        {
            Time.timeScale = 1f;
            SceneManager.LoadScene(SceneManager.GetActiveScene().buildIndex);
        }

        private void SetState(GameState newState)
        {
            if (State == newState)
            {
                return;
            }

            State = newState;
            Time.timeScale = newState == GameState.Playing ? 1f : 0f;
            StateChanged?.Invoke(newState);
        }
    }
}
