// The Battle stage — gentle, turn-based, ALWAYS a win. Alex picks his Pokémon and
// faces a wild one; each correct answer lands a bouncy hit until the wild one
// happily faints. His Pokémon has no HP and no enemy attack — it can never lose
// or be hurt. A wrong answer just re-prompts (errorless), the wild gives a
// harmless wiggle, and the encounter still ends in a win + a bond reward.

import { el, clear, spriteImg, icon } from '../ui.js';
import * as audio from '../audio.js';
import { clip, PRAISE_COUNT, rnd } from '../voices.js';
import { sfx } from '../sfx.js';
import { isTeen, pokemonById, ZONES, sameSound } from '../data.js';
import { tenFrame } from '../tenframe.js';
import { getPokedex, addBond } from '../game.js';
import { canEvolve, triggerEvolution } from '../evolve.js';
import { sparkleBurst, confetti, centerOf } from '../fx.js';
import * as mastery from '../mastery.js';
import * as battle from '../battle.js';

const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export function renderBattle(_params, ctx) {
  const root = el('div', { class: 'scene battle', style: { backgroundImage: "url('assets/screens/bg-lab.png')" } });
  const back = el('button', { class: 'btn btn--back', type: 'button', 'aria-label': 'Back home',
    onClick: () => { audio.play(sfx.pop()); ctx.go('home'); } }, icon('back')); // always a safe exit; deferred work is epoch-guarded
  const stage = el('div', { class: 'battle__stage' });
  const tray = el('div', { class: 'battle__tray' });
  root.append(back, stage, tray);

  let buddyId = null;
  let wild = null;
  let wildHp = 0;
  let busy = false;
  let token = 0;
  let plan = [];
  let turn = 0;
  let lastTarget = null;
  let idleTimer = null;
  let wildEl = null, buddyEl = null, hpFill = null;
  const bump = () => { token += 1; clearTimeout(idleTimer); return token; };

  function scheduleIdle(speak, myToken) {
    clearTimeout(idleTimer);
    idleTimer = ctx.after(7000, () => { if (myToken === token && !busy) { speak(); scheduleIdle(speak, myToken); } });
  }
  function wrongTap(btn, speak, myToken) {
    audio.play(sfx.soft());
    if (btn) { btn.classList.add('is-wrong', 'is-dimmed'); btn.addEventListener('animationend', () => btn.classList.remove('is-wrong'), { once: true }); }
    if (wildEl) { wildEl.classList.add('is-wiggle'); ctx.after(500, () => wildEl && wildEl.classList.remove('is-wiggle')); }
    ctx.after(550, () => { if (myToken === token) speak(); });
    scheduleIdle(speak, myToken);
  }

  // ---------- Buddy picker ----------
  function showBuddyPicker() {
    bump();
    buddyId = null;
    root.style.backgroundImage = "url('assets/screens/bg-lab.png')";
    clear(stage); clear(tray);
    tray.append(el('h1', { class: 'battle__title' }, 'Who will battle?'));
    const grid = el('div', { class: 'train__buddies' });
    Object.keys(getPokedex()).map(Number).forEach((id) => {
      const p = pokemonById(id);
      if (!p) return;
      const cell = el('button', { class: 'buddy-cell', type: 'button', 'aria-label': p.name,
        onClick: () => { audio.play(sfx.pop()); buddyId = id; startBattle(); } });
      cell.append(spriteImg(p), el('span', { class: 'buddy-cell__name' }, p.name));
      grid.append(cell);
    });
    tray.append(grid);
  }

  // ---------- Stage ----------
  function startBattle() {
    bump();
    clear(tray);            // remove the buddy picker immediately so it can't be re-tapped
    wild = battle.pickWild();
    const zone = ZONES.find((z) => wild.zones.includes(z.id)) || ZONES[0];
    root.style.backgroundImage = `url('${zone.background}')`;
    wildHp = battle.WILD_MAX_HP;
    plan = battle.battlePlan();
    turn = 0;
    lastTarget = null;
    renderStage();
    const myToken = token;
    ctx.after(500, () => { if (myToken === token) audio.playSequence([clip.battleStart(), clip.name(wild.id)]); }); // audio-first: announce the wild
    ctx.after(1700, () => { if (myToken === token) nextTurn(); });
  }

  function renderStage() {
    clear(stage);
    const wildWrap = el('div', { class: 'combatant combatant--wild' });
    const hp = el('div', { class: 'hpbar' }, (hpFill = el('div', { class: 'hpbar__fill' })));
    wildEl = spriteImg(wild); wildEl.classList.add('combatant__sprite');
    wildWrap.append(hp, el('div', { class: 'combatant__name' }, wild.name), wildEl);
    const buddyWrap = el('div', { class: 'combatant combatant--buddy' });
    buddyEl = spriteImg(pokemonById(buddyId)); buddyEl.classList.add('combatant__sprite');
    buddyWrap.append(buddyEl);
    stage.append(wildWrap, buddyWrap);
    updateHp();
  }
  function updateHp() { if (hpFill) hpFill.style.width = `${Math.max(0, (wildHp / battle.WILD_MAX_HP) * 100)}%`; }

  function nextTurn() {
    if (turn >= plan.length || wildHp <= 0) { win(); return; }
    busy = false;
    const myToken = bump();
    const type = plan[turn];
    if (type === 'compare') { const q = battle.makeCompare(lastTarget); lastTarget = q.a; renderCompare(q, myToken); }
    else if (type === 'match') { const q = battle.makeMatch(lastTarget); lastTarget = q.kind === 'number' ? q.target : lastTarget; renderMatch(q, myToken); }
    else renderBlend(battle.makeBlend(), myToken);
  }

  // The hit — his Pokémon attacks, the wild one's energy eases down. Always safe.
  function onHit(q, firstTry, charged) {
    if (busy) return;
    busy = true;
    clearTimeout(idleTimer);
    battle.recordQuestion(q, firstTry);
    audio.play(sfx.whoosh());
    buddyEl.classList.add('is-attacking');
    ctx.after(260, () => {
      buddyEl.classList.remove('is-attacking');
      if (!ctx.alive()) return;
      const c = centerOf(wildEl, root);
      sparkleBurst(root, c.x, c.y, charged ? 28 : 16);
      audio.play(sfx.catch());
      wildEl.classList.add('is-hit');
      ctx.after(380, () => wildEl && wildEl.classList.remove('is-hit'));
      wildHp -= charged ? 2 : 1;
      updateHp();
      audio.play(clip.praise(rnd(PRAISE_COUNT)));
      turn += 1;
      ctx.after(950, () => { if (ctx.alive()) (wildHp <= 0 ? win() : nextTurn()); });
    });
  }

  // ---------- Question: comparison ----------
  function renderCompare(q, myToken) {
    clear(tray);
    tray.append(el('div', { class: 'q-prompt' }, q.bigger ? 'Tap the BIGGER one!' : 'Tap the smaller one!'));
    const row = el('div', { class: 'compare-row' });
    const showFrames = isTeen(q.a) || isTeen(q.b); // symmetric scaffold so it's a quantity comparison
    [q.a, q.b].forEach((n) => {
      const opt = el('div', { class: 'compare-opt' });
      if (showFrames) opt.append(tenFrame(n));
      const btn = el('button', { class: 'numbtn', type: 'button', 'aria-label': `${n}`, onClick: () => onPick(n, btn) }, String(n));
      opt.append(btn);
      row.append(opt);
    });
    tray.append(row);
    let firstTry = true;
    const speak = () => audio.playSequence([q.bigger ? clip.hitBigger() : clip.hitSmaller(), clip.number(q.a), clip.number(q.b)]);
    function onPick(n, btn) {
      if (busy) return;
      if (n === q.answer) onHit(q, firstTry, false);
      else { firstTry = false; wrongTap(btn, speak, myToken); }
    }
    ctx.after(350, () => { if (myToken === token) speak(); });
    scheduleIdle(speak, myToken);
  }

  // ---------- Question: find-the-match ----------
  function renderMatch(q, myToken) {
    clear(tray);
    tray.append(el('div', { class: 'q-prompt' }, q.kind === 'letter' ? 'Your move — tap the sound!' : 'Tap your move!'));
    if (q.kind === 'number' && isTeen(q.target)) tray.append(tenFrame(q.target));
    const row = el('div', { class: 'catch__choices' });
    q.choices.forEach((v) => {
      const btn = el('button', { class: 'numbtn' + (q.kind === 'letter' ? ' lettertile' : ''), type: 'button', 'aria-label': `${v}`,
        onClick: () => onPick(v, btn) }, q.kind === 'letter' ? v : String(v));
      row.append(btn);
    });
    tray.append(row);
    let firstTry = true;
    const speak = () => (q.kind === 'letter'
      ? audio.playSequence([clip.whichSays(), clip.phoneme(q.target)])
      : audio.playSequence([clip.yourMove(), clip.number(q.target)]));
    function onPick(v, btn) {
      if (busy) return;
      if (v === q.target) onHit(q, firstTry, false);
      else {
        firstTry = false;
        wrongTap(btn, speak, myToken);
        // progressively dim a wrong option toward the answer
        const live = [...row.children].filter((b) => !b.classList.contains('is-dimmed') && b.textContent !== String(q.target) && b !== btn);
        if (live.length) live[Math.floor(Math.random() * live.length)].classList.add('is-dimmed');
      }
    }
    ctx.after(350, () => { if (myToken === token) speak(); });
    scheduleIdle(speak, myToken);
  }

  // ---------- Question: blend-to-charge ----------
  function renderBlend(q, myToken) {
    clear(tray);
    const letters = [...q.word];
    tray.append(el('div', { class: 'q-prompt' }, 'Charge it up — tap the sounds!'));
    const chargeFill = el('div', { class: 'chargebar__fill', style: { width: '0%' } });
    tray.append(el('div', { class: 'chargebar' }, chargeFill));
    const slotRow = el('div', { class: 'word-slots' });
    const slots = letters.map((ch) => el('div', { class: 'word-slot', dataset: { want: ch } }));
    slots.forEach((s) => slotRow.append(s));
    const distract = shuffle(mastery.unlockedLetters().filter((c) => !letters.includes(c) && !letters.some((l) => sameSound(l, c)))).slice(0, 2);
    let tiles = shuffle([...letters, ...distract]);
    const tileRow = el('div', { class: 'tile-row' });
    let nextIndex = 0, firstTry = true, locked = false;

    const speakNext = () => { if (nextIndex < slots.length) audio.play(clip.phoneme(slots[nextIndex].dataset.want)); };
    function activateSlot() {
      slots.forEach((s, i) => s.classList.toggle('is-active', i === nextIndex));
      if (nextIndex < slots.length) { const want = slots[nextIndex].dataset.want; ctx.after(300, () => { if (myToken === token) audio.play(clip.phoneme(want)); }); scheduleIdle(speakNext, myToken); }
    }
    function renderTiles() {
      clear(tileRow);
      tiles.forEach((ch, idx) => {
        if (ch === null) { tileRow.append(el('div', { class: 'tile tile--used', 'aria-hidden': 'true' })); return; }
        tileRow.append(el('button', { class: 'tile', type: 'button', 'aria-label': ch, onClick: (e) => onTile(ch, idx, e.currentTarget) }, ch));
      });
    }
    function onTile(ch, idx, tile) {
      if (locked || busy) return;
      clearTimeout(idleTimer);
      const want = slots[nextIndex].dataset.want;
      if (ch === want) {
        audio.play(sfx.pop());
        slots[nextIndex].textContent = ch; slots[nextIndex].classList.add('is-filled');
        audio.play(clip.phoneme(ch));
        tiles[idx] = null; renderTiles();
        nextIndex += 1;
        chargeFill.style.width = `${(nextIndex / slots.length) * 100}%`;
        if (nextIndex === slots.length) { locked = true; finishBlend(); }
        else activateSlot();
      } else {
        firstTry = false;
        audio.play(sfx.soft());
        tile.classList.add('is-wrong');
        tile.addEventListener('animationend', () => tile.classList.remove('is-wrong'), { once: true });
        ctx.after(450, () => { if (!locked && myToken === token) audio.play(clip.phoneme(want)); });
        scheduleIdle(speakNext, myToken);
      }
    }
    async function finishBlend() {
      clearTimeout(idleTimer);
      slots.forEach((s) => s.classList.remove('is-active'));
      await audio.playSequence(letters.map((ch) => clip.phoneme(ch)), 0.14);
      if (!ctx.alive() || myToken !== token) return;
      await audio.play(clip.word(q.word));
      if (!ctx.alive() || myToken !== token) return;
      onHit(q, firstTry, true); // charged hit
    }

    renderTiles();
    tray.append(slotRow, tileRow);
    ctx.after(400, () => { if (myToken === token) { audio.play(clip.chargeUp()); ctx.after(900, activateSlot); } });
  }

  // ---------- Win (always) ----------
  function win() {
    busy = true;
    clearTimeout(idleTimer);
    clear(tray);
    if (wildEl) wildEl.classList.add('is-fainted');
    audio.play(clip.fainted());
    const c = wildEl ? centerOf(wildEl, root) : { x: 0, y: 0 };
    sparkleBurst(root, c.x, c.y - 20, 10); // sleepy stars
    ctx.after(900, () => {
      if (!ctx.alive()) return;
      confetti(root);
      addBond(buddyId, battle.BATTLE_BOND);
      audio.play(clip.youWin());
      if (canEvolve(buddyId)) {
        triggerEvolution(root, ctx, buddyId, (evolvedId) => { buddyId = evolvedId; showWinCard(true); });
      } else {
        showWinCard(false);
      }
    });
  }

  function showWinCard(didEvolve) {
    const p = pokemonById(buddyId);
    const overlay = el('div', { class: 'win' });
    const sprite = spriteImg(p); sprite.classList.add('win__sprite');
    overlay.append(el('div', { class: 'win__card' },
      el('div', { class: 'win__badge' }, 'You win!'),
      sprite,
      didEvolve ? null : el('div', { class: 'win__bond' }, icon('bond'), ` +${battle.BATTLE_BOND} bond`),
      el('div', { class: 'win__actions' },
        el('button', { class: 'btn btn--big', type: 'button', onClick: () => { audio.play(sfx.pop()); overlay.remove(); startBattle(); } }, 'Play again!'),
        el('button', { class: 'btn btn--ghost', type: 'button', onClick: () => { audio.play(sfx.pop()); ctx.go('home'); } }, 'Home'),
      ),
    ));
    root.append(overlay);
  }

  showBuddyPicker();
  return root;
}
