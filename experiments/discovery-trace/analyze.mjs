import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

const [scratch, output] = process.argv.slice(2);
const files = readdirSync(scratch).filter((n) =>
  /^disc031-(?:https|direct)-(?:real|fixed|select1)-(?:single|burst|minimal|handler)-[1-4]\.json(?:\.gz)?$/.test(
    n,
  ),
);
const dist = (values) => {
  values = values.filter(Number.isFinite).sort((a, b) => a - b);
  return {
    n: values.length,
    p50: values[Math.floor(values.length * 0.5)],
    p95: values[Math.min(values.length - 1, Math.floor(values.length * 0.95))],
    max: values.at(-1),
  };
};
const union = (spans) => {
  let total = 0,
    end = -Infinity;
  for (const s of [...spans].sort((a, b) => a.start - b.start)) {
    total += Math.max(0, s.start + s.ms - Math.max(end, s.start));
    end = Math.max(end, s.start + s.ms);
  }
  return total;
};
const decode = (headers, key) =>
  headers?.[key] ? JSON.parse(headers[key]) : null;
const phase = (trace, name) =>
  trace?.spans.find((s) => s.name === name)?.ms ?? 0;
const request = (r) => {
  const edge = decode(r.headers, 'x-disc031-edge'),
    app = decode(r.headers, 'x-disc031'),
    runtime = decode(r.headers, 'x-disc031-runtime');
  const wire = r.network
    ? r.network.responseStart - r.network.requestStart
    : r.headersAt;
  const edgeMs = phase(edge, edge?.name);
  const appMs = phase(app, app?.name);
  const db =
    app?.spans.filter(
      (s) =>
        s.name.startsWith('sql') ||
        ['db-connect', 'db-close', 'pool-wait'].includes(s.name),
    ) ?? [];
  return {
    observed: {
      dispatch: r.dispatch,
      headers: r.headersAt,
      end: r.end,
      network: r.network,
    },
    path: r.path,
    status: r.status,
    wire,
    edgeMs,
    appMs,
    runtimeMs: runtime?.ms,
    frameworkImport: runtime?.importMs,
    frameworkOutsideRoute:
      runtime && app ? runtime.ms - runtime.importMs - appMs : null,
    outsideRuntime: runtime ? wire - edgeMs - runtime.ms : null,
    sqlUnion: union(db.filter((s) => s.name.startsWith('sql'))),
    connectUnion: union(db.filter((s) => s.name === 'db-connect')),
    poolUnion: union(db.filter((s) => s.name === 'pool-wait')),
    closeUnion: union(db.filter((s) => s.name === 'db-close')),
    dbUnion: union(db),
    edge,
    app,
    runtime,
  };
};
const trials = files.map((file) => {
  const bytes = readFileSync(`${scratch}/${file}`);
  const data = JSON.parse(
    file.endsWith('.gz') ? gunzipSync(bytes).toString() : bytes.toString(),
  );
  for (const outcome of data.outcomes) {
    if (outcome.metrics) Object.assign(outcome, outcome.metrics);
  }
  const metadata = JSON.parse(
    readFileSync(
      `${scratch}/${file.replace(/\.json(?:\.gz)?$/, '-deploy.json')}`,
      'utf8',
    ),
  );
  const browsers = data.outcomes.filter((o) => o.usable != null);
  const instances = new Set();
  const walk = (value) => {
    if (!value) return;
    if (value.instance) instances.add(value.instance);
    value.children?.forEach(walk);
  };
  for (const o of data.outcomes)
    for (const r of o.requests ?? [o])
      for (const key of ['x-disc031-edge', 'x-disc031', 'x-disc031-runtime'])
        walk(decode(r.headers, key));
  return { file, data, metadata, browsers, instances };
});
const groups = {};
for (const trial of trials) {
  const key = `${trial.data.transport}-${trial.data.control}-${trial.data.workload}`;
  groups[key] ??= { trials: [], cold: [], warm: [] };
  const group = groups[key];
  group.trials.push(trial.metadata.id);
  for (const o of trial.data.outcomes.filter((o) => o.phase !== 'safety'))
    group[o.phase === 'cold' ? 'cold' : 'warm'].push(o);
}
const summary = Object.fromEntries(
  Object.entries(groups).map(([key, g]) => [
    key,
    {
      trials: g.trials,
      cold: {
        ms: dist(g.cold.map((o) => o.ms)),
        usable: dist(g.cold.map((o) => o.usable)),
        cards: dist(g.cold.map((o) => o.cards)),
      },
      warm: {
        ms: dist(g.warm.map((o) => o.ms)),
        usable: dist(g.warm.map((o) => o.usable)),
        cards: dist(g.warm.map((o) => o.cards)),
      },
      successfulColdMs: dist(
        g.cold.filter((o) => o.valid && o.status === 200).map((o) => o.ms),
      ),
      successfulWarmMs: dist(
        g.warm.filter((o) => o.valid && o.status === 200).map((o) => o.ms),
      ),
      coldPassed: g.cold.filter((o) => o.valid && o.status === 200).length,
      warmPassed: g.warm.filter((o) => o.valid && o.status === 200).length,
      invalid: [...g.cold, ...g.warm].filter(
        (o) => !o.valid || o.status !== 200,
      ).length,
    },
  ]),
);
const comparisons = [];
for (let i = 0; i < trials.length; i++)
  for (let j = i + 1; j < trials.length; j++)
    comparisons.push({
      a: trials[i].file,
      b: trials[j].file,
      overlap: [...trials[i].instances].filter((id) =>
        trials[j].instances.has(id),
      ).length,
      hashEqual:
        trials[i].metadata.publishedDigest ===
        trials[j].metadata.publishedDigest,
    });
const representative = [];
for (const transport of ['https', 'direct'])
  for (const path of ['/', '/en', '/ja'])
    for (const signed of [false, true]) {
      const visits = trials
        .filter(
          (t) =>
            t.data.transport === transport &&
            t.data.control === 'real' &&
            ['burst', 'single'].includes(t.data.workload),
        )
        .flatMap((t) => t.browsers.map((o) => ({ file: t.file, ...o })))
        .filter((o) => o.path === path && o.signed === signed && o.valid);
      for (const speed of ['fast', 'slow']) {
        const visit = [...visits].sort((a, b) => a.cards - b.cards)[
          speed === 'fast' ? 0 : visits.length - 1
        ];
        if (visit) {
          const done = visit.fetches
            .filter((f) => f.path.startsWith('/api/discovery'))
            .map((f) => f.jsonEnd ?? 0);
          representative.push({
            transport,
            path,
            signed,
            speed,
            file: visit.file,
            id: visit.id,
            phase: visit.phase,
            visible: visit.visible,
            usable: visit.usable,
            cards: visit.cards,
            paint: visit.paints,
            navigation: visit.navigation,
            resources: visit.resources,
            apiComplete: Math.max(...done),
            renderAfterApi: visit.cards - Math.max(...done),
            fetches: visit.fetches,
            requests: visit.requests
              .filter(
                (r) =>
                  r.type === 'document' || r.path.startsWith('/api/discovery'),
              )
              .map(request),
          });
        }
      }
    }
const requestStats = {};
for (const t of trials)
  for (const o of t.data.outcomes.filter((o) => o.phase !== 'safety'))
    for (const r of o.requests ?? [o])
      if (
        r.path.startsWith('/api/discovery') ||
        r.path === '/api/internal/disc031-minimal'
      ) {
        const row = request(r);
        const key = `${t.data.transport}-${t.data.control}-${t.data.workload}-${o.phase}-${r.path}`;
        requestStats[key] ??= [];
        requestStats[key].push(row);
      }
const durations = Object.fromEntries(
  Object.entries(requestStats).map(([key, rows]) => [
    key,
    Object.fromEntries(
      [
        'wire',
        'edgeMs',
        'appMs',
        'runtimeMs',
        'frameworkImport',
        'frameworkOutsideRoute',
        'outsideRuntime',
        'sqlUnion',
        'connectUnion',
        'poolUnion',
        'closeUnion',
        'dbUnion',
      ].map((k) => [k, dist(rows.map((r) => r[k]))]),
    ),
  ]),
);
const failures = trials.flatMap((t) =>
  t.data.outcomes
    .filter((o) => o.phase !== 'safety' && !o.valid)
    .map((o) => ({
      file: t.file,
      id: o.id,
      path: o.path,
      phase: o.phase,
      signed: o.signed,
      ms: o.ms,
      error: o.error,
      usable: o.usable,
      cards: o.cards,
      fetches: o.fetches,
      requests: o.requests
        .filter(
          (r) => r.type === 'document' || r.path.startsWith('/api/discovery'),
        )
        .map(request),
    })),
);
const result = {
  at: new Date().toISOString(),
  summary,
  comparisons,
  representative,
  failures,
  durations,
  checks: trials.flatMap((t) => t.data.checks),
  trials: trials.map((t) => ({
    file: t.file,
    ...t.metadata,
    instanceCount: t.instances.size,
    observations: t.data.outcomes.length,
  })),
};
writeFileSync(output, JSON.stringify(result, null, 2));
console.log(
  JSON.stringify(
    {
      summary,
      qualified: trials.length,
      overlaps: comparisons.filter((c) => c.overlap || c.hashEqual),
      failedChecks: result.checks.filter((c) => !c.passed).length,
    },
    null,
    2,
  ),
);
