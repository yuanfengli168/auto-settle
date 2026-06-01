import { createCanvas, registerFont } from 'canvas';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { BalanceResult } from './balance.js';

export interface MemeOptions {
  friendName?: string;
  userName?: string;
  balances: BalanceResult[];
  output?: string;
  lang?: 'en' | 'zh';
}

// Classic movie quotes about debts/money
const EN_QUOTES = [
  "I'm gonna make him an offer he can't refuse. — The Godfather",
  "Show me the money! — Jerry Maguire",
  "Pay up, or else. — Every mobster ever",
  "You don't pay, you don't play. — Casino",
  "Where's the money, Lebowski?! — The Big Lebowski",
  "I want what's mine. — Goodfellas",
  "First rule: you do not talk about unpaid debts. — Fight Club (kinda)",
  "Nobody owes you anything. Except me. — Scarface (reimagined)",
];

const ZH_QUOTES = [
  "出来混，迟早要还的。——《无间道》",
  "我给你面子，你给我钱。——经典台词",
  "欠债还钱，天经地义。——古训",
  "出来跑，迟早要还。——《无间道》",
  "钱不是问题，问题是没钱。——经典",
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Draw a pixel-art character on canvas
function drawPixelCharacter(ctx: any, cx: number, cy: number, style: 'collector' | 'angry' = 'collector') {
  const S = 6; // pixel size
  const skin = '#FFD5B4';
  const suit = '#2D2D2D';
  const tie = '#E94560';
  const eye = '#1A1A2E';
  const mouth = '#C0392B';
  const shoe = '#1A1A2E';
  const hair = '#4A3728';

  function px(x: number, y: number, color: string) {
    ctx.fillStyle = color;
    ctx.fillRect(cx + x * S, cy + y * S, S, S);
  }

  // Hair
  for (let x = -3; x <= 3; x++) px(x, -5, hair);
  for (let x = -4; x <= 4; x++) px(x, -4, hair);

  // Head
  for (let y = -3; y <= 1; y++)
    for (let x = -3; x <= 3; x++)
      px(x, y, skin);

  // Eyes (angry)
  px(-2, -1, eye); px(-1, -1, eye);
  px(1, -1, eye); px(2, -1, eye);
  // Angry eyebrows
  px(-3, -2, eye); px(-1, -2, eye);
  px(2, -2, eye); px(3, -2, eye);

  // Mouth
  px(-1, 1, mouth); px(0, 1, mouth); px(1, 1, mouth);

  // Neck
  px(-1, 2, skin); px(0, 2, skin); px(1, 2, skin);

  // Body (suit)
  for (let y = 3; y <= 10; y++)
    for (let x = -4; x <= 4; x++)
      px(x, y, suit);

  // Tie
  for (let y = 3; y <= 8; y++)
    px(0, y, tie);

  // Left arm
  for (let y = 4; y <= 7; y++) {
    px(-5, y, suit); px(-6, y, suit);
  }

  // Right arm (reaching out / holding money bag)
  for (let y = 4; y <= 7; y++) {
    px(5, y, suit); px(6, y, suit);
  }

  // Right hand
  px(7, 6, skin); px(7, 7, skin); px(8, 7, skin);

  // Money bag in right hand
  const bag = '#8B6914';
  const bagHighlight = '#DAA520';
  for (let y = 2; y <= 7; y++)
    for (let x = 8; x <= 13; x++)
      px(x, y, bag);
  // Bag tie
  px(10, 1, bag); px(11, 1, bag);
  px(10, 0, bag); px(11, 0, bag);
  // $ sign
  px(10, 4, tie); px(11, 4, tie); px(12, 4, tie);
  px(11, 3, tie); px(11, 5, tie);

  // Legs
  for (let y = 11; y <= 16; y++) {
    px(-2, y, suit); px(-1, y, suit);
    px(1, y, suit); px(2, y, suit);
  }

  // Shoes
  px(-3, 17, shoe); px(-2, 17, shoe); px(-1, 17, shoe);
  px(1, 17, shoe); px(2, 17, shoe); px(3, 17, shoe);
}

export async function generateMeme(options: MemeOptions): Promise<string> {
  const W = 800;
  const H = 600;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  const isZh = options.lang === 'zh';
  const userName = options.userName || 'you';

  // ── Background ──
  // Dark pixel grid
  for (let x = 0; x < W; x += 8) {
    for (let y = 0; y < H; y += 8) {
      ctx.fillStyle = (Math.floor(x / 8) + Math.floor(y / 8)) % 2 === 0 ? '#16213e' : '#1a1a2e';
      ctx.fillRect(x, y, 8, 8);
    }
  }

  // ── Title bar ──
  ctx.fillStyle = '#E94560';
  ctx.fillRect(0, 0, W, 70);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 28px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(
    isZh ? '💰 催 债 通 缉 令 💰' : '💰 DEBT COLLECTOR 💰',
    W / 2, 45
  );

  // ── Pixel art character ──
  drawPixelCharacter(ctx, 180, 220);

  // ── Speech bubble ──
  const bubbleX = 340;
  const bubbleY = 160;
  const bubbleW = 400;
  const bubbleH = 110;

  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#E94560';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(bubbleX + bubbleW / 2, bubbleY + bubbleH / 2, bubbleW / 2, bubbleH / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Bubble tail
  ctx.beginPath();
  ctx.moveTo(bubbleX + 40, bubbleY + bubbleH - 5);
  ctx.lineTo(bubbleX + 80, bubbleY + bubbleH - 5);
  ctx.lineTo(210, 230);
  ctx.closePath();
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.strokeStyle = '#E94560';
  ctx.stroke();

  // Speech text
  ctx.fillStyle = '#E94560';
  ctx.font = 'bold 26px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(
    isZh ? '还钱！💢' : "Where's my money?!",
    bubbleX + bubbleW / 2, bubbleY + bubbleH / 2 + 8
  );

  // ── Debt breakdown box ──
  ctx.fillStyle = '#0f3460';
  ctx.strokeStyle = '#E94560';
  ctx.lineWidth = 3;
  roundRect(ctx, 40, 380, 720, 170, 8);
  ctx.fill();
  ctx.stroke();

  // Box title
  ctx.fillStyle = '#E94560';
  ctx.font = 'bold 22px monospace';
  ctx.textAlign = 'center';
  const title = options.friendName
    ? (isZh ? `${options.friendName} — 欠款清单` : `${options.friendName.toUpperCase()} — STATEMENT`)
    : (isZh ? '欠款清单' : 'OUTSTANDING DEBTS');
  ctx.fillText(title, W / 2, 415);

  // Separator
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(60, 430);
  ctx.lineTo(740, 430);
  ctx.stroke();

  // List debts
  ctx.fillStyle = '#F5C518';
  ctx.font = '20px monospace';
  ctx.textAlign = 'left';
  let rowY = 460;
  for (const b of options.balances) {
    for (const a of b.amounts) {
      const direction = a.amount > 0
        ? (isZh ? '你欠' : 'you owe')
        : (isZh ? '欠你' : `owes ${userName}`);
      const line = `${b.friendName}: ${a.currency} ${Math.abs(a.amount).toFixed(2)} ${direction}  👀`;
      ctx.fillText(line, 80, rowY);
      rowY += 35;
    }
  }

  // Total line
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 20px monospace';
  ctx.fillText(isZh ? `⏰ ${userName}已付清，请你还钱！` : `${userName} paid his share. Now pay ${userName}! ⏰`, 80, rowY + 10);

  // ── Bottom bar — movie quote ──
  ctx.fillStyle = '#E94560';
  ctx.fillRect(0, H - 40, W, 40);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '14px monospace';
  ctx.textAlign = 'center';
  const quote = isZh ? pickRandom(ZH_QUOTES) : pickRandom(EN_QUOTES);
  ctx.fillText(`"${quote}"`, W / 2, H - 15);

  // ── Save ──
  const outputPath = options.output || path.join(os.homedir(), '.auto-settle', 'meme.png');
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const buf = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buf);

  return outputPath;
}

function roundRect(ctx: any, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}