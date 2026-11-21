import { run } from 'uebersicht';

const POS_FILE = '$HOME/Library/Application Support/Übersicht/widgets/.webapps-position.json';

// The app list lives in ~/Projects/mywebapps/index.html (single source of truth).
// To add an app, edit index.html only.
const INDEX_FILE = '$HOME/Projects/mywebapps/index.html';
const SEP = '---WEBAPPS-INDEX---';

// line 1: saved drag position (if any), then SEP, then index.html
export const command = `cat "${POS_FILE}" 2>/dev/null; echo; echo "${SEP}"; cat "${INDEX_FILE}" 2>/dev/null`;

export const refreshFrequency = false;

export const className = `
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;

  .box {
    position: absolute;
    pointer-events: auto;
    width: 288px;
    padding: 14px 16px;
    background-color: rgba(30, 30, 32, 0.55);
    -webkit-backdrop-filter: blur(20px);
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.08);
    font-family: -apple-system, "Hiragino Sans", sans-serif;
    color: #f0f0f0;
    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
    user-select: none;
  }

  h1 {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.02em;
    margin: 0 0 10px;
    color: rgba(255,255,255,0.6);
    text-transform: uppercase;
    cursor: move;
  }

  .item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 7px 0;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    cursor: default;
  }
  .item:last-child { border-bottom: none; }
  .item.live { cursor: pointer; }
  .item.live:hover { opacity: 0.75; }

  .name {
    font-size: 12.5px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dot {
    flex-shrink: 0;
    width: 7px;
    height: 7px;
    border-radius: 50%;
  }
  .dot.live { background: #4ade80; }
  .dot.pending { background: #eab308; }
`;

// pull `const apps = [ ... ];` out of index.html without eval
function parseApps(html) {
  const m = html && html.match(/const\s+apps\s*=\s*\[([\s\S]*?)\];/);
  if (!m) return null;
  const apps = [];
  const re = /\{\s*name:\s*(['"])(.*?)\1\s*,\s*url:\s*(['"])(.*?)\3/g;
  let e;
  while ((e = re.exec(m[1])) !== null) {
    apps.push({ name: e[2], url: e[4], status: 'live' });
  }
  return apps.length ? apps : null;
}

// no React state — plain DOM drag, wired up once via the ref callback below
function setupDrag(node) {
  if (!node || node.dataset.dragBound) return;
  node.dataset.dragBound = '1';
  const handle = node.querySelector('h1');

  handle.addEventListener('mousedown', (e) => {
    const startX = e.clientX;
    const startY = e.clientY;
    const startTop = parseFloat(node.style.top) || 0;
    const startLeft = parseFloat(node.style.left) || 0;

    const onMove = (ev) => {
      node.style.top = `${startTop + (ev.clientY - startY)}px`;
      node.style.left = `${startLeft + (ev.clientX - startX)}px`;
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      const pos = { top: parseFloat(node.style.top), left: parseFloat(node.style.left) };
      run(`echo '${JSON.stringify(pos)}' > "${POS_FILE}"`);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

export const render = ({ output }) => {
  const text = output || '';
  const i = text.indexOf(SEP);
  const posPart = i >= 0 ? text.slice(0, i) : text;
  const htmlPart = i >= 0 ? text.slice(i + SEP.length) : '';
  const apps = parseApps(htmlPart);

  let saved = {};
  try {
    saved = JSON.parse(posPart.trim());
  } catch (e) {
    saved = {};
  }
  const top = typeof saved.top === 'number' ? saved.top : 40;
  const left = typeof saved.left === 'number' ? saved.left : Math.max(window.innerWidth - 340, 0);

  return (
    <div className="box" ref={setupDrag} style={{ top: `${top}px`, left: `${left}px` }}>
      <h1>My Web Apps</h1>
      {!apps && (
        <div className="item">
          <span className="name">一覧を読めません</span>
        </div>
      )}
      {apps && apps.map((app) => (
        <div
          key={app.name}
          className={`item ${app.status}`}
          onClick={() => app.url && run(`open "${app.url}"`)}
        >
          <span className="name">{app.name}</span>
          <span className={`dot ${app.status}`} />
        </div>
      ))}
    </div>
  );
};
