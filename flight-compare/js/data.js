/* ============================================================
 * FlightEngine.data
 * 機場、航空公司、比價平台等基礎資料庫（模擬資料）
 *
 * 之後若要接上真實機票 API（例如 Amadeus、Skyscanner、
 * AviationStack 等），只需要替換 generateFlights() /
 * generateLastMinuteDeals() 內部的資料來源即可，
 * 回傳的物件結構（flight schema）保持不變即可讓畫面正常運作。
 * ============================================================ */
(function (global) {
  'use strict';

  // 機場資料庫：code / city（中文城市名）/ name（機場全名）/ country / region
  const AIRPORTS = [
    { code: 'TPE', city: '台北', name: '桃園國際機場', country: '台灣', region: 'tw' },
    { code: 'TSA', city: '台北', name: '松山機場', country: '台灣', region: 'tw' },
    { code: 'KHH', city: '高雄', name: '小港國際機場', country: '台灣', region: 'tw' },
    { code: 'RMQ', city: '台中', name: '台中國際機場', country: '台灣', region: 'tw' },
    { code: 'NRT', city: '東京', name: '成田國際機場', country: '日本', region: 'ne' },
    { code: 'HND', city: '東京', name: '羽田機場', country: '日本', region: 'ne' },
    { code: 'KIX', city: '大阪', name: '關西國際機場', country: '日本', region: 'ne' },
    { code: 'FUK', city: '福岡', name: '福岡機場', country: '日本', region: 'ne' },
    { code: 'OKA', city: '沖繩', name: '那霸機場', country: '日本', region: 'ne' },
    { code: 'ICN', city: '首爾', name: '仁川國際機場', country: '韓國', region: 'ne' },
    { code: 'GMP', city: '首爾', name: '金浦機場', country: '韓國', region: 'ne' },
    { code: 'HKG', city: '香港', name: '香港國際機場', country: '香港', region: 'ne' },
    { code: 'MFM', city: '澳門', name: '澳門國際機場', country: '澳門', region: 'ne' },
    { code: 'PVG', city: '上海', name: '浦東國際機場', country: '中國', region: 'cn' },
    { code: 'PEK', city: '北京', name: '首都國際機場', country: '中國', region: 'cn' },
    { code: 'CAN', city: '廣州', name: '白雲國際機場', country: '中國', region: 'cn' },
    { code: 'BKK', city: '曼谷', name: '蘇凡納布機場', country: '泰國', region: 'se' },
    { code: 'DMK', city: '曼谷', name: '廊曼機場', country: '泰國', region: 'se' },
    { code: 'SIN', city: '新加坡', name: '樟宜機場', country: '新加坡', region: 'se' },
    { code: 'KUL', city: '吉隆坡', name: '吉隆坡國際機場', country: '馬來西亞', region: 'se' },
    { code: 'MNL', city: '馬尼拉', name: '尼諾伊艾奎諾機場', country: '菲律賓', region: 'se' },
    { code: 'CEB', city: '宿霧', name: '麥克坦宿霧機場', country: '菲律賓', region: 'se' },
    { code: 'SGN', city: '胡志明市', name: '新山一機場', country: '越南', region: 'se' },
    { code: 'HAN', city: '河內', name: '內排國際機場', country: '越南', region: 'se' },
    { code: 'DAD', city: '峴港', name: '峴港國際機場', country: '越南', region: 'se' },
    { code: 'LAX', city: '洛杉磯', name: '洛杉磯國際機場', country: '美國', region: 'far' },
    { code: 'SFO', city: '舊金山', name: '舊金山國際機場', country: '美國', region: 'far' },
    { code: 'JFK', city: '紐約', name: '甘迺迪國際機場', country: '美國', region: 'far' },
    { code: 'LHR', city: '倫敦', name: '希斯洛機場', country: '英國', region: 'far' },
    { code: 'CDG', city: '巴黎', name: '戴高樂機場', country: '法國', region: 'far' },
    { code: 'FRA', city: '法蘭克福', name: '法蘭克福機場', country: '德國', region: 'far' },
    { code: 'SYD', city: '雪梨', name: '雪梨機場', country: '澳洲', region: 'far' },
  ];

  // 航空公司資料庫（含行李政策，這是使用者最在意的資訊之一）
  const AIRLINES = [
    { code: 'CI', name: '中華航空', type: 'fsc', color: '#c8102e',
      carryOn: '1 件，最重 7kg', checked: { included: true, allowance: '23kg x2 件' } },
    { code: 'BR', name: '長榮航空', type: 'fsc', color: '#00603a',
      carryOn: '1 件，最重 7kg', checked: { included: true, allowance: '23kg x2 件' } },
    { code: 'JX', name: '星宇航空', type: 'fsc', color: '#1d2951',
      carryOn: '1 件，最重 7kg', checked: { included: true, allowance: '23kg x1 件' } },
    { code: 'AE', name: '華信航空', type: 'fsc', color: '#005baa',
      carryOn: '1 件，最重 7kg', checked: { included: true, allowance: '20kg x1 件' } },
    { code: 'CX', name: '國泰航空', type: 'fsc', color: '#006564',
      carryOn: '2 件，共 14kg', checked: { included: true, allowance: '23kg x1 件' } },
    { code: 'JL', name: '日本航空', type: 'fsc', color: '#c8000a',
      carryOn: '1 件，最重 10kg', checked: { included: true, allowance: '23kg x2 件' } },
    { code: 'NH', name: '全日空', type: 'fsc', color: '#13448f',
      carryOn: '1 件，最重 10kg', checked: { included: true, allowance: '23kg x2 件' } },
    { code: 'KE', name: '大韓航空', type: 'fsc', color: '#0060a9',
      carryOn: '1 件，最重 10kg', checked: { included: true, allowance: '23kg x1 件' } },
    { code: 'OZ', name: '韓亞航空', type: 'fsc', color: '#8e2148',
      carryOn: '1 件，最重 10kg', checked: { included: true, allowance: '23kg x1 件' } },
    { code: 'TG', name: '泰國航空', type: 'fsc', color: '#5b0c8c',
      carryOn: '1 件，最重 7kg', checked: { included: true, allowance: '30kg' } },
    { code: 'SQ', name: '新加坡航空', type: 'fsc', color: '#0a3161',
      carryOn: '1 件，最重 7kg', checked: { included: true, allowance: '30kg' } },
    { code: 'IT', name: '台灣虎航', type: 'lcc', color: '#f37021',
      carryOn: '1 件，最重 10kg', checked: { included: false, addOnPrice: 800, allowance: '20kg（需加購）' } },
    { code: 'MM', name: '樂桃航空', type: 'lcc', color: '#e4002b',
      carryOn: '1 件，最重 7kg', checked: { included: false, addOnPrice: 1000, allowance: '20kg（需加購）' } },
    { code: 'VJ', name: '越捷航空', type: 'lcc', color: '#cc0033',
      carryOn: '1 件，最重 7kg', checked: { included: false, addOnPrice: 600, allowance: '20kg（需加購）' } },
    { code: 'AK', name: 'AirAsia', type: 'lcc', color: '#ff0000',
      carryOn: '1 件，最重 7kg', checked: { included: false, addOnPrice: 700, allowance: '20kg（需加購）' } },
    { code: '5J', name: '宿霧太平洋航空', type: 'lcc', color: '#fdb913',
      carryOn: '1 件，最重 7kg', checked: { included: false, addOnPrice: 650, allowance: '20kg（需加購）' } },
  ];

  // 比價平台（用來模擬「同一航班、不同訂票網站價格不同」）
  const PLATFORMS = [
    { id: 'official', name: '航空公司官網' },
    { id: 'trip', name: 'Trip.com' },
    { id: 'eztravel', name: '易遊網 ezTravel' },
    { id: 'kayak', name: 'KAYAK' },
    { id: 'expedia', name: 'Expedia' },
    { id: 'skyscanner', name: 'Skyscanner' },
    { id: 'colatour', name: '可樂旅遊' },
  ];

  // ---- 工具函式 ----
  function findAirport(code) {
    return AIRPORTS.find((a) => a.code === code);
  }

  // 簡單字串雜湊，讓同樣的航線/日期每次產生「一致」的模擬結果
  function hashString(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (h << 5) - h + str.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  }

  // 簡易亂數產生器（可用 seed 重現結果）
  function mulberry32(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // 依出發/抵達機場所屬地區，估算飛行時間（分鐘）區間
  function durationRangeFor(originRegion, destRegion) {
    if (originRegion === destRegion && originRegion === 'tw') return [50, 75]; // 台灣國內線
    if (originRegion === 'far' || destRegion === 'far') return [600, 900]; // 長程線（美洲/歐洲/澳洲）
    if (originRegion === 'cn' || destRegion === 'cn') return [100, 200]; // 兩岸航線
    if (originRegion === 'se' || destRegion === 'se') return [180, 320]; // 東南亞航線
    return [90, 220]; // 東北亞航線（日韓港澳）
  }

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function formatTime(minutesFromMidnight) {
    const m = ((minutesFromMidnight % 1440) + 1440) % 1440;
    const h = Math.floor(m / 60);
    const mi = m % 60;
    return `${pad2(h)}:${pad2(mi)}`;
  }

  function formatDuration(totalMinutes) {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h} 小時 ${pad2(m)} 分`;
  }

  // 產生一個介於 [min, max] 的整數（使用提供的亂數函式）
  function randInt(rand, min, max) {
    return Math.floor(rand() * (max - min + 1)) + min;
  }

  /**
   * 產生指定航線/日期的航班清單
   * @param {Object} params
   * @param {string} params.origin 出發機場代碼
   * @param {string} params.destination 抵達機場代碼
   * @param {string} params.date 出發日期 (YYYY-MM-DD)
   * @param {number} [params.passengers=1] 乘客數
   * @param {string} [params.cabin='economy'] 艙等
   * @returns {Array<Object>} 航班清單（已含多平台比價資訊）
   */
  function generateFlights({ origin, destination, date, passengers = 1, cabin = 'economy' }) {
    const originAirport = findAirport(origin);
    const destAirport = findAirport(destination);
    if (!originAirport || !destAirport || origin === destination) return [];

    const seed = hashString(`${origin}-${destination}-${date}-${cabin}`);
    const rand = mulberry32(seed);
    const [minDur, maxDur] = durationRangeFor(originAirport.region, destAirport.region);
    const isLongHaul = maxDur > 400;

    const cabinMultiplier = { economy: 1, premium: 1.6, business: 3.2, first: 5.5 }[cabin] || 1;

    const flightCount = randInt(rand, 6, 10);
    const flights = [];

    for (let i = 0; i < flightCount; i++) {
      const airline = AIRLINES[randInt(rand, 0, AIRLINES.length - 1)];
      const duration = randInt(rand, minDur, maxDur);
      // 長程線較常有轉機；短程以直飛為主
      const stopChance = isLongHaul ? 0.55 : 0.18;
      const stops = rand() < stopChance ? 1 : 0;
      const layoverMinutes = stops ? randInt(rand, 50, 180) : 0;
      const departMinute = randInt(rand, 0, 23) * 60 + randInt(rand, 0, 11) * 5;
      const totalAirTime = duration + layoverMinutes;
      const arriveMinute = departMinute + totalAirTime;
      const dayOffset = Math.floor(arriveMinute / 1440); // 是否跨日抵達

      // 基礎票價：依飛行時間估算，廉航較便宜，艙等加成
      const basePricePerMinute = airline.type === 'lcc' ? 5.5 : 9.5;
      let basePrice = Math.round(duration * basePricePerMinute * cabinMultiplier);
      basePrice = Math.round((basePrice * randInt(rand, 85, 130)) / 100 / 10) * 10;
      if (stops) basePrice = Math.round(basePrice * 0.88); // 轉機航班通常較便宜

      // 多平台比價：每個平台價格略有差異
      const shuffledPlatforms = [...PLATFORMS].sort(() => rand() - 0.5);
      const platformCount = randInt(rand, 3, PLATFORMS.length);
      const prices = shuffledPlatforms.slice(0, platformCount).map((platform) => {
        const variance = randInt(rand, -8, 6); // 百分比
        const price = Math.max(500, Math.round((basePrice * (100 + variance)) / 100 / 10) * 10);
        return { platform: platform.name, platformId: platform.id, price };
      }).sort((a, b) => a.price - b.price);

      const lowestPrice = prices[0];

      flights.push({
        id: `${origin}${destination}-${date}-${airline.code}-${i}`,
        airline: { code: airline.code, name: airline.name, color: airline.color, type: airline.type },
        flightNumber: `${airline.code}${randInt(rand, 100, 999)}`,
        origin: { code: origin, city: originAirport.city, airport: originAirport.name },
        destination: { code: destination, city: destAirport.city, airport: destAirport.name },
        date,
        departTime: formatTime(departMinute),
        arriveTime: formatTime(arriveMinute),
        arriveDayOffset: dayOffset, // 0 = 當天抵達, 1 = 隔天抵達 ...
        durationMinutes: totalAirTime,
        durationLabel: formatDuration(totalAirTime),
        stops,
        layoverMinutes,
        cabin,
        passengers,
        baggage: {
          carryOn: airline.carryOn,
          checked: airline.checked,
        },
        prices,
        lowestPrice,
        currency: 'TWD',
      });
    }

    return flights.sort((a, b) => a.lowestPrice.price - b.lowestPrice.price);
  }

  /**
   * 產生「即期特價機票」清單：未來 N 小時內出發、且有折扣的航班
   * @param {Object} params
   * @param {string} [params.origin='TPE'] 出發機場代碼
   * @param {number} [params.hoursAhead=72] 搜尋未來幾小時內出發的航班
   * @param {number} [params.count=8] 要產生幾筆特價
   */
  function generateLastMinuteDeals({ origin = 'TPE', hoursAhead = 72, count = 8 } = {}) {
    const originAirport = findAirport(origin);
    if (!originAirport) return [];

    const candidates = AIRPORTS.filter((a) => a.code !== origin);
    const now = Date.now();
    // 用「現在的小時」當 seed 的一部分，讓特價清單每小時更新一次（模擬即時性）
    const hourSeed = Math.floor(now / (1000 * 60 * 60));
    const rand = mulberry32(hashString(`deals-${origin}-${hourSeed}`));

    const deals = [];
    const used = new Set();

    while (deals.length < count && used.size < candidates.length) {
      const dest = candidates[randInt(rand, 0, candidates.length - 1)];
      if (used.has(dest.code)) continue;
      used.add(dest.code);

      const hoursFromNow = randInt(rand, 3, hoursAhead);
      const departTimestamp = now + hoursFromNow * 60 * 60 * 1000;
      const departDate = new Date(departTimestamp);
      const dateStr = departDate.toISOString().slice(0, 10);

      const flights = generateFlights({ origin, destination: dest.code, date: dateStr, cabin: 'economy' });
      if (!flights.length) continue;
      const flight = flights[0];

      // 即期特價額外折扣 10%~35%
      const discountPercent = randInt(rand, 10, 35);
      const dealPrice = Math.max(500, Math.round((flight.lowestPrice.price * (100 - discountPercent)) / 100 / 10) * 10);

      deals.push({
        ...flight,
        departTimestamp,
        departDateLabel: `${departDate.getMonth() + 1}/${departDate.getDate()} ${flight.departTime}`,
        hoursFromNow,
        discountPercent,
        dealPrice,
        originalPrice: flight.lowestPrice.price,
      });
    }

    return deals.sort((a, b) => a.dealPrice - b.dealPrice);
  }

  global.FlightEngine = {
    AIRPORTS,
    AIRLINES,
    PLATFORMS,
    findAirport,
    generateFlights,
    generateLastMinuteDeals,
    formatDuration,
  };
})(window);
