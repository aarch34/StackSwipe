import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';

const COLORS: Record<string, string> = {
  k: 'var(--c-ink)',
  p: 'var(--c-pink)',
  y: 'var(--c-butter)',
  v: 'var(--c-violet)',
  t: 'var(--c-tomato)',
  g: 'var(--c-leaf)',
  c: 'var(--c-peach)',
  w: '#ffffff',
  o: '#d9a06b',
};

type SpriteProps = {
  rows: string[];
  className?: string;
  style?: CSSProperties;
};

/** Draws a character grid as crisp SVG rects, merging runs so the DOM stays small. */
export function Sprite({ rows, className, style }: SpriteProps) {
  const width = Math.max(...rows.map((r) => r.length));
  const rects: { x: number; y: number; w: number; c: string }[] = [];

  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      let run = 1;
      while (x + run < row.length && row[x + run] === ch) run += 1;
      if (COLORS[ch]) rects.push({ x, y, w: run, c: COLORS[ch] });
      x += run;
    }
  });

  return (
    <svg
      viewBox={`0 0 ${width} ${rows.length}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
      className={className}
      style={style}
    >
      {rects.map((r) => (
        <rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={r.w} height={1} fill={r.c} />
      ))}
    </svg>
  );
}

const STACKY_BODY = [
  '....kkkkkkkk....',
  '...kppppppppk...',
  '...kpwwppwwpk...',
  '...kpwkppwkpk...',
  '...kppppppppk...',
  '...kpppkkpppk...',
  '...kppppppppk...',
  '..kkkkkkkkkkkk..',
  '..kyyyyyyyyyyk..',
  '..kkkkkkkkkkkk..',
  '.kvvvvvvvvvvvvk.',
  '.kvvvvvvvvvvvvk.',
  '.kkkkkkkkkkkkkk.',
];
const STACKY_BLINK = [
  '....kkkkkkkk....',
  '...kppppppppk...',
  '...kppppppppk...',
  '...kpkkppkkpk...',
  '...kppppppppk...',
  '...kpppkkpppk...',
  '...kppppppppk...',
  '..kkkkkkkkkkkk..',
  '..kyyyyyyyyyyk..',
  '..kkkkkkkkkkkk..',
  '.kvvvvvvvvvvvvk.',
  '.kvvvvvvvvvvvvk.',
  '.kkkkkkkkkkkkkk.',
];
const LEGS_A = ['....kk....kk....', '....kk....kk....', '...kkk...kkk....'];
const LEGS_B = ['.....kk..kk.....', '....kk....kk....', '....kkk...kkk...'];

/** The mascot: a little creature made of stacked profile cards. */
export function Stacky({
  className,
  walking = false,
}: {
  className?: string;
  walking?: boolean;
}) {
  return (
    <span className={cn('px-sprite inline-block', walking ? 'px-walk' : 'px-bob', className)} aria-hidden="true">
      <Sprite rows={[...STACKY_BODY, ...LEGS_A]} className="px-frame-a" />
      <Sprite rows={[...STACKY_BODY, ...LEGS_B]} className="px-frame-b" />
      <Sprite rows={[...STACKY_BLINK, ...LEGS_A]} className="px-frame-blink" />
    </span>
  );
}

const HAND = [
  'kkkkk...........',
  'kpppk.kkkkkkk...',
  'kpppkkcccccccck.',
  'kpppkccccccccck.',
  'kpppkcccckkkkkkk',
  'kpppkccccccccck.',
  'kpppkcccckkkkkk.',
  'kpppkccccccccck.',
  'kpppkkcccckkkk..',
  'kpppk.kkkkk.....',
  'kkkkk...........',
];
const HAND_RIGHT = HAND.map((row) => row.replace(/p/g, 'y'));

export function HandLeft({ className }: { className?: string }) {
  return <Sprite rows={HAND} className={className} />;
}

export function HandRight({ className }: { className?: string }) {
  return (
    <Sprite rows={HAND_RIGHT} className={className} style={{ transform: 'scaleX(-1)' }} />
  );
}

const COIN = [
  '..kkkk..',
  '.kyyyyk.',
  'kyywwyyk',
  'kywyyyyk',
  'kywyyyyk',
  'kyyyyyyk',
  '.kyyyyk.',
  '..kkkk..',
];
const COIN_SPENT = COIN.map((row) => row.replace(/[yw]/g, '.'));

export function Coin({ spent = false, className }: { spent?: boolean; className?: string }) {
  return <Sprite rows={spent ? COIN_SPENT : COIN} className={className} />;
}

export function Cloud({ className }: { className?: string }) {
  return (
    <Sprite
      className={className}
      rows={[
        '......wwww......',
        '....wwwwwwww....',
        '..wwwwwwwwwwww..',
        '.wwwwwwwwwwwwww.',
        'wwwwwwwwwwwwwwww',
        'wwwwwwwwwwwwwwww',
      ]}
    />
  );
}

export function Flower({ className }: { className?: string }) {
  return (
    <Sprite
      className={className}
      rows={[
        '....ggg..ggg....',
        '...g...gg...g...',
        '...g...gg...g...',
        '.ggg...gg...ggg.',
        'g...gg.gg.gg...g',
        'g.....gyyg.....g',
        '.gggg.gyyg.gggg.',
        'g.....gyyg.....g',
        'g...gg.gg.gg...g',
        '.ggg...gg...ggg.',
        '...g...gg...g...',
        '...g...gg...g...',
        '....ggg..ggg....',
      ]}
    />
  );
}

export function PixelHeart({ className }: { className?: string }) {
  return (
    <Sprite
      className={className}
      rows={[
        '.kk.kk.',
        'kppkppk',
        'kpppppk',
        'kpppppk',
        '.kpppk.',
        '..kpk..',
        '...k...',
      ]}
    />
  );
}

export function PixelStar({ className }: { className?: string }) {
  return (
    <Sprite
      className={className}
      rows={[
        '...k...',
        '..kyk..',
        'kkyyykk',
        'kyyyyyk',
        '.kyyyk.',
        '.kykyk.',
        '.k...k.',
      ]}
    />
  );
}

/** Row of daily swipes shown as coins. Purely decorative: pair it with the text count. */
export function CoinRow({
  total,
  used,
  className,
}: {
  total: number;
  used: number;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-1', className)} aria-hidden="true">
      {Array.from({ length: total }, (_, i) => {
        // Coins spend from the right, so the remaining ones stay grouped on the left.
        const spent = i >= total - used;
        return (
          <span key={i} className={cn('block h-4 w-4 sm:h-5 sm:w-5', spent && 'px-coin-spent')}>
            <Coin spent={spent} className="h-full w-full" />
          </span>
        );
      })}
    </div>
  );
}
