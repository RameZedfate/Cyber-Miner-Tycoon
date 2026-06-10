/* ============================================================
 * FlightEngine UI 邏輯
 * 負責：表單互動、搜尋結果渲染、排序/篩選、即期特價、
 *       模擬即時價格更新
 * ============================================================ */
(function () {
  'use strict';

  const { AIRPORTS, generateFlights, generateLastMinuteDeals } = window.FlightEngine;

  const REGION_LABELS = {
    tw: '台灣',
    ne: '東北亞（日韓港澳）',
    cn: '中國',
    se: '東南亞',
    far: '長程線（歐美澳）',
  };

  // ---- DOM 參照 ----
  const originSelect = document.getElementById('origin');
  const destinationSelect = document.getElementById('destination');
  const swapBtn = document.getElementById('swap-btn');
  const departDateInput = document.getElementById('depart-date');
  const returnDateInput = document.getElementById('return-date');
  const returnDateField = document.getElementById('return-date-field');
  const tripTypeRadios = document.querySelectorAll('input[name="tripType"]');
  const passengersInput = document.getElementById('passengers');
  const cabinSelect = document.getElementById('cabin');
  const searchForm = document.getElementById('search-form');

  const toolbar = document.getElementById('toolbar');
  const sortSelect = document.getElementById('sort-select');
  const filterDirect = document.getElementById('filter-direct');
  const filterBaggage = document.getElementById('filter-baggage');
  const resultCount = document.getElementById('result-count');
  const flightList = document.getElementById('flight-list');

  const dealsScroll = document.getElementById('deals-scroll');
  const dealsUpdated = document.getElementById('deals-updated');

  let currentFlights = [];
  let livePriceTimer = null;

  // ---- 初始化：機場下拉選單 ----
  function buildAirportOptions(select, defaultCode) {
    const groups = {};
    AIRPORTS.forEach((airport) => {
      groups[airport.region] = groups[airport.region] || [];
      groups[airport.region].push(airport);
    });

    Object.keys(REGION_LABELS).forEach((region) => {
      if (!groups[region]) return;
      const optgroup = document.createElement('optgroup');
      optgroup.label = REGION_LABELS[region];
      groups[region].forEach((airport) => {
        const opt = document.createElement('option');
        opt.value = airport.code;
        opt.textContent = `${airport.city} (${airport.code}) - ${airport.name}`;
        if (airport.code === defaultCode) opt.selected = true;
        optgroup.appendChild(opt);
      });
      select.appendChild(optgroup);
    });
  }

  function initDateDefaults() {
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(today.getTime() + 8 * 24 * 60 * 60 * 1000);
    const toInputValue = (d) => d.toISOString().slice(0, 10);

    departDateInput.min = toInputValue(today);
    departDateInput.value = toInputValue(tomorrow);
    returnDateInput.min = toInputValue(tomorrow);
    returnDateInput.value = toInputValue(nextWeek);
  }

  // ---- 表單互動 ----
  tripTypeRadios.forEach((radio) => {
    radio.addEventListener('change', (e) => {
      returnDateField.style.display = e.target.value === 'roundtrip' ? 'flex' : 'none';
      returnDateInput.required = e.target.value === 'roundtrip';
    });
  });

  swapBtn.addEventListener('click', () => {
    const tmp = originSelect.value;
    originSelect.value = destinationSelect.value;
    destinationSelect.value = tmp;
  });

  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    runSearch();
  });

  [sortSelect, filterDirect, filterBaggage].forEach((el) => {
    el.addEventListener('change', renderResults);
  });

  // ---- 搜尋 ----
  function runSearch() {
    const origin = originSelect.value;
    const destination = destinationSelect.value;
    const date = departDateInput.value;
    const passengers = Number(passengersInput.value) || 1;
    const cabin = cabinSelect.value;

    if (origin === destination) {
      flightList.innerHTML = '<p class="empty-state">出發地與目的地不能相同，請重新選擇。</p>';
      toolbar.style.display = 'none';
      return;
    }

    currentFlights = generateFlights({ origin, destination, date, passengers, cabin });
    toolbar.style.display = 'flex';
    renderResults();
    startLiveUpdates();
  }

  // ---- 排序 / 篩選 / 渲染結果 ----
  function renderResults() {
    let flights = [...currentFlights];

    if (filterDirect.checked) {
      flights = flights.filter((f) => f.stops === 0);
    }
    if (filterBaggage.checked) {
      flights = flights.filter((f) => f.baggage.checked.included);
    }

    switch (sortSelect.value) {
      case 'duration':
        flights.sort((a, b) => a.durationMinutes - b.durationMinutes);
        break;
      case 'depart':
        flights.sort((a, b) => a.departTime.localeCompare(b.departTime));
        break;
      case 'price':
      default:
        flights.sort((a, b) => a.lowestPrice.price - b.lowestPrice.price);
        break;
    }

    resultCount.textContent = `共找到 ${flights.length} 筆航班・最後更新 ${nowTimeLabel()}`;

    if (!flights.length) {
      flightList.innerHTML = '<p class="empty-state">沒有符合篩選條件的航班，試試調整篩選設定。</p>';
      return;
    }

    flightList.innerHTML = flights.map(renderFlightCard).join('');

    // 綁定「查看比價明細」展開/收合
    flightList.querySelectorAll('.compare-toggle').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = document.getElementById(btn.dataset.target);
        target.classList.toggle('open');
        btn.textContent = target.classList.contains('open') ? '收合比價明細 ▲' : '查看比價明細 ▼';
      });
    });

    // 綁定「前往訂購」按鈕
    flightList.querySelectorAll('.book-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        showToast(`已選擇 ${btn.dataset.platform} 的價格 NT$${Number(btn.dataset.price).toLocaleString()}（示範資料，尚未串接真實訂購連結）`);
      });
    });
  }

  function renderFlightCard(flight) {
    const baggage = flight.baggage;
    const checkedLabel = baggage.checked.included
      ? `已含 ${baggage.checked.allowance}`
      : `${baggage.checked.allowance}・約 NT$${baggage.checked.addOnPrice}`;

    const stopsLabel = flight.stops === 0
      ? '直飛'
      : `轉機 ${flight.stops} 次（約 ${Math.floor(flight.layoverMinutes / 60)} 小時 ${String(flight.layoverMinutes % 60).padStart(2, '0')} 分）`;

    const dayOffset = flight.arriveDayOffset > 0 ? `<span class="day-offset">+${flight.arriveDayOffset}</span>` : '';
    const cabinLabel = { economy: '經濟艙', premium: '豪華經濟艙', business: '商務艙', first: '頭等艙' }[flight.cabin];
    const tagClass = flight.airline.type === 'lcc' ? 'lcc-tag' : 'fsc-tag';
    const tagLabel = flight.airline.type === 'lcc' ? '廉價航空' : '傳統航空';

    const compareId = `compare-${flight.id}`;
    const priceRows = flight.prices.map((p, idx) => `
      <div class="row ${idx === 0 ? 'best' : ''}">
        <span>${p.platform}${idx === 0 ? '（最低價）' : ''}</span>
        <span>NT$${p.price.toLocaleString()}</span>
      </div>
    `).join('');

    return `
      <article class="flight-card">
        <div class="flight-main">
          <div class="airline-row">
            <span class="airline-dot" style="background:${flight.airline.color}"></span>
            <span>${flight.airline.name}</span>
            <span class="flight-number">${flight.flightNumber}</span>
            <span class="${tagClass}">${tagLabel}</span>
          </div>

          <div class="route-row">
            <div class="route-time">
              <div class="time">${flight.departTime}</div>
              <div class="code">${flight.origin.code}</div>
              <div class="city">${flight.origin.city}</div>
            </div>
            <div class="route-line">
              <div class="duration">${flight.durationLabel}</div>
              <div class="line"></div>
              <div class="stops ${flight.stops === 0 ? 'direct' : ''}">${stopsLabel}</div>
            </div>
            <div class="route-time">
              <div class="time">${flight.arriveTime}${dayOffset}</div>
              <div class="code">${flight.destination.code}</div>
              <div class="city">${flight.destination.city}</div>
            </div>
          </div>

          <div class="detail-row">
            <span class="item">🎫 <strong>${cabinLabel}</strong></span>
            <span class="item">🎒 手提行李：<strong>${baggage.carryOn}</strong></span>
            <span class="item">🧳 托運行李：<strong>${checkedLabel}</strong></span>
            <span class="item">👤 ${flight.passengers} 位乘客</span>
          </div>

          <button class="compare-toggle" data-target="${compareId}">查看比價明細 ▼</button>
          <div class="price-compare" id="${compareId}">
            ${priceRows}
          </div>
        </div>

        <div class="flight-price">
          <div>
            <div class="price-label">最低價（含稅）</div>
            <div class="price-value">NT$${flight.lowestPrice.price.toLocaleString()}</div>
            <div class="price-platform">來自 ${flight.lowestPrice.platform}</div>
          </div>
          <button class="book-btn" data-platform="${flight.lowestPrice.platform}" data-price="${flight.lowestPrice.price}">前往訂購</button>
        </div>
      </article>
    `;
  }

  // ---- 即期特價 ----
  function renderDeals() {
    const origin = originSelect.value || 'TPE';
    const deals = generateLastMinuteDeals({ origin, hoursAhead: 72, count: 8 });

    if (!deals.length) {
      dealsScroll.innerHTML = '<p class="empty-state">目前沒有即期特價</p>';
      return;
    }

    dealsScroll.innerHTML = deals.map((deal) => {
      const countdown = formatCountdown(deal.departTimestamp);
      return `
        <article class="deal-card">
          <span class="badge">省 ${deal.discountPercent}%</span>
          <p class="route">${deal.origin.city} ✈ ${deal.destination.city}</p>
          <p class="meta">${deal.airline.name} ${deal.flightNumber}</p>
          <p class="meta">${deal.departDateLabel} 出發・${deal.durationLabel}</p>
          <p class="meta">${deal.stops === 0 ? '直飛' : `轉機 ${deal.stops} 次`}</p>
          <div class="price-row">
            <span class="price">NT$${deal.dealPrice.toLocaleString()}</span>
            <span class="original-price">NT$${deal.originalPrice.toLocaleString()}</span>
          </div>
          <p class="countdown">⏰ ${countdown}</p>
        </article>
      `;
    }).join('');

    dealsUpdated.innerHTML = `<span class="live-dot"></span>最後更新 ${nowTimeLabel()}`;
  }

  function formatCountdown(timestamp) {
    const diffMs = timestamp - Date.now();
    if (diffMs <= 0) return '即將起飛';
    const totalMinutes = Math.floor(diffMs / 60000);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;
    if (days > 0) return `${days} 天 ${hours} 小時後出發`;
    if (hours > 0) return `${hours} 小時 ${minutes} 分後出發`;
    return `${minutes} 分鐘後出發`;
  }

  // ---- 模擬即時更新 ----
  function startLiveUpdates() {
    if (livePriceTimer) clearInterval(livePriceTimer);
    livePriceTimer = setInterval(() => {
      // 模擬即時價格小幅波動
      currentFlights.forEach((flight) => {
        flight.prices = flight.prices.map((p) => {
          const variancePercent = (Math.random() - 0.5) * 4; // ±2%
          const newPrice = Math.max(500, Math.round((p.price * (100 + variancePercent)) / 100 / 10) * 10);
          return { ...p, price: newPrice };
        }).sort((a, b) => a.price - b.price);
        flight.lowestPrice = flight.prices[0];
      });
      renderResults();
    }, 20000);
  }

  function nowTimeLabel() {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  }

  // ---- 簡易 Toast 提示 ----
  let toastTimer = null;
  function showToast(message) {
    let toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      toast.style.cssText = `
        position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
        background: #1f2430; color: #fff; padding: 0.6rem 1rem; border-radius: 8px;
        font-size: 0.85rem; box-shadow: 0 4px 12px rgba(0,0,0,0.2); z-index: 1000;
        max-width: 90vw; text-align: center; opacity: 0; transition: opacity 0.2s ease;
      `;
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    requestAnimationFrame(() => { toast.style.opacity = '1'; });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.style.opacity = '0'; }, 3000);
  }

  // ---- 啟動 ----
  function init() {
    buildAirportOptions(originSelect, 'TPE');
    buildAirportOptions(destinationSelect, 'NRT');
    initDateDefaults();
    renderDeals();
    setInterval(renderDeals, 60000); // 每 60 秒刷新一次即期特價（含倒數計時）
  }

  init();
})();
