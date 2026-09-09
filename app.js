const M = {
  mine: 650,
  lowest: 650,
  suggest: 498,
  recommend: 570,
  avg90: 496,
  market: 778,
  floor: 470,
};

const MIN = 450;
const MAX = 715;
const PX = 6;
const FEE = 462.45 / 570;

const CAP = {
  current: "现有页面",
  all: "综合：商品信息展示当前出价，建议用成色和行情解读",
  a: "A 两条差值并列，建议仍在抢注意力",
  b: "B 首屏干净，建议和底价都埋得过深",
  c: "C 只推直降 498，跨度过大",
  d: "D 底价清楚，但出价无法调整",
};

const $ = (id) => document.getElementById(id);

function payout(p) {
  return (p * FEE).toFixed(2);
}

function fees(p) {
  const total = p * (1 - FEE);
  const tech = p * 0.08;
  const transfer = p * 0.0087;
  const store = 0;
  const ops = Math.max(0, total - tech - transfer - store);
  return {
    total,
    lines: [
      { name: "技术服务费 8.0%", value: tech },
      { name: "操作服务费", value: ops },
      { name: "转账服务费", value: transfer },
      { name: "仓储服务费", value: store },
    ],
  };
}

function yen(n) {
  return `¥${n}`;
}

function makeRoller(root, { value, marks, onChange, getMin, onAnchor, onTap }) {
  const strip = root.querySelector(".roller-strip");
  let markList = marks;
  let price = value;
  let dragging = false;
  let moved = false;
  let startX = 0;
  let startPrice = value;

  function minP() {
    return getMin ? getMin() : MIN;
  }

  function left(p) {
    return (p - MIN) * PX;
  }

  function stripX(p) {
    return root.clientWidth / 2 - left(p);
  }

  function build() {
    strip.style.width = `${(MAX - MIN) * PX}px`;
    let html = "";
    for (let v = MIN; v <= MAX; v += 2) {
      const x = left(v);
      if (v % 50 === 0) {
        html += `<i class="tick is-50" style="left:${x}px"></i>`;
        html += `<span class="tick-label" style="left:${x}px">${v}</span>`;
      } else if (v % 10 === 0) {
        html += `<i class="tick is-10" style="left:${x}px"></i>`;
      }
    }
    markList.forEach((m) => {
      if (m.chip) {
        html += `<div class="anchor-chip ${m.cls || ""}" style="left:${left(m.price)}px" data-price="${m.price}"><span>${m.label}</span><button class="chip-use" type="button" data-go="${m.price}">${m.action}</button></div>`;
      } else {
        html += `<button class="anchor ${m.cls || ""}" style="left:${left(m.price)}px" data-price="${m.price}" type="button">${m.label}</button>`;
      }
    });
    strip.innerHTML = html;
    apply(false);
  }

  function apply(animate) {
    strip.style.transition = animate ? "transform 0.28s ease" : "none";
    strip.style.transform = `translate3d(${stripX(price)}px,0,0)`;
    strip.querySelectorAll(".anchor, .anchor-chip").forEach((el) => {
      el.classList.toggle("is-on", Number(el.dataset.price) === price);
    });
    strip.querySelectorAll("[data-go]").forEach((btn) => {
      btn.hidden = Number(btn.dataset.go) === price;
    });
  }

  function set(next, animate) {
    price = Math.round(Math.min(MAX, Math.max(minP(), next)));
    apply(animate);
    onChange(price);
  }

  function setMarks(next) {
    markList = next;
    build();
  }

  root.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".anchor, .anchor-chip, .suggest-pin")) return;
    dragging = true;
    moved = false;
    startX = e.clientX;
    startPrice = price;
    root.setPointerCapture(e.pointerId);
  });
  root.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    if (Math.abs(e.clientX - startX) > 6) moved = true;
    set(startPrice - (e.clientX - startX) / PX, false);
  });
  const end = () => {
    if (!dragging) return;
    dragging = false;
    if (!moved && onTap) onTap();
    else apply(true);
  };
  root.addEventListener("pointerup", end);
  root.addEventListener("pointercancel", end);
  root.addEventListener("wheel", (e) => {
    e.preventDefault();
    set(price + e.deltaX / PX + e.deltaY / PX, false);
  }, { passive: false });
  strip.addEventListener("click", (e) => {
    const btn = e.target.closest(".anchor, .anchor-chip");
    if (!btn) return;
    const p = Number(btn.dataset.price);
    if (onAnchor) onAnchor(p);
    set(p, true);
  });

  build();
  window.addEventListener("resize", () => apply(false));
  return { set, get: () => price, refresh: apply, setMarks };
}

function bindSheetPrice(sheet, getPrice, setPrice) {
  const edit = sheet.querySelector(".hero-edit");
  if (!edit) return;
  edit.addEventListener("click", () => {
    const raw = window.prompt("请输入出价", String(getPrice()));
    if (raw == null) return;
    const n = Number(raw.replace(/[^\d.]/g, ""));
    if (Number.isFinite(n)) setPrice(n, true);
  });
}

function renderA(price) {
  const sheet = $("screen-a");
  sheet.querySelector("[data-price]").textContent = String(price);
  sheet.querySelector("[data-payout]").textContent = yen(payout(price));

  const dropS = price - M.suggest;
  const dropR = price - M.recommend;
  $("delta-a").innerHTML = `
    <button class="delta" data-to="${M.suggest}" type="button">
      <span>降 ${yen(Math.max(dropS, 0))} 可进卖家直降<small>目标 ${yen(M.suggest)}</small></span>
      <span class="delta-use">${price === M.suggest ? "当前" : "使用"}</span>
    </button>
    <button class="delta" data-to="${M.recommend}" type="button">
      <span>降 ${yen(Math.max(dropR, 0))} 加速售出<small>目标 ${yen(M.recommend)}</small></span>
      <span class="delta-use">${price === M.recommend ? "当前" : "使用"}</span>
    </button>
  `;
}

function renderB(price) {
  const sheet = $("screen-b");
  sheet.querySelector("[data-price]").textContent = String(price);
  sheet.querySelector("[data-payout]").textContent = yen(payout(price));
  const d = price - M.lowest;
  $("vs-b").textContent =
    d === 0 ? "与在售最低价持平" : d > 0 ? `比在售最低价高 ${yen(d)}` : `比在售最低价低 ${yen(Math.abs(d))}`;
}

function renderC(price) {
  const sheet = $("screen-c");
  sheet.querySelector("[data-price]").textContent = String(price);
  sheet.querySelector("[data-payout]").textContent = yen(payout(price));
  $("main-c").querySelector("div").innerHTML =
    price === M.suggest
      ? `已使用建议价 <b>¥498</b>，可进卖家直降频道`
      : `降至 <b>¥498</b> 可进卖家直降频道`;
  $("use-c").hidden = price === M.suggest;
}

const all = {
  trust: true,
  floor: M.floor,
  feeOpen: false,
};

function marksAll() {
  const list = [
    { price: M.mine, label: "当前出价" },
  ];
  if (all.trust) list.push({ price: all.floor, label: "底价", cls: "is-floor" });
  return list;
}

function fillFees(price) {
  const f = fees(price);
  $("layer-fee").textContent = `-¥${f.total.toFixed(2)}`;
  $("layer-pay").textContent = yen(payout(price));
  $("layer-items").innerHTML = f.lines
    .map((l) => `<div class="take-item"><span>${l.name}</span><span>-¥${l.value.toFixed(2)}</span></div>`)
    .join("");
}

function expoTag(price) {
  const n = (M.mine - price) * 12;
  const sign = n >= 0 ? "+" : "";
  return `曝光 ${sign}${n.toLocaleString("zh-CN")}次`;
}

function renderAll(price) {
  const sheet = $("screen-all");
  sheet.querySelector("[data-price]").textContent = String(price);
  sheet.querySelector("[data-payout]").textContent = yen(payout(price));
  $("expo-tag").textContent = expoTag(price);
  fillFees(price);

  $("floor-all-num").textContent = String(all.floor);
  $("trust-all-switch").classList.toggle("is-on", all.trust);
  $("trust-all-switch").setAttribute("aria-pressed", String(all.trust));
  $("trust-all-body").hidden = !all.trust;
  $("trust-all-off").hidden = all.trust;
  $("flash-all").hidden = !(all.trust && all.floor <= 450);
}

function clampFloor(n) {
  const maxFloor = Math.min(rollerAll.get() - 1, M.suggest - 1);
  return Math.min(maxFloor, Math.max(MIN, Math.round(n)));
}

const rollerAll = makeRoller($("roller-all"), {
  value: M.suggest,
  marks: marksAll(),
  getMin: () => Math.max(all.trust ? all.floor + 1 : MIN, M.suggest),
  onChange: renderAll,
});

function syncAllMarks() {
  rollerAll.setMarks(marksAll());
  rollerAll.set(rollerAll.get(), false);
}

renderAll(M.suggest);

$("screen-all").querySelector(".hero-edit").addEventListener("click", () => {
  $("layer-input").value = String(rollerAll.get());
  fillFees(rollerAll.get());
  $("ref-layer").hidden = true;
  $("cond-layer").hidden = true;
  $("fee-layer").hidden = false;
  $("layer-input").focus();
});
function hideLayers() {
  $("fee-layer").hidden = true;
  $("ref-layer").hidden = true;
  $("cond-layer").hidden = true;
}
$("screen-all").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-open]");
  if (!btn) return;
  hideLayers();
  $(`${btn.dataset.open}-layer`).hidden = false;
});
$("ref-mask").addEventListener("click", hideLayers);
$("ref-close").addEventListener("click", hideLayers);
$("cond-mask").addEventListener("click", hideLayers);
$("ref-layer").addEventListener("click", (e) => {
  const tab = e.target.closest(".ref-tabs button");
  if (tab) {
    $("ref-layer").querySelectorAll(".ref-tabs button").forEach((b) => b.classList.toggle("is-on", b === tab));
  }
  const chip = e.target.closest(".ref-chips button");
  if (!chip) return;
  chip.parentElement.querySelectorAll("button").forEach((b) => b.classList.toggle("is-on", b === chip));
});
function layerPrice() {
  return Number($("layer-input").value);
}

$("layer-input").addEventListener("input", () => {
  const n = layerPrice();
  if (Number.isFinite(n) && n > 0) fillFees(n);
});
$("step-up").addEventListener("click", () => {
  const n = Math.round(layerPrice() || 0) + 1;
  $("layer-input").value = String(n);
  fillFees(n);
});
$("step-down").addEventListener("click", () => {
  const n = Math.max(1, Math.round(layerPrice() || 1) - 1);
  $("layer-input").value = String(n);
  fillFees(n);
});
$("layer-ok").addEventListener("click", () => {
  const n = Number($("layer-input").value);
  if (Number.isFinite(n)) rollerAll.set(Math.max(n, M.suggest), true);
  $("fee-layer").hidden = true;
});
$("fee-mask").addEventListener("click", () => {
  $("fee-layer").hidden = true;
});
$("trust-all-switch").addEventListener("click", () => {
  all.trust = !all.trust;
  if (all.trust) all.floor = clampFloor(all.floor);
  syncAllMarks();
  renderAll(rollerAll.get());
});
$("edit-floor-all").addEventListener("click", () => {
  const raw = window.prompt("请输入底价", String(all.floor));
  if (raw == null) return;
  const n = Number(raw.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(n)) return;
  all.floor = clampFloor(n);
  syncAllMarks();
  renderAll(rollerAll.get());
});
$("screen-all").querySelectorAll(".plan").forEach((btn) => {
  btn.addEventListener("click", () => {
    $("screen-all").querySelectorAll(".plan").forEach((el) => el.classList.toggle("is-on", el === btn));
  });
});

const marksA = [
  { price: M.suggest, label: "直降" },
  { price: M.recommend, label: "加速" },
  { price: M.mine, label: "我的出价", cls: "is-current" },
];

const rollerA = makeRoller($("roller-a"), {
  value: M.mine,
  marks: marksA,
  onChange: renderA,
});
const rollerB = makeRoller($("roller-b"), {
  value: M.mine,
  marks: [{ price: M.mine, label: "我的出价 · 最低价", cls: "is-current" }],
  onChange: renderB,
});
const rollerC = makeRoller($("roller-c"), {
  value: M.mine,
  marks: [{ price: M.suggest, label: "建议" }, { price: M.mine, label: "我的出价", cls: "is-current" }],
  onChange: renderC,
});

renderA(M.mine);
renderB(M.mine);
renderC(M.mine);

bindSheetPrice($("screen-a"), () => rollerA.get(), (n, a) => rollerA.set(n, a));
bindSheetPrice($("screen-b"), () => rollerB.get(), (n, a) => rollerB.set(n, a));
bindSheetPrice($("screen-c"), () => rollerC.get(), (n, a) => rollerC.set(n, a));

$("delta-a").addEventListener("click", (e) => {
  const btn = e.target.closest(".delta");
  if (btn) rollerA.set(Number(btn.dataset.to), true);
});

$("fold-ref").addEventListener("click", () => {
  const body = $("fold-ref-body");
  body.hidden = !body.hidden;
  $("fold-ref").textContent = body.hidden ? "展开价格参考" : "收起价格参考";
});

$("fold-floor").addEventListener("click", () => {
  const body = $("fold-floor-body");
  body.hidden = !body.hidden;
  $("fold-floor").textContent = body.hidden ? "底价托管" : "收起底价托管";
});

$("use-c").addEventListener("click", () => rollerC.set(M.suggest, true));
$("use-c-alt").addEventListener("click", () => rollerC.set(M.recommend, true));
$("more-c").addEventListener("click", () => {
  const body = $("more-c-body");
  body.hidden = !body.hidden;
  $("more-c").textContent = body.hidden ? "查看其他建议" : "收起其他建议";
});

$("screen-d").querySelectorAll(".plan").forEach((btn) => {
  btn.addEventListener("click", () => {
    $("screen-d").querySelectorAll(".plan").forEach((el) => el.classList.toggle("is-on", el === btn));
  });
});

document.querySelectorAll(".mode-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".mode-btn").forEach((b) => b.classList.remove("is-on"));
    btn.classList.add("is-on");
    const mode = btn.dataset.mode;
    ["current", "all", "a", "b", "c", "d"].forEach((id) => {
      $(`screen-${id}`).hidden = id !== mode;
    });
    hideLayers();
    $("mode-cap").textContent = CAP[mode];
    if (mode === "all") rollerAll.refresh(false);
    if (mode === "a") rollerA.refresh(false);
    if (mode === "b") rollerB.refresh(false);
    if (mode === "c") rollerC.refresh(false);
  });
});
