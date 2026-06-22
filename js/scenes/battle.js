// The Battle stage — gentle, turn-based, ALWAYS a win. Alex picks his Pokémon and
// faces a wild one; each correct answer lands a bouncy hit until the wild one
// happily faints. His Pokémon has no HP and no enemy attack — it can never lose
// or be hurt. A wrong answer just re-prompts (errorless), the wild gives a
// harmless wiggle, and the encounter still ends in a win + a bond reward.

import { el, clear, spriteImg, icon } from '../ui.js';
import * as audio from '../audio.js';
import { clip, PRAISE_COUNT, rnd } from '../voices.js';
import { sfx } from '../sfx.js';
import { isTeen, pokemonById, ZONES, sameSound, graphemes } from '../data.js';
import { tenFrame } from '../tenframe.js';
import { getPokedex, addBond, getStarterId, getLossStreak, recordBattleLoss, clearBattleLosses } from '../game.js';
import { earn, tokenCta as ctaForArc } from '../story.js';
import { canEvolve, triggerEvolution } from '../evolve.js';
import { sparkleBurst, confetti, centerOf, driftSparkles } from '../fx.js';
import { typeBadge } from '../typeicon.js';
import * as mastery from '../mastery.js';
import * as battle from '../battle.js';
import * as music from '../music.js';
import { gateAnswers, replayButton } from '../attention.js';

const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export function renderBattle({ story, zone, arc, quest, tier, foeType, team }, ctx) {
  const root = el('div', { class: 'scene battle', style: { backgroundImage: "url('assets/screens/bg-lab.png')" } });
  const storyArc = arc || 'rainbow'; // which Story arc this chapter belongs to (token + return)
  const questTeam = (team && team.length ? team : (getStarterId() ? [getStarterId()] : [])).filter(Boolean); // the 3 he brings (Story Quest)
  const back = el('button', { class: 'btn btn--back', type: 'button', 'aria-label': story ? 'Back to the adventure' : 'Back home',
    onClick: () => { audio.play(sfx.pop()); ctx.go(story ? 'story' : 'home', story ? { arc: storyArc } : undefined); } }, icon('back')); // always a safe exit; deferred work is epoch-guarded
  const stage = el('div', { class: 'battle__stage' });
  const tray = el('div', { class: 'battle__tray' });
  let currentSpeak = null; // the live question's prompt, for "hear it again"
  root.append(back, stage, tray, replayButton(() => { if (currentSpeak) currentSpeak(); }));
  music.play('battle'); // upbeat-but-calm battle bed (ducks under Dada)

  let buddyId = null;
  let wild = null;
  let wildHp = 0;
  let wildMax = 0;         // the wild's starting HP (the bar denominator) — scales with the quest tier
  let playerHp = 0;        // hearts — a wrong answer costs one; 0 = "tuckered out" (Battle 2.0)
  let busy = false;
  let token = 0;
  let bag = [];            // refilling shuffled question-type bag (endless back-and-forth)
  let lastTarget = null;
  let idleTimer = null;
  let superEff = false, saidSuper = false; // gentle type-matchup hint for this battle
  let wildEl = null, buddyEl = null, buddyWrapEl = null, hpFill = null, heartsRow = null;
  let dbgQ = null; // inert test hook (mirrors catch's window.__catch) — the live question's answer
  const bump = () => { token += 1; clearTimeout(idleTimer); return token; };
  if (typeof window !== 'undefined') window.__battle = {
    get kind() { return dbgQ && dbgQ.kind; }, get answer() { return dbgQ && dbgQ.answer; },
    get word() { return dbgQ && dbgQ.word; }, get won() { return !!root.querySelector('.win'); },
    get hearts() { return playerHp; }, get wildHp() { return wildHp; },
    get tuckered() { return !!root.querySelector('.combatant--buddy.is-tuckered'); },
  };

  function scheduleIdle(speak, myToken) {
    clearTimeout(idleTimer);
    idleTimer = ctx.after(7000, () => { if (myToken === token && !busy) { speak(); scheduleIdle(speak, myToken); } });
  }
  function wrongTap(btn, speak, myToken) {
    audio.play(sfx.soft());
    if (btn) { btn.classList.add('is-wrong', 'is-dimmed'); btn.addEventListener('animationend', () => btn.classList.remove('is-wrong'), { once: true }); }
    if (wildEl) { wildEl.classList.add('is-wiggle'); ctx.after(500, () => wildEl && wildEl.classList.remove('is-wiggle')); }
    ctx.after(550, () => { if (myToken === token) { busy = false; speak(); } }); // re-open input only after the scaffold + re-prompt
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
  // A fresh foe. In a Story Quest, its TYPE is set by the mission (so the right team
  // pick matters) and its HP scales with the difficulty tier (1→5). The anti-spiral
  // floor still eases the wild after a losing streak — never stuck.
  function newWild() {
    wild = quest && foeType ? battle.pickWildOfType(foeType) : battle.pickWild();
    const wildZone = ZONES.find((z) => wild.zones.includes(z.id)) || ZONES[0]; // not the Story chapter `zone` param
    root.style.backgroundImage = `url('${wildZone.background}')`;
    wildMax = quest ? Math.max(battle.SPIRAL_EASE_HP, 3 + (tier || 1)) : battle.WILD_MAX_HP; // tier 1→5 ⇒ 4→8 HP
    wildHp = getLossStreak() >= battle.SPIRAL_THRESHOLD ? battle.SPIRAL_EASE_HP : wildMax;
  }
  // Entry: a Story Quest battle lets Alex choose WHICH of his 3 to send (type
  // strategy); everything else goes straight in with the chosen buddy.
  function startBattle() {
    bump();
    clear(tray);            // remove any picker immediately so it can't be re-tapped
    newWild();
    if (quest) { showSendPicker(); return; }
    runBattle();
  }
  function runBattle() {
    const myToken = bump();
    playerHp = battle.PLAYER_MAX_HP;
    bag = [];
    lastTarget = null;
    const buddy = pokemonById(buddyId);
    superEff = !!(buddy && battle.isSuperEffective(buddy.types, wild.types)); // a good type pick → bigger hits
    saidSuper = false;
    renderStage();
    ctx.after(500, () => { if (myToken === token) audio.playSequence([clip.battleStart(), clip.name(wild.id)]); }); // audio-first: announce the wild
    ctx.after(1700, () => { if (myToken === token) nextTurn(); });
  }

  // ---------- Quest: "Who will you send?" (type-strategy, errorless) ----------
  // The wild is shown; Alex taps which of his 3 to send. A super-effective pick
  // glows + Dada cheers it — but a weak pick still wins (just slower). Never scolds.
  function showSendPicker() {
    const myToken = bump();
    clear(stage); clear(tray);
    stage.append(el('div', { class: 'battle__field', 'aria-hidden': 'true' }));
    const wildWrap = el('div', { class: 'combatant combatant--wild' });
    wildEl = spriteImg(wild); wildEl.classList.add('combatant__sprite');
    wildWrap.append(el('div', { class: 'combatant__name' }, wild.name), wildEl, el('div', { class: 'combatant__platform', 'aria-hidden': 'true' }));
    if (wild.types && wild.types[0]) wildWrap.append(typeBadge(wild.types[0], 'combatant__type'));
    stage.append(wildWrap);

    tray.append(el('div', { class: 'q-prompt' }, 'Who will you send?'));
    const grid = el('div', { class: 'send-pick' });
    const ids = questTeam.length ? questTeam : Object.keys(getPokedex()).map(Number).slice(0, 3);
    ids.forEach((id) => {
      const p = pokemonById(id); if (!p) return;
      const strong = battle.isSuperEffective(p.types, wild.types);
      const cell = el('button', { class: 'send-cell' + (strong ? ' is-strong' : ''), type: 'button',
        'aria-label': p.name + (strong ? ', super strong here' : ''),
        onClick: () => { audio.play(sfx.pop()); buddyId = id; if (strong) audio.speak(clip.greatPick()); runBattle(); } });
      cell.append(spriteImg(p), el('span', { class: 'send-cell__name' }, p.name), typeBadge((p.types || [])[0] || 'normal', 'send-cell__type'));
      if (strong) cell.append(el('span', { class: 'send-cell__strong', 'aria-hidden': 'true' }, 'strong!'));
      grid.append(cell);
    });
    tray.append(grid);
    ctx.after(500, () => { if (myToken === token) audio.playSequence([clip.battleStart(), clip.name(wild.id), clip.whoFights()]); });
  }

  function renderStage() {
    clear(stage);
    stage.append(el('div', { class: 'battle__field', 'aria-hidden': 'true' })); // the CSS arena mat, behind the fighters
    const wildWrap = el('div', { class: 'combatant combatant--wild' });
    const hp = el('div', { class: 'hpbar' }, (hpFill = el('div', { class: 'hpbar__fill' })));
    wildEl = spriteImg(wild); wildEl.classList.add('combatant__sprite');
    wildWrap.append(hp, el('div', { class: 'combatant__name' }, wild.name), wildEl, el('div', { class: 'combatant__platform', 'aria-hidden': 'true' }));
    buddyWrapEl = el('div', { class: 'combatant combatant--buddy' });
    heartsRow = el('div', { class: 'battle__hearts', 'aria-label': "Your Pokémon's energy" }); // hearts, not HP numbers
    buddyEl = spriteImg(pokemonById(buddyId)); buddyEl.classList.add('combatant__sprite');
    buddyWrapEl.append(heartsRow, buddyEl, el('div', { class: 'combatant__platform', 'aria-hidden': 'true' }));
    stage.append(wildWrap, buddyWrapEl);
    updateHp();
    renderHearts();
  }
  function updateHp() { if (hpFill) hpFill.style.width = `${Math.max(0, (wildHp / (wildMax || battle.WILD_MAX_HP)) * 100)}%`; }

  // Hearts (emoji-free CSS/SVG). `broke` animates the heart that was just lost.
  const heartSvg = '<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true"><path d="M12 21s-7-4.6-9.3-9C1.2 8.6 2.8 5.6 5.9 5.6c1.9 0 3.2 1.2 4.1 2.5 .9-1.3 2.2-2.5 4.1-2.5 3.1 0 4.7 3 3.2 6.4C19 16.4 12 21 12 21z" fill="currentColor"/></svg>';
  function renderHearts(broke) {
    if (!heartsRow) return;
    clear(heartsRow);
    for (let i = 0; i < battle.PLAYER_MAX_HP; i++) {
      const h = el('span', { class: 'heart' + (i < playerHp ? '' : ' heart--lost'), 'aria-hidden': 'true', html: heartSvg });
      if (broke && i === playerHp) h.classList.add('is-breaking'); // the one just lost
      heartsRow.append(h);
    }
  }

  const pickType = () => { if (!bag.length) bag = battle.battlePlan(); return bag.shift(); };
  function nextTurn() {
    if (wildHp <= 0) { win(); return; }
    if (playerHp <= 0) { tuckeredOut(); return; }
    busy = false;
    const myToken = bump();
    const type = pickType();
    if (type === 'compare') { const q = battle.makeCompare(lastTarget); lastTarget = q.a; renderCompare(q, myToken); }
    else if (type === 'match') { const q = battle.makeMatch(lastTarget); lastTarget = q.kind === 'number' ? q.target : lastTarget; renderMatch(q, myToken); }
    else renderBlend(battle.makeBlend(), myToken);
  }

  // A wrong answer (compare/match) costs a heart — real stakes. Blend mis-taps stay
  // errorless (a sub-step, not a wrong answer). 0 hearts → the soft landing.
  function loseHeart(btn, speak, myToken) {
    if (busy) return;
    busy = true; // hold input through the re-prompt so rapid mis-taps can't drain extra hearts past the scaffold (wrongTap re-opens it)
    playerHp -= 1;
    renderHearts(true);
    if (playerHp <= 0) { tuckeredOut(); return; }
    wrongTap(btn, speak, myToken); // re-prompt (errorless within the question) + the wild's playful wiggle
  }

  // The soft landing (sacred): his Pokémon gets sleepy and needs a rest, the wild
  // gently wins, then a warm "let's try again!" and an INSTANT fresh battle. A loss
  // costs nothing — no lost Pokémon, progress, stickers, or feathers; nothing scary.
  function tuckeredOut() {
    busy = true;
    bump(); // stop the turn loop + idle
    clear(tray);
    recordBattleLoss(); // anti-spiral counter (eases the next battle if it becomes a streak)
    if (buddyWrapEl) buddyWrapEl.classList.add('is-tuckered'); // sleepy droop + z's (CSS, no new art)
    if (wildEl) wildEl.classList.remove('is-hit', 'is-wiggle');
    audio.play(sfx.soft());
    audio.speak(clip.tuckeredOut());
    ctx.after(2400, () => { if (ctx.alive()) startBattle(); }); // try again, right away
  }

  // A super-effective hit: extra sparkle + (once) the spoken cue + a little type
  // icon — ambient delight + a seed of the type wheel. Never required, never a gate.
  function superHitFx(c) {
    sparkleBurst(root, c.x, c.y, 26);
    driftSparkles(root, c.x, c.y, 6);
    const buddy = pokemonById(buddyId);
    const t = buddy && battle.superType(buddy.types, wild.types);
    if (!t) return;
    const badge = typeBadge(t, 'battle__supericon');
    badge.style.left = `${c.x}px`; badge.style.top = `${c.y - 10}px`;
    root.appendChild(badge);
    ctx.after(1100, () => badge.remove());
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
      // a charged (blend) hit is bigger; a super-effective type pick DOUBLES it — a
      // good pick is faster/juicier, a weak pick still lands (slower, never zero).
      wildHp -= (charged ? 2 : 1) * (superEff ? 2 : 1);
      updateHp();
      if (superEff) { superHitFx(c); if (!saidSuper) { saidSuper = true; audio.speak(clip.superEffective()); } else audio.speak(clip.praise(rnd(PRAISE_COUNT))); }
      else audio.speak(clip.praise(rnd(PRAISE_COUNT)));
      ctx.after(950, () => { if (ctx.alive()) (wildHp <= 0 ? win() : nextTurn()); });
    });
  }

  // ---------- Question: comparison ----------
  function renderCompare(q, myToken) {
    dbgQ = { kind: 'compare', answer: q.answer };
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
    currentSpeak = speak;
    function onPick(n, btn) {
      if (busy) return;
      if (n === q.answer) onHit(q, firstTry, false);
      else { firstTry = false; loseHeart(btn, speak, myToken); } // a wrong answer costs a heart
    }
    gateAnswers(row, ctx); // tappable a beat after the prompt
    ctx.after(350, () => { if (myToken === token) speak(); });
    scheduleIdle(speak, myToken);
  }

  // ---------- Question: find-the-match ----------
  function renderMatch(q, myToken) {
    dbgQ = { kind: 'match', answer: q.target };
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
    currentSpeak = speak;
    function onPick(v, btn) {
      if (busy) return;
      if (v === q.target) onHit(q, firstTry, false);
      else {
        firstTry = false;
        loseHeart(btn, speak, myToken); // a wrong answer costs a heart (may end the battle)
        if (playerHp > 0) { // still going → progressively dim a wrong option toward the answer
          const live = [...row.children].filter((b) => !b.classList.contains('is-dimmed') && b.textContent !== String(q.target) && b !== btn);
          if (live.length) live[Math.floor(Math.random() * live.length)].classList.add('is-dimmed');
        }
      }
    }
    gateAnswers(row, ctx); // tappable a beat after the prompt
    ctx.after(350, () => { if (myToken === token) speak(); });
    scheduleIdle(speak, myToken);
  }

  // ---------- Question: blend-to-charge ----------
  function renderBlend(q, myToken) {
    dbgQ = { kind: 'blend', word: q.word };
    clear(tray);
    const letters = graphemes(q.word); // a digraph (sh/ch/th/ng) is ONE sound — one slot, one tile
    tray.append(el('div', { class: 'q-prompt' }, 'Charge it up — tap the sounds!'));
    const chargeFill = el('div', { class: 'chargebar__fill', style: { width: '0%' } });
    tray.append(el('div', { class: 'chargebar' }, chargeFill));
    const slotRow = el('div', { class: 'word-slots' });
    const slots = letters.map((ch) => el('div', { class: 'word-slot' + (ch.length > 1 ? ' is-digraph' : ''), dataset: { want: ch } }));
    slots.forEach((s) => slotRow.append(s));
    const distract = shuffle(mastery.unlockedLetters().filter((c) => !letters.includes(c) && !letters.some((l) => sameSound(l, c)))).slice(0, 2);
    let tiles = shuffle([...letters, ...distract]);
    const tileRow = el('div', { class: 'tile-row' });
    let nextIndex = 0, firstTry = true, locked = false;

    const speakNext = () => { if (nextIndex < slots.length) audio.speak(clip.phoneme(slots[nextIndex].dataset.want)); };
    currentSpeak = speakNext; // "hear it again" replays the current sound to tap
    function activateSlot() {
      slots.forEach((s, i) => s.classList.toggle('is-active', i === nextIndex));
      if (nextIndex < slots.length) { const want = slots[nextIndex].dataset.want; ctx.after(300, () => { if (myToken === token) audio.speak(clip.phoneme(want)); }); scheduleIdle(speakNext, myToken); }
    }
    function renderTiles() {
      clear(tileRow);
      tiles.forEach((ch, idx) => {
        if (ch === null) { tileRow.append(el('div', { class: 'tile tile--used', 'aria-hidden': 'true' })); return; }
        tileRow.append(el('button', { class: 'tile' + (ch.length > 1 ? ' is-digraph' : ''), type: 'button', 'aria-label': ch, onClick: (e) => onTile(ch, idx, e.currentTarget) }, ch));
      });
    }
    function onTile(ch, idx, tile) {
      if (locked || busy) return;
      clearTimeout(idleTimer);
      const want = slots[nextIndex].dataset.want;
      if (ch === want) {
        audio.play(sfx.pop());
        slots[nextIndex].textContent = ch; slots[nextIndex].classList.add('is-filled');
        audio.speak(clip.phoneme(ch));
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
        ctx.after(450, () => { if (!locked && myToken === token) audio.speak(clip.phoneme(want)); });
        scheduleIdle(speakNext, myToken);
      }
    }
    async function finishBlend() {
      clearTimeout(idleTimer);
      slots.forEach((s) => s.classList.remove('is-active'));
      await audio.playSequence(letters.map((ch) => clip.phoneme(ch)), 0.14);
      if (!ctx.alive() || myToken !== token) return;
      await audio.speak(clip.word(q.word));
      if (!ctx.alive() || myToken !== token) return;
      onHit(q, firstTry, true); // charged hit
    }

    renderTiles();
    tray.append(slotRow, tileRow);
    gateAnswers(tileRow, ctx); // the sound tiles arrive a beat after "Charge it up!"
    ctx.after(400, () => { if (myToken === token) { audio.speak(clip.chargeUp()); ctx.after(900, activateSlot); } });
  }

  // ---------- Win (earned now — Battle 2.0) ----------
  function win() {
    busy = true;
    clearTimeout(idleTimer);
    clearBattleLosses(); // a win resets the anti-spiral floor immediately
    clear(tray);
    if (wildEl) wildEl.classList.add('is-fainted');
    audio.speak(clip.fainted());
    const c = wildEl ? centerOf(wildEl, root) : { x: 0, y: 0 };
    sparkleBurst(root, c.x, c.y - 20, 10); // sleepy stars
    ctx.after(900, () => {
      if (!ctx.alive()) return;
      confetti(root);
      addBond(buddyId, battle.BATTLE_BOND);
      audio.speak(clip.youWin());
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
    // Story chapter: the win earns this zone's feather and returns to the journey.
    const tokenCta = ctaForArc(storyArc); // arc-aware (brief 026 Part D) — no arc shows another's wording
    const actions = story
      ? el('div', { class: 'win__actions' },
          el('button', { class: 'btn btn--big', type: 'button', onClick: () => { audio.play(sfx.pop()); overlay.remove(); earn(storyArc, zone); ctx.go('story', { earned: zone, arc: storyArc }); } }, tokenCta))
      : el('div', { class: 'win__actions' },
          el('button', { class: 'btn btn--big', type: 'button', onClick: () => { audio.play(sfx.pop()); overlay.remove(); startBattle(); } }, 'Play again!'),
          el('button', { class: 'btn btn--ghost', type: 'button', onClick: () => { audio.play(sfx.pop()); ctx.go('home'); } }, 'Home'));
    overlay.append(el('div', { class: 'win__card' },
      el('div', { class: 'win__badge' }, 'You win!'),
      sprite,
      didEvolve ? null : el('div', { class: 'win__bond' }, icon('bond'), ` +${battle.BATTLE_BOND} bond`),
      actions,
    ));
    root.append(overlay);
  }

  // Story Quest: choose the foe + the "who will you send?" picker (type strategy).
  // Other story chapters: Alex's starter steps up straight away. Free-play: the
  // buddy picker as always.
  if (quest) startBattle();
  else if (story) { buddyId = getStarterId(); startBattle(); }
  else showBuddyPicker();
  return root;
}
