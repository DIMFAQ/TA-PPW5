class Calculator {
  constructor(previousOperandTextElement, currentOperandTextElement) {
    this.previousOperandTextElement = previousOperandTextElement;
    this.currentOperandTextElement = currentOperandTextElement;
    this.memory = 0;
    this.history = [];
    this.fullHistory = [];
    this.expression = '';
    this.loadFullHistory();
    this.clear();
  }

  loadFullHistory() {
    try {
      const raw = localStorage.getItem('calc_full_history');
      if (raw) this.fullHistory = JSON.parse(raw);
    } catch (e) { this.fullHistory = []; }
  }
  saveFullHistory() {
    try { localStorage.setItem('calc_full_history', JSON.stringify(this.fullHistory || [])); } catch (e) {}
  }

  clear() {
    this.currentOperand = '0';
    this.previousOperand = '';
    this.operation = undefined;
    this.pendingEquals = false;
    this.expression = '';
  }

  delete() {
    if (String(this.currentOperand).includes('Error')) { this.clear(); return; }
    this.currentOperand = this.currentOperand.toString().slice(0, -1);
    if (this.currentOperand === '' || this.currentOperand === '-') this.currentOperand = '0';
  }

  addToHistory(expression, result) {
    this.history.unshift({ expression: expression, result: result });
    if (this.history.length > 5) this.history.pop();
    this.fullHistory.unshift({ expression: expression, result: result, ts: Date.now() });
    if (this.fullHistory.length > 200) this.fullHistory.pop();
    this.saveFullHistory();
  }

  clearFullHistory() {
    this.fullHistory = [];
    this.saveFullHistory();
  }

  memoryClear() { this.memory = 0; }
  memoryRecall() { this.currentOperand = this.memory.toString(); this.pendingEquals = false; }
  memoryAdd() { this.memory += parseFloat(this.currentOperand) || 0; }
  memorySubtract() { this.memory -= parseFloat(this.currentOperand) || 0; }

  appendNumber(number) {
    if (String(this.currentOperand).includes('Error')) this.clear();
    if (this.pendingEquals) {
      this.currentOperand = '0';
      this.pendingEquals = false;
      this.expression = '';
    }
    if (number === '.' && this.currentOperand.includes('.')) return;
    if (this.currentOperand === '0' && number !== '.') this.currentOperand = number.toString();
    else this.currentOperand = this.currentOperand.toString() + number.toString();
  }

  chooseOperation(operation) {
    if (this.currentOperand === '' || String(this.currentOperand).includes('Error')) return;
    if (this.pendingEquals) {
      this.expression = this.currentOperand + operation;
      this.pendingEquals = false;
    } else {
      if (this.currentOperand !== '') {
        this.expression += (this.expression === '' ? '' : '') + this.currentOperand + operation;
      } else {
        if (/[+\-×÷%]$/.test(this.expression)) {
          this.expression = this.expression.slice(0, -1) + operation;
        }
      }
    }
    this.previousOperand = this.expression;
    this.operation = operation;
    this.currentOperand = '';
  }

  chooseFunction(func) {
    if (String(this.currentOperand).includes('Error')) this.clear();
    let current = parseFloat(this.currentOperand);
    if (isNaN(current)) return;
    let result;
    const expression = `${func}(${this.currentOperand})`;
    switch (func) {
      case 'sin': result = Math.sin(current * (Math.PI / 180)); break;
      case 'cos': result = Math.cos(current * (Math.PI / 180)); break;
      case 'tan': result = Math.tan(current * (Math.PI / 180)); break;
      case 'log': result = Math.log10(current); break;
      case 'sqrt':
        if (current < 0) result = 'Error';
        else result = Math.sqrt(current);
        break;
      case 'exp': result = Math.exp(current); break;
      case 'pow2': result = Math.pow(current, 2); break;
      case 'pi':
        this.currentOperand = Math.PI.toString();
        this.updateDisplay();
        return;
      default: return;
    }
    if (typeof result === 'string') {
      this.currentOperand = result;
      this.previousOperand = '';
      this.operation = undefined;
    } else if (!isFinite(result)) {
      this.currentOperand = 'Error';
      this.previousOperand = '';
      this.operation = undefined;
    } else {
      this.currentOperand = result.toString();
      this.addToHistory(expression, this.currentOperand);
    }
    this.updateDisplay();
  }

  evaluateExpression(expr) {
    try {
      let safe = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/,/g, '.');
      if (/[^0-9+\-*/%.() \t]/.test(safe)) throw new Error('Invalid expression');
      const result = Function('"use strict";return (' + safe + ')')();
      return result;
    } catch (e) {
      return 'Error';
    }
  }

  compute() {
    let exprToEval = this.expression;
    if (this.currentOperand && this.currentOperand !== '') exprToEval = exprToEval + this.currentOperand;
    else exprToEval = exprToEval.replace(/[+\-×÷%]$/,'');
    if (!exprToEval || exprToEval.trim() === '') return;
    const result = this.evaluateExpression(exprToEval);
    if (result === 'Error' || !isFinite(result)) {
      this.currentOperand = 'Error';
      this.previousOperand = '';
      this.operation = undefined;
      this.expression = '';
      return;
    }
    this.addToHistory(exprToEval, result.toString());
    this.currentOperand = result.toString();
    this.previousOperand = '';
    this.operation = undefined;
    this.expression = '';
    this.pendingEquals = true;
  }

  getDisplayNumber(number) {
    if (number == null) return '';
    if (String(number).includes('Error')) return String(number);
    const stringNumber = number.toString();
    const [intPart, decPart] = stringNumber.split('.');
    const integerDigits = parseFloat(intPart);
    let integerDisplay = isNaN(integerDigits) ? '' : integerDigits.toLocaleString('id', { maximumFractionDigits: 0 });
    if (decPart != null) return `${integerDisplay},${decPart}`;
    else return integerDisplay;
  }

  updateDisplay() {
    this.currentOperandTextElement.innerText = this.getDisplayNumber(this.currentOperand);
    this.previousOperandTextElement.innerText = this.expression || '';
    const mini = document.getElementById("history-list");
    if (mini) {
      mini.innerHTML = this.history.map(item => `
        <li class="history-item" data-exp="${encodeURIComponent(item.expression)}" data-res="${encodeURIComponent(item.result)}">
          <span class="history-exp">${item.expression.replace(/\*/g,'×').replace(/\//g,'÷')}</span>
          <span class="history-res"> = ${this.getDisplayNumber(item.result)}</span>
        </li>
      `).join('');
    }
  }
}

function setupThemeSelector() {
  const btns = document.querySelectorAll(".theme-btn");
  const body = document.body;
  if (!body.className) body.classList.add('theme-light');
  btns.forEach(btn => {
    btn.addEventListener("click", () => {
      const theme = btn.dataset.theme;
      body.classList.remove('theme-light','theme-dark','theme-blue');
      body.classList.add(`theme-${theme}`);
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

function setupModeSelector() {
  const radios = document.querySelectorAll("input[name='mode']");
  const wrap = document.getElementById("calculator-wrapper");
  const init = document.querySelector("input[name='mode']:checked");
  if (init && init.value === "scientific" && wrap) wrap.classList.add("scientific-mode");
  radios.forEach(r => r.addEventListener("change", () => {
    if (!wrap) return;
    if (r.value === "scientific") wrap.classList.add("scientific-mode");
    else wrap.classList.remove("scientific-mode");
  }));
}

function setupHistoryUI(calcInstance) {
  const toggle = document.getElementById("history-toggle");
  const modal = document.getElementById("history-modal");
  if (!modal) {
    if (toggle) {
      toggle.addEventListener("click", () => {
        alert("Riwayat tidak tersedia (elemen modal tidak ditemukan).");
      });
    }
    return;
  }
  const backdrop = modal.querySelector(".history-modal-backdrop");
  const closeBtn = document.getElementById("close-history-btn");
  const clearBtn = document.getElementById("clear-history-btn");
  const exportBtn = document.getElementById("export-history-btn");
  const list = document.getElementById("history-full-list");
  const empty = document.getElementById("history-empty");
  const mini = document.getElementById("history-list");

  function renderFull() {
    if (!list) return;
    const arr = calcInstance.fullHistory || [];
    if (arr.length === 0) {
      list.style.display = "none";
      if (empty) empty.style.display = "block";
      return;
    }
    if (empty) empty.style.display = "none";
    list.style.display = "block";
    list.innerHTML = arr.map(item => `
      <li class="history-item-full" data-exp="${encodeURIComponent(item.expression)}" data-res="${encodeURIComponent(item.result)}">
        <div class="left"><div class="exp">${item.expression.replace(/\*/g,'×')}</div></div>
        <div class="res">${item.result}</div>
      </li>
    `).join('');
  }

  function open() { renderFull(); modal.style.display = "flex"; document.body.style.overflow = 'hidden'; }
  function close() { modal.style.display = "none"; document.body.style.overflow = ''; }

  if (toggle) toggle.addEventListener("click", open);
  if (closeBtn) closeBtn.addEventListener("click", close);
  if (backdrop) backdrop.addEventListener("click", close);

  if (clearBtn) clearBtn.addEventListener("click", () => {
    if (!confirm("Hapus semua riwayat?")) return;
    calcInstance.clearFullHistory();
    calcInstance.history = [];
    renderFull();
    calcInstance.updateDisplay();
  });

  if (exportBtn) exportBtn.addEventListener("click", () => {
    const data = JSON.stringify(calcInstance.fullHistory || [], null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "calculator-history.json";
    a.click();
    URL.revokeObjectURL(url);
  });

  if (list) {
    list.addEventListener("click", (e) => {
      const li = e.target.closest(".history-item-full");
      if (!li) return;
      calcInstance.currentOperand = decodeURIComponent(li.dataset.res || '');
      calcInstance.expression = '';
      calcInstance.pendingEquals = true;
      calcInstance.updateDisplay();
      close();
    });
  }

  if (mini) {
    mini.addEventListener("click", (e) => {
      const li = e.target.closest(".history-item");
      if (!li) return;
      calcInstance.currentOperand = decodeURIComponent(li.dataset.res || '');
      calcInstance.expression = '';
      calcInstance.pendingEquals = true;
      calcInstance.updateDisplay();
    });
  }

  renderFull();
}

document.addEventListener("DOMContentLoaded", () => {
  const prevEl = document.querySelector("[data-previous-operand]");
  const currEl = document.querySelector("[data-current-operand]");

  const calc = new Calculator(prevEl, currEl);

  document.querySelectorAll("[data-number]").forEach(btn => {
    btn.addEventListener("click", () => { calc.appendNumber(btn.dataset.number); calc.updateDisplay(); });
  });

  const dec = document.querySelector("[data-decimal]");
  if (dec) dec.addEventListener("click", () => { calc.appendNumber("."); calc.updateDisplay(); });

  document.querySelectorAll("[data-operator]").forEach(btn => {
    btn.addEventListener("click", () => { calc.chooseOperation(btn.dataset.operator); calc.updateDisplay(); });
  });

  const eq = document.querySelector("[data-equals]");
  if (eq) eq.addEventListener("click", () => { calc.compute(); calc.updateDisplay(); });

  const del = document.querySelector("[data-delete]");
  if (del) del.addEventListener("click", () => { calc.delete(); calc.updateDisplay(); });
  const ac = document.querySelector("[data-all-clear]");
  if (ac) ac.addEventListener("click", () => { calc.clear(); calc.updateDisplay(); });

  document.querySelectorAll("[data-function]").forEach(btn => {
    btn.addEventListener("click", () => {
      const isScientific = document.getElementById("mode-scientific") && document.getElementById("mode-scientific").checked;
      if (!isScientific) return;
      calc.chooseFunction(btn.dataset.function);
    });
  });

  document.querySelectorAll("[data-memory]").forEach(btn => {
    btn.addEventListener("click", () => {
      switch (btn.dataset.memory) {
        case "mc": calc.memoryClear(); break;
        case "mr": calc.memoryRecall(); break;
        case "m+": calc.memoryAdd(); break;
        case "m-": calc.memorySubtract(); break;
      }
      calc.updateDisplay();
    });
  });

  const keyMap = { '/':'÷','*':'×', 'Enter':'=', '=':'=' };
  document.addEventListener("keydown", (e) => {
    const rawKey = e.key;
    const mappedKey = rawKey in keyMap ? keyMap[rawKey] : rawKey;
    if (/\d/.test(mappedKey)) { e.preventDefault(); calc.appendNumber(mappedKey); calc.updateDisplay(); return; }
    if (mappedKey === '.') { e.preventDefault(); calc.appendNumber('.'); calc.updateDisplay(); return; }
    if (['+','-','×','÷','%'].includes(mappedKey)) { e.preventDefault(); calc.chooseOperation(mappedKey); calc.updateDisplay(); return; }
    if (mappedKey === '=' || rawKey === 'Enter') { e.preventDefault(); calc.compute(); calc.updateDisplay(); return; }
    if (rawKey === 'Backspace') { e.preventDefault(); calc.delete(); calc.updateDisplay(); return; }
    if (rawKey === 'Delete') { e.preventDefault(); calc.clear(); calc.updateDisplay(); return; }
  });

  setupThemeSelector();
  setupModeSelector();
  setupHistoryUI(calc);
  calc.updateDisplay();
});
