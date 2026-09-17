const CONFIG = {
    pvLabels: ['هـ', 'ص', 'د', 'ی'],
    pvClasses: ['color-h', 'color-s', 'color-d', 'color-y']
};

let STORAGE = 'studentProfile_Taqsim4x1_Default';
let GAME_STATE_STORAGE = 'gameState_Taqsim4x1_Default';

const toPersian = num => String(num).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
const toEnglish = str => {
    if(!str) return '';
    return String(str).trim()
        .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
        .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)) 
        .replace(/[^\d]/g, '');
};
const nowStr = () => new Date().toLocaleString('fa-IR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
const getEl = id => document.getElementById(id);

function toggleAppSound() {
    const isMuted = GameAudio.toggleMute();
    const btn = getEl('btn-sound-toggle');
    if (btn) btn.innerText = isMuted ? '🔇 صدا: خاموش' : '🔊 صدا: روشن';
}

let tutBtnSafetyTimer = null;
function setTutorialBtnState(disabled) {
    const btn = getEl('btn-next-tutorial');
    if (btn) btn.disabled = disabled;
    clearTimeout(tutBtnSafetyTimer);
    if (disabled) {
        tutBtnSafetyTimer = setTimeout(() => {
            if (btn) btn.disabled = false;
        }, 8000);
    }
}

const TutorialVisuals = {
    clear() {
        document.querySelectorAll('.tut-multiply-glow').forEach(el => {
            el.classList.remove('tut-multiply-glow');
        });
    },
    showMultiplyVisuals(stg) {
        this.clear();
        const qBox = getEl(`q-${stg}`);
        const dvrBox = getEl('divisor-display');
        if (qBox) qBox.classList.add('tut-multiply-glow');
        if (dvrBox) dvrBox.classList.add('tut-multiply-glow');
    }
};

const app = {
    state: { user: null, stats: { games: 0, stars: 0 }, lastHelp: false, isTutorial: false, reportShown: false },
    init() {
        authenticatePortalStudent();
    },
    save() { 
        localStorage.setItem(STORAGE, JSON.stringify(this.state)); 
    },
    showScreen(id) {
        const screens = ['screen-register', 'screen-game', 'screen-report', 'screen-assistant', 'portal-submitting-screen'];
        screens.forEach(s => {
            const el = document.getElementById(s);
            if (el) {
                el.classList.add('hidden');
                el.classList.remove('active');
                el.style.display = '';
            }
        });
        const target = document.getElementById(id);
        if (target) {
            target.classList.remove('hidden');
            target.classList.add('active');
            target.style.display = '';
        }
        const statsEl = document.getElementById('stats-bar');
        if (statsEl) {
            statsEl.classList.toggle('hidden', id === 'screen-register' || id === 'screen-assistant' || id === 'portal-submitting-screen');
        }
        if (id === 'screen-report') {
            app.renderReport(app.state.stats.stars >= Portal.requiredStars, app.state.stats.stars);
        }
        if (id !== 'screen-game') {
            game.hideNumberPad();
            GameAudio.stop();
            TutorialVisuals.clear();
            setTutorialBtnState(false);
        }
    },
    updateStats() {
        if(this.state.user) { 
            getEl('disp-name').innerText = this.state.user; 
            getEl('disp-games').innerText = toPersian(this.state.stats.games); 
            getEl('disp-stars').innerText = toPersian(this.state.stats.stars); 
        }
    },
    async finishGame(success) {
        GameAudio.stop();
        TutorialVisuals.clear();
        setTutorialBtnState(false);
        const earnedThisGame = (success && !game.helpUsed && !app.state.isTutorial) ? 1 : 0;
        app.state.stats.games = app.state.stats.games + 1;
        if (earnedThisGame === 1) {
            app.state.stats.stars = app.state.stats.stars + 1;
            GameAudio.playSFX('win');
        }
        app.state.lastHelp = (game.helpUsed || app.state.isTutorial); 
        app.state.reportShown = true; 
        game.clearState(); 
        app.save(); 
        app.updateStats();

        app.showScreen('portal-submitting-screen');
        await Portal.submitProgress(earnedThisGame, {
            onSuccess: (data) => {
                app.state.stats.games = data.plays;
                app.state.stats.stars = data.stars;
                app.save();
                app.updateStats();
                app.showScreen('screen-report');
            },
            onFailure: (err) => {}
        });
    },
    renderReport(goalReached, currentStars) {
        const stars = currentStars !== undefined ? currentStars : app.state.stats.stars;
        const games = app.state.stats.games;
        const dateText = nowStr();

        getEl('rep-name').innerText = app.state.user; 
        getEl('rep-time').innerText = toPersian(dateText); 
        getEl('rep-games').innerText = toPersian(games); 
        getEl('rep-stars').innerText = toPersian(stars);

        const repSchool = getEl('rep-school');
        if (repSchool) {
            const schoolTitleEl = getEl('portal-school-title');
            repSchool.innerText = schoolTitleEl && schoolTitleEl.textContent !== '---' ? schoolTitleEl.textContent : '---';
        }

        const repReqStarsRow = getEl('portal-req-stars-row');
        const repReqStars = getEl('rep-req-stars');
        if (repReqStarsRow && repReqStars) {
            repReqStarsRow.style.display = 'block';
            repReqStars.innerText = toPersian(Portal.requiredStars) + ' ⭐';
        }

        const goalBadge = getEl('portal-goal-reached-badge');
        const submitBadge = getEl('portal-submit-badge');
        const backInstruction = getEl('portal-back-instruction');
        const playAgainBtn = getEl('playAgainBtn');

        goalBadge.style.display = 'none';
        submitBadge.style.display = 'none';
        backInstruction.style.display = 'none';
        playAgainBtn.style.display = 'block';

        if (app.state.lastHelp) {
            playAgainBtn.innerText = "بازیِ دوباره بدون کمک 💡";
            backInstruction.innerHTML = `
                <div style="background:#fff3e0; border:1px solid #ffe082; color:#e65100; padding:12px; border-radius:12px; margin-top:10px; font-size:11.5pt; line-height:1.6; text-align:center; width: 100%;">
                    💡 این دور بازی‌ات آموزشی بود و برای گرفتن ستاره باید بدون کمک حلش کنی. دکمه‌ی پایین رو بزن تا بدون کمک تلاش کنی!
                </div>
            `;
            backInstruction.style.display = 'block';
        } else if (goalReached) {
            goalBadge.style.display = 'block';
            playAgainBtn.style.display = 'none';
            backInstruction.innerHTML = `
                <div style="background:#e8f5e9; border:1px solid #2e7d32; color:#1b5e20; padding:15px; border-radius:12px; margin-top:10px; font-weight:bold; font-size:12pt; line-height:1.6; text-align:center; width: 100%;">
                    📱 آفرین! تکلیفت با موفقیت تموم شد.<br>
                    حالا با زدن <b>دکمه‌ی بازگشت (Back) گوشی</b> به پرتال کلاس برگرد.
                </div>
            `;
            backInstruction.style.display = 'block';
        } else {
            const remaining = Portal.requiredStars - stars;
            submitBadge.innerHTML = `✨ آفرین دانش‌آموز زرنگم! تو <b>${toPersian(stars)}</b> ستاره از <b>${toPersian(Portal.requiredStars)}</b> ستاره‌ی این تکلیف رو گرفتی! ⭐ فقط به <b>${toPersian(remaining)}</b> ستاره‌ی دیگه نیاز داری تا تکلیفت کامل بشه. بدو برو بعدی رو هم حل کن! 🏆`;
            submitBadge.style.display = 'block';
            playAgainBtn.innerText = "گرفتن ستاره‌ی بیشتر 🎮";
            backInstruction.innerHTML = `
                <div style="background:#fff3e0; border:1px solid #ffe082; color:#e65100; padding:12px; border-radius:12px; margin-top:10px; font-size:11.5pt; line-height:1.6; text-align:center; width: 100%;">
                    💡 اگه می‌خوای ادامه‌ی بازی رو بعداً انجام بدی، با زدن <b>دکمه‌ی بازگشت (Back) گوشی</b> به پرتال برگرد.
                </div>
            `;
            backInstruction.style.display = 'block';
        }
    },
    restartGame() { 
        GameAudio.stop();
        TutorialVisuals.clear();
        setTutorialBtnState(false);
        app.state.reportShown = false; 
        app.state.isTutorial = false; 
        game.helpUsed = false;
        app.save(); 
        app.showScreen('screen-game'); 
        game.start(); 
    }
};

const game = {
    dividend: 0, divisor: 0, digits: [], stage: 0, subStep: 'SELECT', activeBox: null, helpUsed: false, mathSteps: [], currentRem: 0, lastRemRowIndex: -1,
    isFailedStep: false,
    
    start() {
        GameAudio.stop();
        TutorialVisuals.clear();
        setTutorialBtnState(false);
        this.divisor = Math.floor(Math.random() * 8) + 2; 
        this.dividend = Math.floor(Math.random() * 8000) + 1000;
        this.digits = String(this.dividend).split('').map(Number); 
        this.stage = 0; 
        this.subStep = 'SELECT'; 
        this.currentRem = 0; 
        this.helpUsed = false;
        this.mathSteps = Array(4).fill(null).map(() => ({ q: null, p: Array(4).fill(''), r: Array(4).fill('') })); 
        this.lastRemRowIndex = -1;
        this.isFailedStep = false;
        
        const btn = getEl('btn-check'); 
        btn.innerText = '✅ بررسی'; 
        btn.className = 'btn btn-success'; 
        btn.disabled = true;
        btn.setAttribute('onclick', 'game.checkCurrentStep()');
        
        this.saveState(); 
        this.renderUI(); 
        this.resetToNormalUI();
        this.msg('روی اولین رقم سمت چپ (هزارتایی) کلیک کن.');
    },
    
    saveState() { 
        localStorage.setItem(GAME_STATE_STORAGE, JSON.stringify({ 
            div: this.dividend, 
            dvr: this.divisor, 
            digs: this.digits, 
            stg: this.stage, 
            sub: this.subStep, 
            hlp: this.helpUsed, 
            rem: this.currentRem, 
            mStp: this.mathSteps, 
            lrr: this.lastRemRowIndex, 
            ifs: this.isFailedStep,
            tut: app.state.isTutorial
        })); 
    },
    
    loadState() {
        const saved = localStorage.getItem(GAME_STATE_STORAGE); 
        if (!saved) return this.start(); 
        const d = JSON.parse(saved); 
        Object.assign(this, { 
            dividend: d.div, 
            divisor: d.dvr, 
            digits: d.digs, 
            stage: d.stg, 
            subStep: d.sub, 
            helpUsed: d.hlp, 
            currentRem: d.rem, 
            mathSteps: d.mStp, 
            lastRemRowIndex: (d.lrr !== undefined ? d.lrr : -1), 
            isFailedStep: (d.ifs !== undefined ? d.ifs : false) 
        });
        
        if (d.tut !== undefined) {
            app.state.isTutorial = d.tut;
        }

        this.renderUI();
        
        if (app.state.isTutorial) {
            this.setTutorialUI();
            if (this.subStep === 'SELECT') {
                if (this.stage === 0) {
                    this.msg('حالت آموزشی: اولین رقم از چپ رو انتخاب می‌کنیم.');
                } else {
                    const isTopRowOnly = (this.getLastActiveRowIdx(this.stage) === -1);
                    if (isTopRowOnly) {
                        this.msg(`رقم بعدی (${CONFIG.pvLabels[this.stage]}) رو هم انتخاب می‌کنیم.`);
                    } else {
                        this.msg(`حالا رقم بعدی (${CONFIG.pvLabels[this.stage]}) رو می‌آوریم پایین.`);
                    }
                }
            } else if (this.subStep === 'QUOTIENT') {
                const total = this.getCurrentTotal();
                let correctQ = Math.floor(total / this.divisor);
                if (correctQ > 9) correctQ = 9;
                if (correctQ === 0) {
                    this.msg('چون تقسیم نمی‌شه، در خارج‌قسمت یک ۰ می‌ذاریم.');
                } else {
                    this.msg(`${toPersian(total)} تقسیم بر ${toPersian(this.divisor)} می‌شه ${toPersian(correctQ)}`);
                }
            } else if (this.subStep === 'MULTIPLY_P') {
                const q = this.mathSteps[this.stage].q;
                const prod = q * this.divisor;
                this.msg(`حالا ${toPersian(q)} ضربدر ${toPersian(this.divisor)} می‌شه ${toPersian(prod)}`);
            } else if (this.subStep === 'SUBTRACT') {
                this.msg('حالا تفریق رو انجام می‌دیم.');
            } else if (this.subStep === 'FINISH') {
                this.msg('تموم شد! دکمه‌ی پایان رو بزن.');
            }
        } else {
            this.resetToNormalUI();
            this.updateCheckBtn();
            if(this.subStep === 'SELECT') { 
                if(this.stage === 0) this.msg('روی اولین رقم سمت چپ کلیک کن.'); 
                else this.msg(`برای ادامه، روی رقم ${CONFIG.pvLabels[this.stage]} کلیک کن.`); 
            } 
            else if (this.subStep === 'SUBTRACT') { 
                this.msg('تفریق کن (از راست).'); 
            } else { 
                this.msg('بازیابی شد. ادامه بده.'); 
            }
        }
        
        this.updateSelectHighlight(); 
        if (this.subStep !== 'SELECT' && this.stage < 4) {
            setTimeout(() => {
                this.showBracket(this.stage);
            }, 200);
        }
    },
    clearState() { 
        localStorage.removeItem(GAME_STATE_STORAGE); 
    },

    setTutorialUI() {
        getEl('tutorial-controls').classList.remove('hidden'); 
        getEl('game-controls').classList.add('hidden'); 
        getEl('help-button').classList.add('hidden');
        getEl('btn-check').disabled = true;
        this.hideNumberPad();
        const tutBtn = getEl('btn-next-tutorial');
        if (tutBtn) {
            tutBtn.innerText = '👇 مرحله‌ی بعد (همراه با صدا 🔊)';
            tutBtn.className = 'btn btn-tutorial';
        }
    },
    resetToNormalUI() {
        getEl('tutorial-controls').classList.add('hidden'); 
        getEl('game-controls').classList.remove('hidden'); 
        getEl('help-button').classList.remove('hidden');
        TutorialVisuals.clear();
        setTutorialBtnState(false);
    },

    renderUI() {
        getEl('math-area').innerHTML = ''; 
        getEl('dividend-row').innerHTML = ''; 
        getEl('quotient-row').innerHTML = ''; 
        getEl('divisor-display').innerText = toPersian(this.divisor);
        
        for(let i=0; i<4; i++) { 
            const b = document.createElement('div'); 
            b.className = 'box readonly'; 
            b.innerText = toPersian(this.digits[i]); 
            b.id = `div-${i}`; 
            b.onclick = () => this.clkDividend(i); 
            getEl('dividend-row').appendChild(b); 
        }
        
        for (let i = 0; i < 4; i++) { 
            const b = document.createElement('div'); 
            b.className = `box ${CONFIG.pvClasses[i]}`; 
            b.id = `q-${i}`; 
            b.innerHTML = `<span class="pv-label">${CONFIG.pvLabels[i]}</span><span class="val"></span>`; 
            b.onclick = () => this.activate(b.id); 
            getEl('quotient-row').appendChild(b); 
        }
        
        this.mathSteps.forEach((step, idx) => {
            if (step.q !== null) { 
                const qBox = getEl(`q-${idx}`); 
                qBox.querySelector('.val').innerText = toPersian(step.q); 
                qBox.classList.add('has-val'); 
                let isLocked = (idx < this.stage) || (idx === this.stage && (this.subStep === 'SUBTRACT' || this.subStep === 'FINISH'));
                if (isLocked) {
                    qBox.classList.add('readonly', 'correct');
                } else if (this.isFailedStep && idx === this.stage && this.subStep === 'MULTIPLY_P') {
                    qBox.classList.add('wrong');
                }
            }
            if (step.p.some(v => v !== '') || (idx === this.stage && this.subStep !== 'SELECT')) {
                if (step.q !== 0 && step.q !== null) {
                    this.createProductRow(idx); 
                    step.p.forEach((val, i) => { 
                        if (val !== '') {
                            let pLocked = (idx < this.stage) || (idx === this.stage && (this.subStep === 'SUBTRACT' || this.subStep === 'FINISH'));
                            setBoxVal(`p-${idx}-${i}`, val, pLocked);
                            if (!pLocked && this.isFailedStep && idx === this.stage && this.subStep === 'MULTIPLY_P') {
                                getEl(`p-${idx}-${i}`).classList.add('wrong');
                            }
                        }
                    });
                    if (idx < this.stage || this.subStep === 'SUBTRACT' || this.subStep === 'FINISH') {
                        this.createRemainderRow(idx);
                        step.r.forEach((val, i) => { 
                            if (val !== '') {
                                let rLocked = (idx < this.stage) || (idx === this.stage && this.subStep === 'FINISH');
                                setBoxVal(`r-${idx}-${i}`, val, rLocked);
                                if (!rLocked && this.isFailedStep && idx === this.stage && this.subStep === 'SUBTRACT') {
                                    getEl(`r-${idx}-${i}`).classList.add('wrong');
                                }
                            }
                        });
                    }
                    if(idx < this.stage) { 
                        const pRow = getEl(`row-p-${idx}`); 
                        if(pRow) pRow.classList.add('dimmed'); 
                    }
                }
            }
        });
        
        for (let s = 1; s <= this.stage; s++) {
             if (s === this.stage && this.subStep === 'SELECT') continue;
             let restoreRowIdx = this.getLastActiveRowIdx(s);
             if (restoreRowIdx !== -1) {
                 const rBox = getEl(`r-${restoreRowIdx}-${s}`);
                 if (rBox) {
                     rBox.innerText = toPersian(this.digits[s]);
                     rBox.classList.remove('invisible-box');
                     rBox.classList.add('readonly');
                     rBox.onclick = () => { this.activate(rBox.id); this.handleBorrowClick(rBox.id); };
                 }
             }
        }
        this.updateSelectHighlight();
    },

    getLastActiveRowIdx(currentStage) {
        for (let i = currentStage - 1; i >= 0; i--) {
            if (this.mathSteps[i].q !== 0 && this.mathSteps[i].q !== null) { return i; }
        }
        return -1; 
    },
    
    getTopCellForColumn(colIdx) {
        let lastActive = this.getLastActiveRowIdx(this.stage);
        if (lastActive === -1) { return getEl(`div-${colIdx}`); } 
        else { return getEl(`r-${lastActive}-${colIdx}`); }
    },

    createProductRow(idx) {
        if (getEl(`row-p-${idx}`)) return; 
        this.lastRemRowIndex = idx; 
        const container = getEl('math-area');
        const rowP = document.createElement('div'); 
        rowP.className = 'row-container'; 
        rowP.id = `row-p-${idx}`; 
        const op = document.createElement('div'); 
        op.className = 'operator'; 
        op.innerText = '-'; 
        rowP.appendChild(op);
        
        const q = this.mathSteps[idx].q; 
        const prod = q * this.divisor; 
        const sProd = String(prod);
        const pEnd = idx; 
        const pStart = idx - sProd.length + 1;

        for(let i=0; i<4; i++) {
            const b = document.createElement('div'); 
            b.className = 'box'; 
            b.id = `p-${idx}-${i}`;
            if (i < pStart || i > pEnd) b.classList.add('invisible-box'); 
            else b.onclick = () => this.activate(b.id);
            rowP.appendChild(b);
        }
        container.appendChild(rowP);
        const line = document.createElement('div'); 
        line.className = 'subtraction-line'; 
        container.appendChild(line);
    },

    createRemainderRow(idx) {
        if (getEl(`row-r-${idx}`)) return; 
        const container = getEl('math-area');
        const rowR = document.createElement('div'); 
        rowR.className = 'row-container'; 
        rowR.id = `row-r-${idx}`;
        
        let workingVal = this.digits[0];
        for (let k = 0; k <= idx; k++) {
            const stepQ = (this.mathSteps[k].q !== null) ? this.mathSteps[k].q : 0;
            const stepProd = stepQ * this.divisor;
            let stepRem = workingVal - stepProd;
            
            if (k === idx) {
                const sRem = String(stepRem);
                const rEnd = idx;
                const rStart = idx - sRem.length + 1;
                for(let i=0; i<4; i++) {
                    const b = document.createElement('div'); 
                    b.className = 'box'; 
                    b.id = `r-${idx}-${i}`; 
                    let isVisible = false;
                    if (i >= rStart && i <= rEnd) isVisible = true;
                    if (i === idx + 1) isVisible = false; 
                    if (!isVisible) b.classList.add('invisible-box');
                    b.onclick = () => { this.activate(b.id); this.handleRemainderClick(idx, i); };
                    rowR.appendChild(b);
                }
            } else {
                if (k + 1 < 4) workingVal = (stepRem * 10) + this.digits[k+1];
            }
        }
        container.appendChild(rowR);
    },
    
    handleRemainderClick(rIdx, cIdx) {
        if(app.state.isTutorial) return;
        if (this.subStep === 'SELECT' && rIdx === this.lastRemRowIndex && cIdx === this.stage) this.clkDividend(this.stage);
        if (this.subStep === 'SUBTRACT') {
            this.handleBorrowClick(`r-${rIdx}-${cIdx}`);
        }
    },
    
    checkBorrowNecessity(targetId) {
        const parts = targetId.split('-'); 
        let clickedCol = -1;
        if (parts[0] === 'div') clickedCol = parseInt(parts[1]); 
        else clickedCol = parseInt(parts[2]);
        
        const neighborCol = clickedCol + 1; 
        if (neighborCol > 3) return false;
        
        const topEl = this.getTopCellForColumn(neighborCol); 
        const botEl = getEl(`p-${this.stage}-${neighborCol}`); 
        if (!topEl || !botEl || botEl.classList.contains('invisible-box')) return false;
        
        let topVal = parseInt(toEnglish(topEl.innerText));
        if (topEl.classList.contains('borrow-dest')) { 
            const destAttr = topEl.getAttribute('data-val-dest'); 
            if(destAttr) topVal = parseInt(toEnglish(destAttr)); 
            else topVal += 10; 
        }
        const botVal = parseInt(toEnglish(botEl.innerText)) || 0; 
        if (isNaN(topVal) || isNaN(botVal)) return false;
        if (topVal < botVal) return true; 
        if (topEl.classList.contains('borrow-dest')) return true; 
        return false;
    },

    handleBorrowClick(id) {
        const el = getEl(id); 
        if(!el) return;
        const parts = id.split('-'); 
        let clickedCol = -1;
        if (parts[0] === 'div') clickedCol = parseInt(parts[1]); 
        else clickedCol = parseInt(parts[2]);
        
        const neighborCol = clickedCol + 1;
        const neighbor = this.getTopCellForColumn(neighborCol);

        if (el.classList.contains('borrow-src')) { 
            if(app.state.isTutorial) return; 
            el.classList.remove('borrow-src'); 
            el.removeAttribute('data-val-sub'); 
            if (neighbor) { 
                neighbor.classList.remove('borrow-dest'); 
                neighbor.removeAttribute('data-val-dest'); 
            } 
            return; 
        }
        
        const needed = this.checkBorrowNecessity(id);
        if (!needed && !app.state.isTutorial) { 
            GameAudio.playSFX('wrong');
            el.classList.add('shake'); 
            setTimeout(() => el.classList.remove('shake'), 500); 
            this.msg('نیازی به قرض‌گرفتن نیست.', true); 
            return; 
        }
        if (!needed && app.state.isTutorial) return; 

        const originalVal = parseInt(toEnglish(el.innerText)); 
        if (isNaN(originalVal)) return; 
        let newVal = (originalVal === 0) ? 9 : originalVal - 1;
        el.classList.add('borrow-src'); 
        el.setAttribute('data-val-sub', toPersian(newVal));
        if (neighbor) { 
            const originalNeighborVal = parseInt(toEnglish(neighbor.innerText)); 
            if (!isNaN(originalNeighborVal)) { 
                neighbor.classList.add('borrow-dest'); 
                neighbor.setAttribute('data-val-dest', toPersian(originalNeighborVal + 10)); 
            } 
        }
        GameAudio.playSFX('click');
        if(!app.state.isTutorial) this.msg('قرض گرفته شد. حالا تفریق کن.');
    },

    updateSelectHighlight() {
        document.querySelectorAll('.action-target').forEach(el => el.classList.remove('action-target'));
        if (this.subStep === 'SELECT') { getEl(`div-${this.stage}`).classList.add('action-target'); }
    },

    clkDividend(idx) {
        if (this.subStep === 'SUBTRACT') return this.handleBorrowClick(`div-${idx}`);
        if (this.subStep === 'QUOTIENT' && idx === this.stage && this.mathSteps[this.stage] && this.mathSteps[this.stage].q === 0) {
            this.currentRem = this.getCurrentTotal(); 
            this.stage++; 
            this.subStep = 'SELECT'; 
            this.saveState(); 
            this.updateSelectHighlight();
        }
        if (this.stage === 4) return this.msg('تموم شد.');
        if (this.subStep !== 'SELECT') return this.msg('مرحله‌ی جاری رو کامل کن.', true);
        if (idx !== this.stage) return this.msg(`نوبت رقم ${CONFIG.pvLabels[this.stage]} هست.`, true);
        
        GameAudio.playSFX('click');
        if (idx > 0) {
             let targetRowIdx = this.getLastActiveRowIdx(idx);
             let targetCell = null;
             if (targetRowIdx !== -1) { targetCell = getEl(`r-${targetRowIdx}-${idx}`); } 
             
             if(targetCell) {
                 targetCell.innerText = toPersian(this.digits[idx]);
                 targetCell.classList.remove('invisible-box');
                 targetCell.classList.add('readonly');
                 targetCell.onclick = () => { this.activate(targetCell.id); this.handleBorrowClick(targetCell.id); };
                 targetCell.style.transform = 'translateY(-20px)';
                 setTimeout(() => targetCell.style.transform = 'translateY(0)', 50);
             }
        }

        this.subStep = 'QUOTIENT'; 
        this.updateSelectHighlight(); 
        this.showBracket(idx); 
        this.activate(`q-${idx}`); 
        if(!app.state.isTutorial) {
            this.msg('تقسیم کن و جواب رو بنویس.');
        }
        this.saveState();
    },

    resetProductRow(idx) {
        const rowP = getEl(`row-p-${idx}`);
        if (rowP) {
            const line = rowP.nextElementSibling;
            if (line && line.classList && line.classList.contains('subtraction-line')) {
                line.remove();
            }
            rowP.remove();
        }
        const rowR = getEl(`row-r-${idx}`);
        if (rowR) {
            rowR.remove();
        }
        this.mathSteps[idx].p = Array(4).fill('');
        this.mathSteps[idx].r = Array(4).fill('');
    },

    resetFailedStep() {
        this.isFailedStep = false;
        
        if (this.subStep === 'MULTIPLY_P') {
            this.resetProductRow(this.stage);
            this.mathSteps[this.stage].q = null;
            
            const qBox = getEl(`q-${this.stage}`);
            if (qBox) {
                const valSpan = qBox.querySelector('.val');
                if (valSpan) valSpan.innerText = '';
                else qBox.innerText = '';
                qBox.classList.remove('has-val', 'wrong', 'correct', 'readonly');
            }
            
            this.subStep = 'QUOTIENT';
            this.activeBox = null;
            this.activate(`q-${this.stage}`);
            this.msg('خارج‌قسمت رو دوباره بنویس.');
        } 
        else if (this.subStep === 'SUBTRACT') {
            const rRow = getEl(`row-r-${this.stage}`);
            if (rRow) {
                const visibleBoxes = Array.from(rRow.querySelectorAll('.box:not(.invisible-box)'));
                visibleBoxes.forEach(b => {
                    b.innerText = '';
                    b.classList.remove('has-val', 'wrong', 'correct');
                });
            }
            this.mathSteps[this.stage].r = Array(4).fill('');
            
            if (rRow) {
                const visibleBoxes = Array.from(rRow.querySelectorAll('.box:not(.invisible-box)'));
                if (visibleBoxes.length > 0) {
                    this.activeBox = null;
                    this.activate(visibleBoxes[visibleBoxes.length - 1].id);
                }
            }
            this.msg('تفریق رو دوباره بنویس.');
        }
        
        this.updateCheckBtn();
        this.saveState();
    },

    handleQuotientInput(val) {
        const total = this.getCurrentTotal();
        let correctQ = Math.floor(total / this.divisor);
        if (correctQ > 9) correctQ = 9;

        const qBox = getEl(`q-${this.stage}`);

        if (val === 0) {
            if (correctQ === 0) {
                this.mathSteps[this.stage].q = 0;
                const valSpan = qBox.querySelector('.val');
                if (valSpan) valSpan.innerText = toPersian(0);
                else qBox.innerText = toPersian(0);
                
                qBox.classList.add('correct', 'readonly', 'has-val');
                qBox.classList.remove('wrong');
                this.hideNumberPad();
                this.currentRem = total; 
                if(this.stage === 3) {
                    this.msg('پایان تقسیم! دکمه‌ی بررسی رو بزن.');
                    this.subStep = 'FINISH';
                } else {
                    this.stage++;
                    this.subStep = 'SELECT';
                    this.msg(`چون نمی‌شه، ۰ گذاشتیم. حالا رقم بعدی (${CONFIG.pvLabels[this.stage]}) رو انتخاب کن.`);
                    this.updateSelectHighlight();
                }
                this.updateCheckBtn();
                this.saveState();
            } else {
                const valSpan = qBox.querySelector('.val');
                if (valSpan) valSpan.innerText = toPersian(0);
                else qBox.innerText = toPersian(0);
                
                qBox.classList.add('wrong', 'has-val');
                this.msg('اشتباهه.', true);
                setTimeout(() => {
                    if (valSpan) valSpan.innerText = '';
                    else qBox.innerText = '';
                    qBox.classList.remove('wrong', 'has-val');
                    this.mathSteps[this.stage].q = null;
                    this.activate(`q-${this.stage}`);
                }, 1000);
            }
        } else {
            this.mathSteps[this.stage].q = val;
            const valSpan = qBox.querySelector('.val');
            if (valSpan) valSpan.innerText = toPersian(val);
            else qBox.innerText = toPersian(val);
            
            qBox.classList.add('has-val');
            qBox.classList.remove('wrong');
            
            this.subStep = 'MULTIPLY_P';
            this.createProductRow(this.stage);
            this.msg(`حالا جواب ${toPersian(val)} ضربدر ${toPersian(this.divisor)} رو بنویس.`);
            
            const pRow = getEl(`row-p-${this.stage}`);
            if (pRow) {
                const boxes = Array.from(pRow.querySelectorAll('.box:not(.invisible-box)'));
                if (boxes.length > 0) {
                    this.activate(boxes[0].id);
                }
            }
            this.updateCheckBtn();
            this.saveState();
        }
    },

    activate(id) {
        if (app.state.isTutorial) return; 
        const targetEl = getEl(id);
        if (!targetEl || targetEl.classList.contains('readonly') || targetEl.classList.contains('invisible-box')) return;
        
        const parts = id.split('-'); 
        if (parts[0] === 'q') { 
            const idx = parseInt(parts[1]); 
            if (idx !== this.stage) return; 
            if (this.subStep !== 'QUOTIENT') return; 
        }
        
        if (this.activeBox) {
            const prevEl = getEl(this.activeBox);
            if (prevEl) prevEl.classList.remove('active-input');
        }
        
        this.activeBox = id; 
        targetEl.classList.add('active-input'); 
        getEl('number-pad').classList.remove('hidden');
        setTimeout(() => targetEl.scrollIntoView({behavior: "smooth", block: "center", inline: "nearest"}), 100);
    },

    hideNumberPad() { 
        getEl('number-pad').classList.add('hidden'); 
        if (this.activeBox) {
            const el = getEl(this.activeBox);
            if (el) el.classList.remove('active-input');
        }
        this.activeBox = null; 
    },

    inputDigit(n) {
        GameAudio.playSFX('click');
        if (this.isFailedStep) {
            this.resetFailedStep();
            return;
        }
        if (!this.activeBox && !app.state.isTutorial) return; 
        let targetId = this.activeBox;
        if (app.state.isTutorial) targetId = n.targetId; 

        const el = getEl(targetId); 
        const [type, stg, idx] = targetId.split('-'); 
        const s = parseInt(stg); 
        const i = parseInt(idx);
        const val = app.state.isTutorial ? n.val : n;

        if (type === 'q') {
            const valSpan = el.querySelector('.val');
            if (valSpan) {
                valSpan.innerText = toPersian(val);
            } else {
                el.innerText = toPersian(val);
            }
        } else {
            el.innerText = toPersian(val);
        }
        el.classList.add('has-val'); 
        el.classList.remove('wrong');

        if (type === 'q') {
             if(app.state.isTutorial) {
                 this.mathSteps[s].q = val; 
                 el.classList.add('correct', 'readonly');
                 if (val === 0) {
                    this.currentRem = this.getCurrentTotal(); 
                    if(this.stage === 3) { 
                        this.subStep = 'FINISH'; 
                    } else { 
                        this.stage++; 
                        this.subStep = 'SELECT'; 
                        this.updateSelectHighlight(); 
                    }
                } else {
                    this.createProductRow(this.stage); 
                    this.subStep = 'MULTIPLY_P'; 
                }
             } else {
                 this.handleQuotientInput(val);
             } 
        } 
        else if (type === 'p') { 
            this.mathSteps[s].p[i] = String(val); 
            if(!app.state.isTutorial) { this.autoAdvance(type, s, i, false); } 
        } 
        else if (type === 'r') { 
            this.mathSteps[s].r[i] = String(val); 
            if(!app.state.isTutorial) { this.autoAdvance(type, s, i, true); } 
        }
        
        this.updateCheckBtn();
        this.saveState();
    },
    
    clearActiveBox() {
        GameAudio.playSFX('click');
        if (this.isFailedStep) {
            this.resetFailedStep();
            return;
        }
        const hasWrong = document.querySelector('.box.wrong') !== null;
        
        if (hasWrong || this.subStep === 'MULTIPLY_P') {
            if (this.subStep === 'MULTIPLY_P' || this.subStep === 'QUOTIENT') {
                this.resetProductRow(this.stage);
                this.mathSteps[this.stage].q = null;
                
                const qBox = getEl(`q-${this.stage}`);
                if (qBox) {
                    const valSpan = qBox.querySelector('.val');
                    if (valSpan) valSpan.innerText = '';
                    else qBox.innerText = '';
                    qBox.classList.remove('has-val', 'wrong', 'correct', 'readonly');
                }
                
                this.subStep = 'QUOTIENT';
                this.activeBox = null;
                this.activate(`q-${this.stage}`);
                this.msg('خارج‌قسمت رو بنویس.');
                this.updateCheckBtn();
                this.saveState();
                return;
            }
        }
        
        if (hasWrong || this.subStep === 'SUBTRACT') {
            if (this.subStep === 'SUBTRACT') {
                const rRow = getEl(`row-r-${this.stage}`);
                if (rRow) {
                    const visibleBoxes = Array.from(rRow.querySelectorAll('.box:not(.invisible-box)'));
                    visibleBoxes.forEach(b => {
                        b.innerText = '';
                        b.classList.remove('has-val', 'wrong', 'correct');
                    });
                }
                this.mathSteps[this.stage].r = Array(4).fill('');
                
                if (rRow) {
                    const visibleBoxes = Array.from(rRow.querySelectorAll('.box:not(.invisible-box)'));
                    if (visibleBoxes.length > 0) {
                        this.activeBox = null;
                        this.activate(visibleBoxes[visibleBoxes.length - 1].id);
                    }
                }
                this.msg('تفریق رو دوباره بنویس.');
                this.updateCheckBtn();
                this.saveState();
                return;
            }
        }

        if(!this.activeBox) return;
        const el = getEl(this.activeBox);
        if (!el) return;
        
        const [type, stg, idx] = this.activeBox.split('-');
        const s = parseInt(stg);
        const i = parseInt(idx);
        
        if (type === 'q') {
            const valSpan = el.querySelector('.val');
            if (valSpan) valSpan.innerText = '';
            else el.innerText = '';
        } else {
            el.innerText = '';
        }
        el.classList.remove('has-val', 'wrong');
        
        if(type === 'q') this.mathSteps[s].q = null;
        else if(type === 'p') this.mathSteps[s].p[i] = '';
        else if(type === 'r') this.mathSteps[s].r[i] = '';
        this.updateCheckBtn();
        this.saveState();
    },

    getCurrentTotal() {
        if (this.stage === 0) return this.digits[0];
        return (this.currentRem * 10) + this.digits[this.stage];
    },

    autoAdvance(type, s, i, isReverse) {
        const row = getEl(`row-${type}-${s}`);
        const boxes = Array.from(row.querySelectorAll('.box:not(.invisible-box)'));
        const currentId = `${type}-${s}-${i}`;
        const currentIndex = boxes.findIndex(b => b.id === currentId);

        if (currentIndex !== -1) {
            if (isReverse) {
                if (currentIndex > 0) this.activate(boxes[currentIndex - 1].id);
                else this.hideNumberPad();
            } else {
                if (currentIndex < boxes.length - 1) this.activate(boxes[currentIndex + 1].id);
                else this.hideNumberPad();
            }
        }
    },

    isRowFull() {
        const rowId = this.subStep === 'MULTIPLY_P' ? `row-p-${this.stage}` : `row-r-${this.stage}`; 
        const row = getEl(rowId); 
        if(!row) return false;
        const visibleBoxes = Array.from(row.querySelectorAll('.box:not(.invisible-box)')); 
        if(visibleBoxes.length === 0) return true; 
        return visibleBoxes.every(b => b.innerText.trim() !== '');
    },

    updateCheckBtn() {
        const btn = getEl('btn-check'); 
        if (this.subStep === 'FINISH') { 
            btn.innerText = '🏁 پایان'; 
            btn.className = 'btn btn-finish'; 
            btn.disabled = false; 
            btn.setAttribute('onclick', 'game.checkCurrentStep()');
            if (app.state.isTutorial) {
                const tutBtn = getEl('btn-next-tutorial');
                if (tutBtn) {
                    tutBtn.innerText = '🏁 پایان';
                    tutBtn.className = 'btn btn-finish';
                }
            }
        } else if (this.isFailedStep) {
            btn.innerText = '❌ پاک‌کردن و تلاش دوباره'; 
            btn.className = 'btn btn-danger-reset'; 
            btn.disabled = false;
            btn.setAttribute('onclick', 'game.resetFailedStep()');
        } else {
            btn.innerText = '✅ بررسی'; 
            btn.className = 'btn btn-success';
            btn.setAttribute('onclick', 'game.checkCurrentStep()');
            
            const full = this.isRowFull(); 
            if ((this.subStep === 'MULTIPLY_P' || this.subStep === 'SUBTRACT') && full) { 
                btn.disabled = false; 
                this.msg('حالا دکمه‌ی بررسی رو بزن.'); 
            } else { 
                btn.disabled = true; 
            }
        }
    },

    checkCurrentStep() {
        if (this.subStep === 'FINISH') return app.finishGame(true);
        const q = this.mathSteps[this.stage].q; 
        const prod = q * this.divisor; 
        let upperVal = this.getCurrentTotal(); 
        const rem = upperVal - prod;
        
        if (this.subStep === 'MULTIPLY_P') {
            const total = this.getCurrentTotal();
            let correctQ = Math.floor(total / this.divisor);
            if (correctQ > 9) correctQ = 9;
            const correctProd = correctQ * this.divisor;

            const qBox = getEl(`q-${this.stage}`);
            const pRow = getEl(`row-p-${this.stage}`);
            const visibleBoxes = Array.from(pRow.querySelectorAll('.box:not(.invisible-box)'));
            let userNumStr = visibleBoxes.map(b => toEnglish(b.innerText)).join('');
            let userNum = parseInt(userNumStr);

            const userQ = this.mathSteps[this.stage].q;

            if (userQ === correctQ && userNum === correctProd) {
                 GameAudio.playSFX('correct');
                 qBox.classList.add('correct', 'readonly');
                 qBox.classList.remove('wrong');
                 visibleBoxes.forEach(b => { b.classList.add('correct', 'readonly'); b.classList.remove('wrong', 'active-input'); });
                 getEl('btn-check').disabled = true; 
                 this.subStep = 'SUBTRACT'; 
                 
                 this.createRemainderRow(this.stage);
                 
                 if(!app.state.isTutorial) {
                     this.msg('آفرین. تفریق کن (از راست).'); 
                     let rRow = getEl(`row-r-${this.stage}`);
                     const rBoxes = Array.from(rRow.querySelectorAll('.box:not(.invisible-box)'));
                     if(rBoxes.length > 0) this.activate(rBoxes[rBoxes.length - 1].id);
                 }
                 this.isFailedStep = false;
            } else {
                 GameAudio.playSFX('wrong');
                 if (userQ === correctQ) {
                     qBox.classList.add('correct');
                     qBox.classList.remove('wrong');
                 } else {
                     qBox.classList.add('wrong');
                     qBox.classList.remove('correct');
                 }

                 const expectedProd = userQ * this.divisor;
                 const sExpectedProd = String(expectedProd).padStart(visibleBoxes.length, '0');
                 visibleBoxes.forEach((b, i) => {
                     const userDigit = toEnglish(b.innerText);
                     const expectedDigit = sExpectedProd[i];
                     if (userDigit === expectedDigit) {
                         b.classList.add('correct');
                         b.classList.remove('wrong');
                     } else {
                         b.classList.add('wrong');
                         b.classList.remove('correct');
                     }
                 });

                 this.isFailedStep = true;
                 this.msg('پاسخ اشتباهه. دکمه‌ی پاک‌کردن رو بزن و دوباره تلاش کن.', true);
            }
            
        } else if (this.subStep === 'SUBTRACT') {
            const rRow = getEl(`row-r-${this.stage}`);
            const visibleBoxes = Array.from(rRow.querySelectorAll('.box:not(.invisible-box)')); 
            let userNumStr = visibleBoxes.map(b => toEnglish(b.innerText)).join('');
            let userNum = parseInt(userNumStr);

            if (userNum === rem) {
                GameAudio.playSFX('correct');
                visibleBoxes.forEach(b => { b.classList.add('correct', 'readonly'); b.classList.remove('wrong', 'active-input'); });
                getEl('btn-check').disabled = true;
                const pRow = getEl(`row-p-${this.stage}`); 
                if(pRow) pRow.classList.add('dimmed');
                this.currentRem = rem; 
                this.stage++; 
                this.subStep = 'SELECT'; 
                getEl('bracket').style.display = 'none'; 
                if (this.stage > 3) { 
                    this.subStep = 'FINISH'; 
                    this.msg('تموم شد! دکمه‌ی پایان رو بزن.');
                    if (app.state.isTutorial) {
                        const tutBtn = getEl('btn-next-tutorial');
                        if (tutBtn) {
                            tutBtn.innerText = '🏁 پایان';
                            tutBtn.className = 'btn btn-finish';
                        }
                    }
                } 
                else { 
                    if (!app.state.isTutorial) {
                        this.msg(`رقم بعدی (${CONFIG.pvLabels[this.stage]}) رو انتخاب کن.`);
                    }
                    this.updateSelectHighlight(); 
                }
                this.isFailedStep = false;
            } else { 
                GameAudio.playSFX('wrong');
                const sCorrectRem = String(rem).padStart(visibleBoxes.length, '0');
                visibleBoxes.forEach((b, i) => {
                    const userDigit = toEnglish(b.innerText);
                    const correctDigit = sCorrectRem[i];
                    if (userDigit === correctDigit) {
                        b.classList.add('correct');
                        b.classList.remove('wrong');
                    } else {
                        b.classList.add('wrong');
                        b.classList.remove('correct');
                    }
                });
                this.isFailedStep = true;
                this.msg('تفریق اشتباهه. دکمه‌ی پاک‌کردن رو بزن و دوباره تلاش کن.', true); 
            }
        }
        this.updateCheckBtn();
        this.saveState();
    },

    msg(txt, err = false) { 
        const el = getEl('game-message'); 
        el.innerText = txt; 
        el.style.borderColor = err ? '#dc3545' : '#f0ad4e'; 
        el.style.color = err ? '#721c24' : '#8a6d3b'; 
        el.style.background = err ? '#f8d7da' : '#fdf6e3'; 
    },

    showBracket(idx) {
        if (this.subStep === 'FINISH') {
            const b = getEl('bracket');
            if (b) b.style.display = 'none';
            return;
        }

        let startEl = null; 
        let endEl = null; 
        const prevRemIdx = this.getLastActiveRowIdx(idx);
        
        if (prevRemIdx === -1) { 
            let start = idx; 
            for(let i = idx-1; i>=0; i--) { 
                if (this.mathSteps[i].q === 0) start = i; 
                else break; 
            } 
            startEl = getEl(`div-${start}`); 
            endEl = getEl(`div-${idx}`); 
        } 
        else {
            const rRow = getEl(`row-r-${prevRemIdx}`);
            if(rRow) {
                const visibleBoxes = Array.from(rRow.querySelectorAll('.box:not(.invisible-box)')).filter(b => b.innerText.trim() !== '');
                if(visibleBoxes.length > 0) {
                    let startIndex = 0;
                    while(startIndex < visibleBoxes.length - 1) {
                        const val = toEnglish(visibleBoxes[startIndex].innerText);
                        if(val === '0' || val === '۰') { startIndex++; } else { break; }
                    }
                    startEl = visibleBoxes[startIndex];
                    endEl = visibleBoxes[visibleBoxes.length - 1];
                }
            }
        }
        
        const b = getEl('bracket'); 
        const panel = getEl('left-panel');
        if (!startEl || !endEl || !b || !panel) return;
        
        const pRect = panel.getBoundingClientRect(); 
        const d1Rect = startEl.getBoundingClientRect(); 
        const d2Rect = endEl.getBoundingClientRect();
        const left = d1Rect.left - pRect.left + panel.scrollLeft; 
        const width = (d2Rect.left - d1Rect.left) + d2Rect.width;
        
        b.style.display = 'block'; 
        b.style.left = `${left}px`; 
        b.style.width = `${width}px`; 
        const topOffset = d1Rect.top - pRect.top + panel.scrollTop; 
        b.style.top = `${topOffset - 5}px`; 
        
        b.className = `bracket-container ${CONFIG.pvClasses[idx]}`;
        b.style.borderColor = 'var(--pv-color)';
        let lbl = b.querySelector('.bracket-label'); 
        if(!lbl) { 
            lbl = document.createElement('span'); 
            lbl.className = 'bracket-label'; 
            b.appendChild(lbl); 
        } 
        lbl.innerText = CONFIG.pvLabels[idx];
    },
    
    requestHelp() {
        getEl('modal-confirm').classList.remove('hidden');
    },

    initTutorial(skipReset = false) {
        getEl('modal-confirm').classList.add('hidden');
        app.state.isTutorial = true;
        if(!skipReset) {
            this.stage = 0; 
            this.subStep = 'SELECT'; 
            this.currentRem = 0; 
            this.helpUsed = true;
            this.mathSteps = Array(4).fill(null).map(() => ({ q: null, p: Array(4).fill(''), r: Array(4).fill('') })); 
            this.lastRemRowIndex = -1;
            this.clearState();
        }
        app.save();
        this.saveState(); 
        this.renderUI();
        this.setTutorialUI();
        
        this.msg('حالت آموزشی: اولین رقم از چپ رو انتخاب می‌کنیم.');
        setTutorialBtnState(true);
        GameAudio.speakSelectInitial(() => setTutorialBtnState(false));
    },

    stepTutorial() {
        if (this.subStep === 'SELECT') {
            if (this.stage === 0) {
                this.clkDividend(0);
                const total = this.getCurrentTotal();
                let correctQ = Math.floor(total / this.divisor);
                if (correctQ > 9) correctQ = 9;

                if (correctQ === 0) {
                    this.msg('چون نمی‌شه، در خارج‌قسمت یک ۰ می‌ذاریم.');
                    this.inputDigit({targetId: `q-${this.stage}`, val: 0});
                    setTutorialBtnState(true);
                    GameAudio.speakZeroQuotient(() => setTutorialBtnState(false));
                } else {
                    this.msg(`${toPersian(total)} تقسیم بر ${toPersian(this.divisor)} می‌شه ${toPersian(correctQ)}`);
                    this.inputDigit({targetId: `q-${this.stage}`, val: correctQ});
                    setTutorialBtnState(true);
                    GameAudio.speakQuotient(total, this.divisor, correctQ, () => setTutorialBtnState(false));
                }
                return;
            } else {
                const isTopRowOnly = (this.getLastActiveRowIdx(this.stage) === -1);
                if (isTopRowOnly) {
                    this.msg(`رقم بعدی (${CONFIG.pvLabels[this.stage]}) رو هم انتخاب می‌کنیم.`);
                    this.clkDividend(this.stage);
                    setTutorialBtnState(true);
                    GameAudio.speakSelectNext(() => setTutorialBtnState(false));
                } else {
                    this.msg(`حالا رقم بعدی (${CONFIG.pvLabels[this.stage]}) رو می‌آوریم پایین.`);
                    this.clkDividend(this.stage);
                    setTutorialBtnState(true);
                    GameAudio.speakBringDown(() => setTutorialBtnState(false));
                }
            }
            return;
        }

        if (this.subStep === 'QUOTIENT') {
            const total = this.getCurrentTotal();
            let correctQ = Math.floor(total / this.divisor);
            if (correctQ > 9) correctQ = 9;

            if (correctQ === 0) {
                this.msg('چون نمی‌شه، در خارج‌قسمت یک ۰ می‌ذاریم.');
                this.inputDigit({targetId: `q-${this.stage}`, val: 0});
                setTutorialBtnState(true);
                GameAudio.speakZeroQuotient(() => setTutorialBtnState(false));
            } else {
                this.msg(`${toPersian(total)} تقسیم بر ${toPersian(this.divisor)} می‌شه ${toPersian(correctQ)}`);
                this.inputDigit({targetId: `q-${this.stage}`, val: correctQ});
                setTutorialBtnState(true);
                GameAudio.speakQuotient(total, this.divisor, correctQ, () => setTutorialBtnState(false));
            }
            return;
        }

        if (this.subStep === 'MULTIPLY_P') {
            const pRow = getEl(`row-p-${this.stage}`);
            const boxes = Array.from(pRow.querySelectorAll('.box:not(.invisible-box)'));
            const q = this.mathSteps[this.stage].q;
            const prod = q * this.divisor;
            const sProd = String(prod);
            
            boxes.forEach((box, idx) => {
                this.inputDigit({targetId: box.id, val: parseInt(sProd[idx])});
            });
            this.msg(`حالا ${toPersian(q)} ضربدر ${toPersian(this.divisor)} می‌شه ${toPersian(prod)}`);
            
            TutorialVisuals.showMultiplyVisuals(this.stage);
            setTutorialBtnState(true);
            GameAudio.speakMultiply(q, this.divisor, prod, () => {
                TutorialVisuals.clear();
                setTutorialBtnState(false);
                this.checkCurrentStep();
            });
            return;
        }

        if (this.subStep === 'SUBTRACT') {
            const rRow = getEl(`row-r-${this.stage}`);
            const boxes = Array.from(rRow.querySelectorAll('.box:not(.invisible-box)')); 
            
            const q = this.mathSteps[this.stage].q; 
            const prod = q * this.divisor;
            let upperVal = this.getCurrentTotal(); 
            const rem = upperVal - prod;
            const sRem = String(rem).padStart(boxes.length, '0');
            
            let currentBox = boxes[boxes.length - 1]; 
            const parts = currentBox.id.split('-');
            const colIdx = parseInt(parts[2]);
            
            const topEl = this.getTopCellForColumn(colIdx);
            const botEl = getEl(`p-${this.stage}-${colIdx}`);
            
            if(topEl && botEl) {
                let topVal = parseInt(toEnglish(topEl.innerText));
                if (topEl.classList.contains('borrow-dest')) { 
                     const destAttr = topEl.getAttribute('data-val-dest'); 
                     if(destAttr) topVal = parseInt(toEnglish(destAttr)); 
                     else topVal += 10; 
                }
                if(topEl.classList.contains('borrow-src')) {
                    const srcAttr = topEl.getAttribute('data-val-sub');
                    if(srcAttr) topVal = parseInt(toEnglish(srcAttr));
                }
                
                const botVal = parseInt(toEnglish(botEl.innerText)) || 0;
                
                if (topVal < botVal) {
                    const srcCol = colIdx - 1;
                    const srcEl = this.getTopCellForColumn(srcCol);
                    if (srcEl && !srcEl.classList.contains('borrow-src')) {
                        this.handleBorrowClick(srcEl.id);
                        this.msg('چون نمی‌شه کم کرد، از رقم کناری قرض می‌گیریم.');
                        setTutorialBtnState(true);
                        GameAudio.speakBorrow(() => setTutorialBtnState(false));
                        return; 
                    }
                }
            }

            boxes.forEach((b, idx) => {
                this.inputDigit({targetId: b.id, val: parseInt(sRem[idx])});
            });
            this.msg('حالا تفریق رو انجام می‌دیم.');
            setTutorialBtnState(true);
            GameAudio.speakSubtract(() => {
                setTutorialBtnState(false);
                this.checkCurrentStep();
            });
            return;
        }
        
        if (this.subStep === 'FINISH') {
            GameAudio.stop();
            TutorialVisuals.clear();
            setTutorialBtnState(false);
            app.finishGame(true);
        }
    }
};

function setBoxVal(id, val, lock) { 
    const el = getEl(id); 
    if(!el) return; 
    el.innerText = toPersian(val); 
    el.classList.add('has-val'); 
    if(lock) el.classList.add('correct', 'readonly'); 
}

function checkSavedUnfinishedState() {
    try {
        const saved = localStorage.getItem(GAME_STATE_STORAGE);
        if (saved) {
            const d = JSON.parse(saved);
            if (d && d.div) return d;
        }
    } catch (e) {}
    return null;
}

window.submitAssistantStar = async function() {
    app.showScreen('portal-submitting-screen');
    await Portal.submitProgress(null, {
        onSuccess: (data) => { authenticatePortalStudent(); },
        onFailure: (err) => {}
    });
};

window.retryAuthentication = function() {
    authenticatePortalStudent();
};

async function authenticatePortalStudent() {
    await Portal.authenticate({
        onSuccess: (data) => {
            try {
                document.getElementById('portal-welcome-section').style.display = '';
                document.getElementById('startGame').style.display = '';
                document.getElementById('portal-error-section').style.display = 'none';

                STORAGE = `studentProfile_Taqsim4x1_${Portal.studentId}_${Portal.homeworkId}`;
                GAME_STATE_STORAGE = `gameState_Taqsim4x1_${Portal.studentId}_${Portal.homeworkId}`;
                
                const saved = localStorage.getItem(STORAGE);
                let parsedState = null;
                if (saved) {
                    try {
                        parsedState = JSON.parse(saved);
                    } catch (e) {}
                }

                if (parsedState && typeof parsedState === 'object') {
                    app.state = parsedState;
                } else {
                    app.state = {
                        user: data.name,
                        stats: { games: data.plays, stars: data.stars },
                        lastHelp: false,
                        isTutorial: false,
                        reportShown: false
                    };
                }
                
                app.state.user = data.name || Portal.studentName || app.state.user || "دانش‌آموز";
                if (!app.state.stats) {
                    app.state.stats = { games: 0, stars: 0 };
                }
                app.state.stats.games = data.plays !== undefined ? data.plays : app.state.stats.games;
                app.state.stats.stars = data.stars !== undefined ? data.stars : app.state.stats.stars;
                
                app.save();
                app.updateStats();

                document.getElementById('portal-student-name').textContent = app.state.user;
                document.getElementById('portal-prev-plays').textContent = toPersian(app.state.stats.games);
                document.getElementById('portal-prev-stars').textContent = toPersian(app.state.stats.stars) + ' ⭐';
                document.getElementById('portal-req-stars').textContent = toPersian(Portal.requiredStars) + ' ⭐';

                const activeState = checkSavedUnfinishedState();
                const startBtn = document.getElementById('startGame');
                if (activeState) {
                    if (activeState.tut || app.state.isTutorial) {
                        startBtn.textContent = 'ادامه‌ی آموزش (باقی‌مونده) 🔄';
                        startBtn.style.backgroundColor = '#e67e22';
                    } else {
                        startBtn.textContent = 'ادامه‌ی بازی (باقی‌مونده) 🔄';
                        startBtn.style.backgroundColor = '#ff9800';
                    }
                } else {
                    startBtn.textContent = 'شروع بازیِ تکلیف 🎮';
                    startBtn.style.backgroundColor = '#2ecc71';
                }

                const needsSubmitKey = `portal_needs_submit_${Portal.gameId}_${Portal.studentId}_${Portal.homeworkId}`;
                const hasUnsentStar = localStorage.getItem(needsSubmitKey) === 'true';

                if (hasUnsentStar) {
                    document.getElementById('ast-welcome').textContent = `سلام ${app.state.user} عزیز! 🌟`;
                    document.getElementById('ast-name').textContent = app.state.user;
                    document.getElementById('ast-stars').textContent = toPersian(app.state.stats.stars) + ' ⭐';
                    document.getElementById('ast-req-stars').textContent = toPersian(Portal.requiredStars) + ' ⭐';
                    app.showScreen('screen-assistant');
                } else if (app.state.reportShown) {
                    app.showScreen('screen-report');
                } else if (game.dividend && activeState) {
                    try {
                        app.showScreen('screen-game');
                        game.loadState();
                    } catch (ex) {
                        game.clearState();
                        game.dividend = 0;
                        app.state.reportShown = false;
                        app.save();
                        app.showScreen('screen-register');
                    }
                } else {
                    app.showScreen('screen-register');
                }
            } catch (errGlobal) {
                app.showScreen('screen-register');
                document.getElementById('portal-welcome-section').style.display = 'none';
                document.getElementById('startGame').style.display = 'none';
                document.getElementById('portal-error-section').style.display = 'block';
            }
        },
        onFailure: (err) => {
            app.showScreen('screen-register');
            document.getElementById('portal-welcome-section').style.display = 'none';
            document.getElementById('startGame').style.display = 'none';
            document.getElementById('portal-error-section').style.display = 'block';
            const regScreen = document.getElementById('screen-register');
            if (regScreen) regScreen.classList.remove('hidden');
        },
        onGuestMode: () => {
            app.showScreen('screen-register');
            document.getElementById('portal-welcome-section').style.display = 'none';
            document.getElementById('startGame').style.display = 'none';
            document.getElementById('portal-error-title').textContent = 'لینک ورود درست نیست!';
            document.getElementById('portal-error-desc').textContent = 'برای انجام این تکلیف، باید حتماً از داخل پرتال مدرسه‌ی خودت و با لینک اختصاصی‌ات وارد بشی.';
            document.getElementById('portal-retry-auth-btn').style.display = 'none';
            document.getElementById('portal-error-section').style.display = 'block';
            const regScreen = document.getElementById('screen-register');
            if (regScreen) regScreen.classList.remove('hidden');
        }
    });
}

document.getElementById('startGame').onclick = () => {
    try {
        GameAudio.stop();
        TutorialVisuals.clear();
        setTutorialBtnState(false);
        app.state.reportShown = false;
        const activeState = checkSavedUnfinishedState();
        if (activeState) {
            game.loadState();
        } else {
            app.state.isTutorial = false;
            game.helpUsed = false;
            game.start();
        }
        app.showScreen('screen-game');
        app.updateStats();
        app.save();
    } catch (e) {
        game.clearState();
        game.dividend = 0;
        app.state.isTutorial = false;
        game.helpUsed = false;
        app.state.reportShown = false;
        app.save();
        game.start();
        app.showScreen('screen-game');
        app.updateStats();
        app.save();
    }
};

window.onload = () => {
    const isMuted = GameAudio.isMuted;
    const btn = getEl('btn-sound-toggle');
    if (btn) btn.innerText = isMuted ? '🔇 صدا: خاموش' : '🔊 صدا: روشن';

    app.init();
    
    window.addEventListener('resize', () => {
        if (app.state && document.getElementById('screen-game') && !document.getElementById('screen-game').classList.contains('hidden')) {
            if (game.subStep !== 'SELECT' && game.stage < 4) {
                game.showBracket(game.stage);
            }
        }
    });

    window.addEventListener('beforeunload', () => {
        if (app.state && app.state.user) app.save();
    });

    if ('serviceWorker' in navigator) {
        const hadExistingController = !!navigator.serviceWorker.controller;
        navigator.serviceWorker.register('sw.js');
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!refreshing && hadExistingController) {
                window.location.reload();
                refreshing = true;
            }
        });
    }
};