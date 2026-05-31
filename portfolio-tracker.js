/* =========================================================
   portfolio-tracker.js  —  CalcVibe Portfolio & Savings Tracker
   ========================================================= */

/* ─── SHARED ─────────────────────────────────────────────── */
var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
var CRYPTO_IDX = [8, 9]; // row indices within bAssetInputs: Crypto Exchange 1, Crypto Exchange 2
var ASSET_LABELS = [
  'Savings Account 1','Savings Account 2','Money Market Fund',
  'Tax Free Investment 1','Tax Free Investment 2','Retirement Annuity',
  'Direct Investment 1','Direct Investment 2',
  'Crypto Exchange 1','Crypto Exchange 2',
  'Offshore Investment','Other Investment'
];

function parseVal(s) {
  var n = parseFloat(String(s || '').replace(/[R \s,]/g, ''));
  return isNaN(n) ? 0 : n;
}

function fmtR(n) {
  var abs = Math.abs(Math.round(n));
  var s   = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return (n < 0 ? '−R ' : 'R ') + s;
}

function fmtPct(n, dec) {
  dec = (dec === undefined) ? 1 : dec;
  return n.toFixed(dec) + '%';
}

function setText(el, v)  { if (el) el.textContent = String(v); }
function setSign(el, n)  { if (el) el.style.color = n > 0 ? 'var(--pos)' : n < 0 ? 'var(--neg)' : ''; }

function downloadCSV(filename, rows) {
  var csv = rows.map(function(r) {
    return r.map(function(c) {
      var s = String(c).replace(/ /g, ' ').replace(/−/g, '-').replace(/"/g, '""');
      return /[,\n"]/.test(s) ? '"' + s + '"' : s;
    }).join(',');
  }).join('\n');
  var url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  var a   = document.createElement('a');
  a.href  = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/* ─── TAB NAVIGATION ─────────────────────────────────────── */
function switchTab(name) {
  ['goals', 'savings', 'balances'].forEach(function(t) {
    var btn   = document.getElementById('btn-' + t);
    var panel = document.getElementById('panel-' + t);
    var on    = (t === name);
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-selected', on ? 'true' : 'false');
    panel.classList.toggle('active', on);
  });
  if (name === 'goals') updateGoalProgress();
}

/* ─── DOM REFERENCE MAP  (built once at boot) ────────────── */
var D = {};

function buildDOMRefs() {
  /* SAVINGS */
  var sB  = document.querySelector('.tbl-savings tbody');
  var sAR = Array.from(sB.querySelectorAll('tr')).filter(function(r) { return !r.className; });
  D.sAccRows    = sAR;
  D.sAccInputs  = sAR.map(function(r) { return Array.from(r.querySelectorAll('.cell-input')); });
  D.sAccTotCels = sAR.map(function(r) {
    var t = r.querySelectorAll('td'); return t[t.length - 1];
  });
  var wRow = sB.querySelector('.row-withdrawals');
  D.sWdInputs  = Array.from(wRow.querySelectorAll('.cell-input'));
  D.sWdTotCel  = (function() { var t = wRow.querySelectorAll('td'); return t[t.length - 1]; })();
  D.sNoteInputs = Array.from(sB.querySelector('.row-notes').querySelectorAll('.note-input'));
  D.sTotCels    = Array.from(sB.querySelector('.row-total').querySelectorAll('td')).slice(1);
  D.sGoalCels   = Array.from(sB.querySelector('.row-goal').querySelectorAll('td')).slice(1);
  D.sVarCels    = Array.from(sB.querySelector('.row-variance').querySelectorAll('td')).slice(1);

  /* BALANCES */
  var bB  = document.querySelector('.tbl-balances tbody');
  var bAR = Array.from(bB.querySelectorAll('tr')).filter(function(r) { return !r.className; });
  D.bAssetRows   = bAR;
  D.bAssetInputs = bAR.map(function(r) { return Array.from(r.querySelectorAll('.cell-input')); });
  D.bAssetYTD    = bAR.map(function(r) {
    var t = Array.from(r.querySelectorAll('td'));
    return { chg: t[t.length - 2], pct: t[t.length - 1] };
  });
  D.bTotCels  = Array.from(bB.querySelector('.row-total').querySelectorAll('td')).slice(1);
  var vrs     = Array.from(bB.querySelectorAll('.row-variance'));
  D.bCFJCels  = Array.from(vrs[0].querySelectorAll('td')).slice(1);
  D.bMoMCels  = Array.from(vrs[1].querySelectorAll('td')).slice(1);
  D.bMoMPCels = Array.from(vrs[2].querySelectorAll('td')).slice(1);
  var mr      = Array.from(bB.querySelectorAll('.row-meta'));
  D.bCryptoCels   = Array.from(mr[0].querySelectorAll('td')).slice(1);
  D.bBTCqtyInputs = Array.from(mr[1].querySelectorAll('.cell-input'));
  D.bBTCprcInputs = Array.from(mr[2].querySelectorAll('.cell-input'));
  D.bUSDZARInputs = Array.from(mr[3].querySelectorAll('.cell-input'));
  D.bGrowthCels   = Array.from(mr[4].querySelectorAll('td')).slice(1);
  D.bTrueWltCels  = Array.from(mr[5].querySelectorAll('td')).slice(1);
}

/* ─── SAVINGS TAB — PERSISTENCE ─────────────────────────── */
function getSavingsSnap() {
  return {
    monthlyGoal: document.getElementById('monthly-goal').value,
    annualGoal:  document.getElementById('annual-goal').value,
    accounts:    D.sAccInputs.map(function(row) { return row.map(function(i) { return i.value; }); }),
    withdrawals: D.sWdInputs.map(function(i) { return i.value; }),
    notes:       D.sNoteInputs.map(function(i) { return i.value; })
  };
}

function applySavingsSnap(d) {
  document.getElementById('monthly-goal').value = d.monthlyGoal || '';
  document.getElementById('annual-goal').value  = d.annualGoal  || '';
  D.sAccInputs.forEach(function(row, ri) {
    row.forEach(function(inp, ci) {
      inp.value = (d.accounts && d.accounts[ri] && d.accounts[ri][ci]) || '';
    });
  });
  D.sWdInputs.forEach(function(inp, i)   { inp.value = (d.withdrawals && d.withdrawals[i]) || ''; });
  D.sNoteInputs.forEach(function(inp, i) { inp.value = (d.notes && d.notes[i]) || ''; });
  calcSavings();
}

function saveSavings() {
  try {
    localStorage.setItem(
      'cv_savings_' + document.getElementById('savings-year').value,
      JSON.stringify(getSavingsSnap())
    );
  } catch (e) {}
}

function loadSavingsData(yr) {
  try { return JSON.parse(localStorage.getItem('cv_savings_' + yr) || '{}'); } catch (e) { return {}; }
}

/* ─── SAVINGS TAB — CALCULATIONS ────────────────────────── */
function calcSavings() {
  var mg  = parseVal(document.getElementById('monthly-goal').value);
  var ytd = 0;

  for (var col = 0; col < 12; col++) {
    var mt = D.sAccInputs.reduce(function(s, row) { return s + parseVal(row[col].value); }, 0);
    ytd += mt;

    setText(D.sTotCels[col],  mt > 0 ? fmtR(mt) : '—');
    setText(D.sGoalCels[col], mg > 0 ? fmtR(mg) : '—');

    if (mg > 0) {
      var v = mt - mg;
      setText(D.sVarCels[col], (v >= 0 ? '+' : '') + fmtR(v));
      setSign(D.sVarCels[col], v);
    } else {
      setText(D.sVarCels[col], '—');
      D.sVarCels[col].style.color = '';
    }
  }

  /* YTD column (index 12) */
  setText(D.sTotCels[12],  ytd > 0 ? fmtR(ytd) : '—');
  setText(D.sGoalCels[12], mg > 0  ? fmtR(mg * 12) : '—');
  if (mg > 0) {
    var yv = ytd - mg * 12;
    setText(D.sVarCels[12], (yv >= 0 ? '+' : '') + fmtR(yv));
    setSign(D.sVarCels[12], yv);
  } else {
    setText(D.sVarCels[12], '—');
    D.sVarCels[12].style.color = '';
  }

  /* Per-account row totals */
  D.sAccInputs.forEach(function(row, ri) {
    var s = row.reduce(function(a, inp) { return a + parseVal(inp.value); }, 0);
    setText(D.sAccTotCels[ri], s > 0 ? fmtR(s) : '—');
  });

  /* Withdrawal total */
  var wd = D.sWdInputs.reduce(function(s, inp) { return s + parseVal(inp.value); }, 0);
  setText(D.sWdTotCel, wd > 0 ? fmtR(wd) : '—');

  updateGoalProgress();
}

/* ─── SAVINGS TAB — CSV + RESET ─────────────────────────── */
function exportSavingsCSV() {
  var yr   = document.getElementById('savings-year').value;
  var rows = [['Account'].concat(MONTHS).concat(['Total'])];

  D.sAccRows.forEach(function(row, ri) {
    var label = row.querySelector('td').textContent.trim();
    var vals  = D.sAccInputs[ri].map(function(i) { return i.value || '0'; });
    var tot   = D.sAccInputs[ri].reduce(function(s, i) { return s + parseVal(i.value); }, 0);
    rows.push([label].concat(vals).concat([tot]));
  });

  var wVals = D.sWdInputs.map(function(i) { return i.value || '0'; });
  var wTot  = D.sWdInputs.reduce(function(s, i) { return s + parseVal(i.value); }, 0);
  rows.push(['Withdrawals'].concat(wVals).concat([wTot]));

  var totVals = MONTHS.map(function(_, c) {
    return D.sAccInputs.reduce(function(s, row) { return s + parseVal(row[c].value); }, 0);
  });
  rows.push(['Total Saved'].concat(totVals).concat([totVals.reduce(function(a, b) { return a + b; }, 0)]));

  var mg = parseVal(document.getElementById('monthly-goal').value);
  rows.push(['Monthly Goal'].concat(MONTHS.map(function() { return mg; })).concat([mg * 12]));

  downloadCSV('CalcVibe_Savings_' + yr + '.csv', rows);
}

function resetSavingsYear() {
  var yr = document.getElementById('savings-year').value;
  if (!confirm('Reset all Monthly Savings data for ' + yr + '?\nThis cannot be undone.')) return;
  localStorage.removeItem('cv_savings_' + yr);
  applySavingsSnap({});
}

function initSavings() {
  applySavingsSnap(loadSavingsData(document.getElementById('savings-year').value));

  document.getElementById('savings-year').addEventListener('change', function() {
    applySavingsSnap(loadSavingsData(this.value));
  });

  D.sAccInputs.forEach(function(row) {
    row.forEach(function(inp) {
      inp.addEventListener('input', function() { saveSavings(); calcSavings(); });
    });
  });
  D.sWdInputs.forEach(function(inp) {
    inp.addEventListener('input', function() { saveSavings(); calcSavings(); });
  });
  D.sNoteInputs.forEach(function(inp) { inp.addEventListener('input', saveSavings); });
  document.getElementById('monthly-goal').addEventListener('input', function() { saveSavings(); calcSavings(); });
  document.getElementById('annual-goal').addEventListener('input', saveSavings);
}

/* ─── BALANCES TAB — PERSISTENCE ────────────────────────── */
function getBalancesSnap() {
  return {
    assets:   D.bAssetInputs.map(function(row) { return row.map(function(i) { return i.value; }); }),
    btcQty:   D.bBTCqtyInputs.map(function(i) { return i.value; }),
    btcPrice: D.bBTCprcInputs.map(function(i) { return i.value; }),
    usdZar:   D.bUSDZARInputs.map(function(i) { return i.value; })
  };
}

function applyBalancesSnap(d) {
  D.bAssetInputs.forEach(function(row, ri) {
    row.forEach(function(inp, ci) {
      inp.value = (d.assets && d.assets[ri] && d.assets[ri][ci]) || '';
    });
  });
  D.bBTCqtyInputs.forEach(function(i, n) { i.value = (d.btcQty   && d.btcQty[n])   || ''; });
  D.bBTCprcInputs.forEach(function(i, n) { i.value = (d.btcPrice && d.btcPrice[n]) || ''; });
  D.bUSDZARInputs.forEach(function(i, n) { i.value = (d.usdZar   && d.usdZar[n])   || ''; });
  calcBalances();
}

function saveBalances() {
  try {
    localStorage.setItem(
      'cv_balances_' + document.getElementById('balances-year').value,
      JSON.stringify(getBalancesSnap())
    );
  } catch (e) {}
}

function loadBalancesData(yr) {
  try { return JSON.parse(localStorage.getItem('cv_balances_' + yr) || '{}'); } catch (e) { return {}; }
}

/* ─── BALANCES TAB — CALCULATIONS ───────────────────────── */
function calcBalances() {
  /* Monthly portfolio totals */
  var ct = MONTHS.map(function(_, col) {
    return D.bAssetInputs.reduce(function(s, row) { return s + parseVal(row[col].value); }, 0);
  });
  var jan = ct[0];

  /* Per-asset YTD columns */
  D.bAssetInputs.forEach(function(row, ri) {
    var jv = parseVal(row[0].value), lv = 0, li = -1;
    for (var c = 11; c >= 0; c--) {
      var v = parseVal(row[c].value);
      if (v > 0) { lv = v; li = c; break; }
    }
    if (jv > 0 || lv > 0) {
      var chg = lv - jv;
      setText(D.bAssetYTD[ri].chg, fmtR(chg));
      setSign(D.bAssetYTD[ri].chg, chg);
      if (jv > 0 && li > 0) {
        var pp = chg / jv * 100;
        setText(D.bAssetYTD[ri].pct, (pp >= 0 ? '+' : '') + fmtPct(pp));
        setSign(D.bAssetYTD[ri].pct, pp);
      } else {
        setText(D.bAssetYTD[ri].pct, '—'); D.bAssetYTD[ri].pct.style.color = '';
      }
    } else {
      setText(D.bAssetYTD[ri].chg, '—'); D.bAssetYTD[ri].chg.style.color = '';
      setText(D.bAssetYTD[ri].pct, '—'); D.bAssetYTD[ri].pct.style.color = '';
    }
  });

  /* Per-column computed rows */
  for (var col = 0; col < 12; col++) {
    var tot  = ct[col];
    var prev = col > 0 ? ct[col - 1] : 0;

    setText(D.bTotCels[col], tot > 0 ? fmtR(tot) : '—');

    /* Change from Jan */
    if (col > 0 && jan > 0 && tot > 0) {
      var cfj = tot - jan;
      setText(D.bCFJCels[col], (cfj >= 0 ? '+' : '') + fmtR(cfj));
      setSign(D.bCFJCels[col], cfj);
    } else { setText(D.bCFJCels[col], '—'); D.bCFJCels[col].style.color = ''; }

    /* MoM change */
    if (col > 0 && prev > 0 && tot > 0) {
      var mom = tot - prev;
      var mp  = mom / prev * 100;
      setText(D.bMoMCels[col],  (mom >= 0 ? '+' : '') + fmtR(mom));
      setSign(D.bMoMCels[col],  mom);
      setText(D.bMoMPCels[col], (mp  >= 0 ? '+' : '') + fmtPct(mp));
      setSign(D.bMoMPCels[col], mp);
    } else {
      setText(D.bMoMCels[col],  '—'); D.bMoMCels[col].style.color  = '';
      setText(D.bMoMPCels[col], '—'); D.bMoMPCels[col].style.color = '';
    }

    /* Crypto % of total */
    var cs = CRYPTO_IDX.reduce(function(s, ri) { return s + parseVal(D.bAssetInputs[ri][col].value); }, 0);
    setText(D.bCryptoCels[col], tot > 0 ? fmtPct(cs / tot * 100) : '—');

    /* % Growth from Jan */
    if (jan > 0 && tot > 0) {
      var gr = (tot - jan) / jan * 100;
      if (col === 0) {
        setText(D.bGrowthCels[0], '0.0%'); D.bGrowthCels[0].style.color = '';
      } else {
        setText(D.bGrowthCels[col], (gr >= 0 ? '+' : '') + fmtPct(gr));
        setSign(D.bGrowthCels[col], gr);
      }
    } else { setText(D.bGrowthCels[col], '—'); D.bGrowthCels[col].style.color = ''; }

    /* True Wealth USD */
    var uz = parseVal(D.bUSDZARInputs[col].value);
    setText(D.bTrueWltCels[col],
      uz > 0 && tot > 0
        ? '$ ' + Math.round(tot / uz).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
        : '—');
  }

  /* Total-row YTD columns (indices 12 & 13) */
  var li2 = -1;
  for (var c = 11; c >= 0; c--) { if (ct[c] > 0) { li2 = c; break; } }
  if (jan > 0 && li2 > 0) {
    var ytdC = ct[li2] - jan, ytdP = ytdC / jan * 100;
    setText(D.bTotCels[12], (ytdC >= 0 ? '+' : '') + fmtR(ytdC)); setSign(D.bTotCels[12], ytdC);
    setText(D.bTotCels[13], (ytdP >= 0 ? '+' : '') + fmtPct(ytdP)); setSign(D.bTotCels[13], ytdP);
  } else {
    setText(D.bTotCels[12], '—'); D.bTotCels[12].style.color = '';
    setText(D.bTotCels[13], '—'); D.bTotCels[13].style.color = '';
  }

  /* Clear the unused YTD cols on metric-only rows */
  [D.bCFJCels, D.bMoMCels, D.bMoMPCels, D.bCryptoCels, D.bGrowthCels, D.bTrueWltCels].forEach(function(arr) {
    if (arr[12]) { setText(arr[12], '—'); arr[12].style.color = ''; }
    if (arr[13]) { setText(arr[13], '—'); arr[13].style.color = ''; }
  });

  updateCharts(ct);
  updateGoalProgress();
}

/* ─── BALANCES TAB — CSV + RESET ────────────────────────── */
function exportBalancesCSV() {
  var yr   = document.getElementById('balances-year').value;
  var rows = [['Asset'].concat(MONTHS).concat(['YTD Change', 'YTD %'])];

  D.bAssetRows.forEach(function(row, ri) {
    var label = row.querySelector('td').textContent.trim();
    var vals  = D.bAssetInputs[ri].map(function(i) { return i.value || '0'; });
    rows.push([label].concat(vals).concat([
      D.bAssetYTD[ri].chg.textContent,
      D.bAssetYTD[ri].pct.textContent
    ]));
  });

  [
    ['Total Portfolio',   D.bTotCels],
    ['Change from Jan',   D.bCFJCels],
    ['MoM Change (R)',    D.bMoMCels],
    ['MoM Change (%)',    D.bMoMPCels],
    ['Crypto %',          D.bCryptoCels],
    ['% Growth from Jan', D.bGrowthCels],
    ['True Wealth (USD)', D.bTrueWltCels]
  ].forEach(function(pair) {
    rows.push([pair[0]].concat(pair[1].map(function(c) { return c.textContent; })));
  });

  rows.push(['# BTC'].concat(D.bBTCqtyInputs.map(function(i) { return i.value || '—'; })).concat(['—','—']));
  rows.push(['BTC Price (USD)'].concat(D.bBTCprcInputs.map(function(i) { return i.value || '—'; })).concat(['—','—']));
  rows.push(['USD/ZAR'].concat(D.bUSDZARInputs.map(function(i) { return i.value || '—'; })).concat(['—','—']));

  downloadCSV('CalcVibe_Balances_' + yr + '.csv', rows);
}

function resetBalancesYear() {
  var yr = document.getElementById('balances-year').value;
  if (!confirm('Reset all Portfolio Balances data for ' + yr + '?\nThis cannot be undone.')) return;
  localStorage.removeItem('cv_balances_' + yr);
  applyBalancesSnap({});
}

function initBalances() {
  applyBalancesSnap(loadBalancesData(document.getElementById('balances-year').value));

  document.getElementById('balances-year').addEventListener('change', function() {
    applyBalancesSnap(loadBalancesData(this.value));
  });

  D.bAssetInputs.forEach(function(row) {
    row.forEach(function(inp) {
      inp.addEventListener('input', function() { saveBalances(); calcBalances(); });
    });
  });
  [D.bBTCqtyInputs, D.bBTCprcInputs, D.bUSDZARInputs].forEach(function(grp) {
    grp.forEach(function(inp) {
      inp.addEventListener('input', function() { saveBalances(); calcBalances(); });
    });
  });
}

/* ─── CHARTS ─────────────────────────────────────────────── */
var CHART_COLORS = [
  '#1a6b3c','#2ecc71','#f39c12','#3498db','#9b59b6',
  '#e74c3c','#1abc9c','#e8a020','#2980b9','#8e44ad',
  '#27ae60','#d35400','#16a085'
];

var chartPortfolio = null, chartMoM = null, chartAlloc = null;

function initCharts() {
  Chart.defaults.font.family = "'Epilogue', sans-serif";
  Chart.defaults.color       = '#5a5a72';

  chartPortfolio = new Chart(document.getElementById('chart-portfolio'), {
    type: 'line',
    data: {
      labels: MONTHS,
      datasets: [{
        data: new Array(12).fill(null),
        borderColor: '#1a6b3c',
        backgroundColor: 'rgba(26,107,60,0.08)',
        borderWidth: 2,
        pointBackgroundColor: '#1a6b3c',
        pointRadius: 4,
        tension: 0.35,
        fill: true
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: '#e2e0d8' } },
        y: {
          grid: { color: '#e2e0d8' },
          ticks: { callback: function(v) { return 'R' + (v / 1e6).toFixed(1) + 'M'; } }
        }
      }
    }
  });

  chartMoM = new Chart(document.getElementById('chart-mom'), {
    type: 'bar',
    data: {
      labels: MONTHS,
      datasets: [{
        data: new Array(12).fill(null),
        backgroundColor: new Array(12).fill('#1a6b3c'),
        borderRadius: 3
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: {
          grid: { color: '#e2e0d8' },
          ticks: { callback: function(v) { return v + '%'; } }
        }
      }
    }
  });

  chartAlloc = new Chart(document.getElementById('chart-alloc'), {
    type: 'doughnut',
    data: {
      labels: ASSET_LABELS,
      datasets: [{
        data: new Array(13).fill(0),
        backgroundColor: CHART_COLORS,
        borderWidth: 1,
        borderColor: '#fff',
        hoverBorderWidth: 2
      }]
    },
    options: {
      responsive: true,
      cutout: '58%',
      plugins: {
        legend: { position: 'right', labels: { font: { size: 11 }, boxWidth: 12, padding: 8 } },
        tooltip: {
          callbacks: {
            label: function(ctx) {
              var t = ctx.dataset.data.reduce(function(a, b) { return a + b; }, 0);
              var p = t > 0 ? (ctx.raw / t * 100).toFixed(1) : '0';
              var n = Math.round(ctx.raw).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
              return ' R ' + n + ' (' + p + '%)';
            }
          }
        }
      }
    }
  });
}

function updateCharts(ct) {
  if (!chartPortfolio) return;

  chartPortfolio.data.datasets[0].data = ct.map(function(t) { return t > 0 ? t : null; });
  chartPortfolio.update('none');

  var md = [], mc = [];
  ct.forEach(function(t, i) {
    if (i === 0 || ct[i - 1] === 0 || t === 0) { md.push(null); mc.push('#e2e0d8'); }
    else {
      var p = parseFloat(((t - ct[i - 1]) / ct[i - 1] * 100).toFixed(2));
      md.push(p); mc.push(p >= 0 ? '#1a6b3c' : '#c0392b');
    }
  });
  chartMoM.data.datasets[0].data            = md;
  chartMoM.data.datasets[0].backgroundColor = mc;
  chartMoM.update('none');

  var li = -1;
  for (var c = 11; c >= 0; c--) { if (ct[c] > 0) { li = c; break; } }
  chartAlloc.data.datasets[0].data = li >= 0
    ? D.bAssetInputs.map(function(row) { return Math.max(parseVal(row[li].value), 0); })
    : new Array(13).fill(0);
  chartAlloc.update('none');
}

/* ─── GOALS TAB ──────────────────────────────────────────── */
function getSavingsYTD() {
  var t = 0;
  document.querySelectorAll('.tbl-savings tbody tr').forEach(function(row) {
    if (row.className) return;
    row.querySelectorAll('.cell-input').forEach(function(i) { t += parseVal(i.value); });
  });
  return t;
}

function getPortfolioTotals() {
  var ar = [];
  document.querySelectorAll('.tbl-balances tbody tr').forEach(function(row) {
    if (row.className) return;
    var ins = row.querySelectorAll('.cell-input');
    if (ins.length >= 12) ar.push(ins);
  });
  var jan = 0;
  ar.forEach(function(ins) { jan += parseVal(ins[0].value); });
  var li = -1;
  outer: for (var c = 11; c >= 0; c--) {
    for (var r = 0; r < ar.length; r++) {
      if (parseVal(ar[r][c].value) > 0) { li = c; break outer; }
    }
  }
  var lat = 0;
  if (li >= 0) ar.forEach(function(ins) { lat += parseVal(ins[li].value); });
  return { jan: jan, latest: lat };
}

function setBarWidth(id, pct) {
  var bar = document.getElementById(id);
  if (!bar) return;
  var w = Math.min(Math.max(pct, 0), 100);
  bar.style.width = w + '%';
  bar.classList.remove('bar-warn', 'bar-done');
  if (pct >= 100) bar.classList.add('bar-done');
  else if (pct > 0 && pct < 30) bar.classList.add('bar-warn');
  var tr = bar.parentElement;
  if (tr && tr.hasAttribute('aria-valuenow')) tr.setAttribute('aria-valuenow', Math.round(w));
}

function updateGoalProgress() {
  var el = document.getElementById('goal-savings-target');
  if (!el) return;
  var mt = parseVal(el.value), at = mt * 12, ytd = getSavingsYTD();
  var sp = at > 0 ? ytd / at * 100 : 0;
  setText(document.getElementById('goal-savings-annual'),   at > 0  ? fmtR(at) : '—');
  setText(document.getElementById('goal-savings-actual'),   ytd > 0 ? fmtR(ytd) + ' saved YTD' : 'No savings data yet');
  setText(document.getElementById('goal-savings-pct-text'), at > 0  ? Math.round(sp) + '% of annual target' : 'Set a target above');
  setBarWidth('goal-savings-bar', sp);

  var gt   = parseVal(document.getElementById('goal-growth-target').value);
  var tots = getPortfolioTotals();
  var ag   = (tots.jan > 0 && tots.latest > 0) ? (tots.latest - tots.jan) / tots.jan * 100 : 0;
  var gp   = gt > 0 ? ag / gt * 100 : 0;
  setText(document.getElementById('goal-growth-actual'),   tots.jan > 0 ? ag.toFixed(1) + '% growth so far' : 'No balance data yet');
  setText(document.getElementById('goal-growth-pct-text'), gt > 0 ? Math.round(gp) + '% of ' + gt + '% target' : 'Set a target above');
  setBarWidth('goal-growth-bar', gp);
}

var STATUS_CYCLE  = ['not-started', 'in-progress', 'done'];
var STATUS_LABELS = {
  'not-started': '○ Not Started',
  'in-progress': '◐ In Progress',
  'done':        '✓ Done'
};

function setStatus(idx, state) {
  if (!STATUS_LABELS[state]) state = 'not-started';
  var chip = document.getElementById('status-' + idx);
  chip.dataset.state = state;
  chip.textContent   = STATUS_LABELS[state];
  chip.className     = 'status-chip status-' + state;
  chip.setAttribute('aria-label', 'Goal ' + idx + ' status: ' + state.replace('-', ' ') + '. Click to change.');
}

function cycleStatus(idx) {
  var chip = document.getElementById('status-' + idx);
  var cur  = chip.dataset.state || 'not-started';
  setStatus(idx, STATUS_CYCLE[(STATUS_CYCLE.indexOf(cur) + 1) % STATUS_CYCLE.length]);
  saveGoals();
}

function goalsKey(yr) { return 'cv_tracker_goals_' + yr; }

function saveGoals() {
  var yr = document.getElementById('goals-year').value, quals = [];
  for (var i = 1; i <= 5; i++) {
    quals.push({
      text:   document.getElementById('qual-goal-' + i).value,
      status: document.getElementById('status-' + i).dataset.state || 'not-started'
    });
  }
  try {
    localStorage.setItem(goalsKey(yr), JSON.stringify({
      savingsTarget: document.getElementById('goal-savings-target').value,
      growthTarget:  document.getElementById('goal-growth-target').value,
      quals:         quals
    }));
  } catch (e) {}
}

function applyGoals(data) {
  document.getElementById('goal-savings-target').value = data.savingsTarget || '';
  document.getElementById('goal-growth-target').value  = data.growthTarget  || '';
  var quals = data.quals || [];
  for (var i = 1; i <= 5; i++) {
    var q = quals[i - 1] || {};
    document.getElementById('qual-goal-' + i).value = q.text || '';
    setStatus(i, q.status || 'not-started');
  }
  updateGoalProgress();
}

document.getElementById('goals-year').addEventListener('change', function() {
  try { applyGoals(JSON.parse(localStorage.getItem(goalsKey(this.value)) || '{}')); }
  catch (e) { applyGoals({}); }
});

/* ─── BOOT ───────────────────────────────────────────────── */
(function boot() {
  buildDOMRefs();

  /* Goals tab */
  try { applyGoals(JSON.parse(localStorage.getItem(goalsKey(document.getElementById('goals-year').value)) || '{}')); }
  catch (e) { applyGoals({}); }

  ['goal-savings-target', 'goal-growth-target'].forEach(function(id) {
    document.getElementById(id).addEventListener('input', function() { saveGoals(); updateGoalProgress(); });
  });
  for (var i = 1; i <= 5; i++) {
    (function(idx) {
      document.getElementById('qual-goal-' + idx).addEventListener('input', saveGoals);
    })(i);
  }

  /* Savings & Balances tabs */
  initSavings();
  initBalances();

  /* Charts — Chart.js is loaded before this script */
  if (typeof Chart !== 'undefined') {
    initCharts();
    updateCharts(new Array(12).fill(0));
  }
})();
