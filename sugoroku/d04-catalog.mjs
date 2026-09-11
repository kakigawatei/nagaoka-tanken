// Match the server's gameplay catalog using already-expanded display data.
// Geometry remains in board_v4; no browser-side prices or randomness are generated here.
export function canonical(value) {
  return JSON.stringify(value, (key, item) => item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map(name => [name, item[name]])) : item);
}

export function catalogFromDisplay(board) {
  return {
    schemaVersion: 1, rulesVersion: 'd04-v1',
    nodes: board.nodes.map(n => ({id: n.id, t: n.t, ...(n.station ? {station: n.station} : {}), ...(n.prop ? {prop: n.prop} : {})})),
    edges: board.edges.map(e => Array.isArray(e) ? [e[0], e[1]] : [e.a, e.b]).map(([a, b]) => a < b ? [a, b] : [b, a]).sort((a, b) => a[0] - b[0] || a[1] - b[1]),
    stations: board.stations.map(s => ({id: s.id, name: s.name, area: s.area || ''})),
    properties: board.properties.slice().sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    rules: {years: 3, turnsPerYear: 36, startMoney: board.rules?.startMoney ?? 1000, debtMin: -1000, handMax: 8},
  };
}

export function catalogMatches(board, catalog) {
  const {boardVersion, ...content} = catalog;
  return /^[0-9a-f]{16}$/.test(boardVersion || '') && canonical(content) === canonical(catalogFromDisplay(board));
}
