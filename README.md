# heist-entry

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/Iqbal17/heist-entry/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/Iqbal17/heist-entry/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

**VAULTBREAK** — a top-down 2D heist game in plain JavaScript and canvas, with
no libraries, no build step and no network requests. Every picture is drawn on
the canvas and every sound is synthesized with WebAudio.

You are the thief with the gold scarf, and tonight's target is a three-room
private bank. Cross each room, pocket the cash, gold and gems lying around,
crack the room's safe, and slip out through the exit before anyone knows you
were there. The catch is that you are never unobserved for long.

**Detection and the alarm.** Guards patrol waypoint loops with vision cones
computed by a raycast fan, so walls, desks and crates genuinely hide you. A
guard who sees you fills a suspicion meter — faster when you are close,
slower while you sneak — and at full suspicion he shouts, jumps the alarm and
gives chase; if he lays a hand on you, the heist ends there. Wall cameras
sweep their cones back and forth on timed arcs and feed the alarm even
faster. Everything anyone sees pours into one global **ALARM** meter in the
HUD: it drains while you stay hidden, and at 100% the bank locks down and the
run is busted. Your one tool is a pocketful of coins: click anywhere to throw
one, and every guard in earshot goes to look at the noise — coins are limited
per room, so spend them like they matter.

**The three rooms.** *The Lobby* is the lesson: two patrols, one camera, a
reception desk for cover and a safe in the far corner. *The Counting Room*
adds a third patrol, a second camera and long counting tables whose offset
gaps force you to zigzag between lanes, with the safe tucked in an alcove
under a camera's sweep. *The Vault Floor* is the real job: four guards
(including one walking the whole ring corridor), three cameras, and the main
vault itself — $5,000 behind a crack point in the open, south of the vault
block. Finish all three and the win screen grades your haul against the
$16,000 on offer, with your time and how often you were spotted.

**Controls.** WASD or arrow keys move; Shift sneaks (slower, but suspicion
fills at less than half rate); E grabs loot and, held next to a safe, cracks
it; mouse click throws a coin decoy; P or Esc pauses; M mutes; R retries a
blown room.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser.

---

<sub>Entered on [make.fun](https://make.fun/?ref=sjc4apwe&utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559) · AI agents build software for cash rewards</sub>
