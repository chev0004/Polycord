/**
 * Notion ticket CLI — the single interface for managing Polycord tickets.
 *
 * Usage:
 *   bun run tickets list                          List all tickets
 *   bun run tickets list --status=aborted         Filter by status
 *   bun run tickets list --priority=P0            Filter by priority
 *   bun run tickets sync                          Reconcile statuses with PR merge state
 *   bun run tickets view DISC-001                 View a ticket's full details
 *   bun run tickets start DISC-001                Set status to In Progress
 *   bun run tickets complete DISC-001             Set status to Done
 *   bun run tickets update DISC-001 --priority=P0 Update properties
 *   bun run tickets create                        Create a ticket (interactive args)
 *
 * Requires NOTION_API_KEY and NOTION_DB_ID in .env.local
 */

import { execSync } from 'node:child_process';

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_DB_ID = process.env.NOTION_DB_ID;
const API_BASE = 'https://api.notion.com/v1';
const API_VERSION = '2022-06-28';

if (!NOTION_API_KEY || !NOTION_DB_ID) {
  console.error('Missing NOTION_API_KEY or NOTION_DB_ID in .env.local');
  process.exit(1);
}

type ApiMethod = 'GET' | 'POST' | 'PATCH';

async function notion(
  method: ApiMethod,
  endpoint: string,
  body?: unknown,
): Promise<unknown> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${NOTION_API_KEY}`,
      'Notion-Version': API_VERSION,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Notion ${method} ${endpoint} ${res.status}: ${text}`);
  }
  return res.json();
}

type RichText = { plain_text: string }[];
type RelationItem = { id: string };
type NotionPage = {
  id: string;
  properties: {
    Ticket: { title: RichText };
    Title: { rich_text: RichText };
    Status: { status: { name: string } | null };
    Priority: { select: { name: string } | null };
    Area: { select: { name: string } | null };
    'Depends On': { relation: RelationItem[] };
    PR?: { rich_text: { plain_text: string; href: string | null }[] };
  };
};
type QueryResult = {
  results: NotionPage[];
  has_more: boolean;
  next_cursor: string | null;
};

async function queryAllTickets(filter?: unknown): Promise<NotionPage[]> {
  const pages: NotionPage[] = [];
  let cursor: string | undefined;

  do {
    const body: Record<string, unknown> = { page_size: 100 };
    if (filter) body.filter = filter;
    if (cursor) body.start_cursor = cursor;

    const result = (await notion(
      'POST',
      `/databases/${NOTION_DB_ID}/query`,
      body,
    )) as QueryResult;
    pages.push(...result.results);
    cursor =
      result.has_more && result.next_cursor ? result.next_cursor : undefined;
  } while (cursor);

  return pages;
}

async function findTicket(ticketId: string): Promise<NotionPage | null> {
  const result = (await notion('POST', `/databases/${NOTION_DB_ID}/query`, {
    filter: { property: 'Ticket', title: { equals: ticketId.toUpperCase() } },
    page_size: 1,
  })) as QueryResult;

  return result.results[0] ?? null;
}

function extractText(rt: RichText): string {
  return rt.map((r) => r.plain_text).join('');
}

function formatTicket(page: NotionPage): string {
  const p = page.properties;
  const ticket = extractText(p.Ticket.title);
  const title = extractText(p.Title.rich_text);
  const status = p.Status.status?.name ?? 'Unknown';
  const priority = p.Priority.select?.name ?? '—';
  const area = p.Area.select?.name ?? '—';
  const prHref = p.PR?.rich_text?.[0]?.href;
  const pr = prHref ? `#${prHref.split('/').pop()}` : '—';

  return `${ticket.padEnd(14)} ${status.padEnd(14)} ${priority.padEnd(5)} ${pr.padEnd(5)} ${area.padEnd(14)} ${title}`;
}

const statusMap: Record<string, string> = {
  todo: 'Not started',
  'not started': 'Not started',
  'in progress': 'In progress',
  inprogress: 'In progress',
  started: 'In progress',
  done: 'Done',
  completed: 'Done',
  abort: 'Aborted',
  aborted: 'Aborted',
};

function normalizeStatus(value: string): string {
  return statusMap[value.toLowerCase()] ?? value;
}

async function syncPrStatuses(pages: NotionPage[]) {
  if (pages.length === 0) return;
  try {
    const merged = new Set<number>(
      JSON.parse(
        execSync(
          'gh pr list --state merged --json number --limit 1000',
        ).toString(),
      ).map((pr: { number: number }) => pr.number),
    );
    for (const page of pages) {
      const href = page.properties.PR?.rich_text?.[0]?.href;
      const prMerged = href ? merged.has(Number(href.split('/').pop())) : false;
      if (page.properties.Status.status?.name === 'Aborted') continue;
      const done = page.properties.Status.status?.name === 'Done';
      if (prMerged === done) continue;
      const target = prMerged ? 'Done' : 'In progress';
      await notion('PATCH', `/pages/${page.id}`, {
        properties: { Status: { status: { name: target } } },
      });
      page.properties.Status.status = { name: target };
      console.log(
        `${extractText(page.properties.Ticket.title)} → ${target} ${prMerged ? '(PR merged)' : href ? '(PR not merged)' : '(no linked PR)'}`,
      );
    }
  } catch {
    console.warn('Skipped PR status sync (gh unavailable).');
    if (process.env.CI) process.exitCode = 1;
  }
}

async function cmdList(args: string[]) {
  let filter: unknown;

  const statusArg = args.find((a) => a.startsWith('--status='));
  const prioArg = args.find((a) => a.startsWith('--priority='));

  const filters: unknown[] = [];

  if (statusArg) {
    const mapped = normalizeStatus(statusArg.split('=')[1]);
    filters.push({ property: 'Status', status: { equals: mapped } });
  }

  if (prioArg) {
    const val = prioArg.split('=')[1].toUpperCase();
    filters.push({ property: 'Priority', select: { equals: val } });
  }

  if (filters.length === 1) filter = filters[0];
  else if (filters.length > 1) filter = { and: filters };

  const pages = await queryAllTickets(filter);
  await syncPrStatuses(pages);

  const prioOrder: Record<string, number> = { P0: 0, P1: 1, P2: 2 };
  pages.sort((a, b) => {
    const pa = prioOrder[a.properties.Priority.select?.name ?? 'P2'] ?? 9;
    const pb = prioOrder[b.properties.Priority.select?.name ?? 'P2'] ?? 9;
    if (pa !== pb) return pa - pb;
    return extractText(a.properties.Ticket.title).localeCompare(
      extractText(b.properties.Ticket.title),
    );
  });

  console.log(
    `${'TICKET'.padEnd(14)} ${'STATUS'.padEnd(14)} ${'PRI'.padEnd(5)} ${'PR'.padEnd(5)} ${'AREA'.padEnd(14)} TITLE`,
  );
  console.log('-'.repeat(90));
  for (const page of pages) {
    console.log(formatTicket(page));
  }
  console.log(`\n${pages.length} ticket(s)`);
}

async function cmdView(ticketId: string) {
  const page = await findTicket(ticketId);
  if (!page) {
    console.error(`Ticket ${ticketId.toUpperCase()} not found.`);
    process.exit(1);
  }

  const p = page.properties;
  console.log(
    `# ${extractText(p.Ticket.title)} — ${extractText(p.Title.rich_text)}`,
  );
  console.log(`Status:     ${p.Status.status?.name ?? 'Unknown'}`);
  console.log(`Priority:   ${p.Priority.select?.name ?? '—'}`);
  console.log(`Area:       ${p.Area.select?.name ?? '—'}`);
  const prLink = p.PR?.rich_text?.[0];
  console.log(
    `PR:         ${prLink ? `${prLink.plain_text} (${prLink.href})` : '—'}`,
  );
  const deps = p['Depends On'].relation;
  if (deps.length > 0) {
    const depNames: string[] = [];
    for (const dep of deps) {
      const depPage = (await notion('GET', `/pages/${dep.id}`)) as NotionPage;
      depNames.push(extractText(depPage.properties.Ticket.title));
    }
    console.log(`Depends On: ${depNames.join(', ')}`);
  } else {
    console.log('Depends On: —');
  }
  console.log('');

  const blocks = (await notion(
    'GET',
    `/blocks/${page.id}/children?page_size=100`,
  )) as {
    results: { type: string; [key: string]: unknown }[];
  };

  for (const block of blocks.results) {
    const btype = block.type;
    const data = block[btype] as { rich_text?: RichText } | undefined;
    const text = data?.rich_text
      ? data.rich_text.map((r) => r.plain_text).join('')
      : '';

    if (btype === 'heading_2') {
      console.log(`## ${text}`);
    } else if (btype === 'bulleted_list_item') {
      console.log(`- ${text}`);
    } else if (btype === 'paragraph' && text) {
      console.log(text);
    }
  }
}

async function cmdStart(ticketId: string) {
  const page = await findTicket(ticketId);
  if (!page) {
    console.error(`Ticket ${ticketId.toUpperCase()} not found.`);
    process.exit(1);
  }

  await notion('PATCH', `/pages/${page.id}`, {
    properties: { Status: { status: { name: 'In progress' } } },
  });
  console.log(`${ticketId.toUpperCase()} → In progress`);
}

function assertMergedPr(page: NotionPage, ticketId: string) {
  const prUrl = page.properties.PR?.rich_text?.[0]?.href;
  if (!prUrl) {
    console.error(
      `${ticketId.toUpperCase()} has no linked PR. Link it first: bun run tickets update ${ticketId.toUpperCase()} --pr=<url>`,
    );
    process.exit(1);
  }
  const prState = execSync(`gh pr view "${prUrl}" --json state --jq .state`)
    .toString()
    .trim();
  if (prState !== 'MERGED') {
    console.error(
      `PR ${prUrl} is ${prState}. Tickets are only completed after the owner merges the PR.`,
    );
    process.exit(1);
  }
}

async function cmdComplete(ticketId: string) {
  const page = await findTicket(ticketId);
  if (!page) {
    console.error(`Ticket ${ticketId.toUpperCase()} not found.`);
    process.exit(1);
  }

  assertMergedPr(page, ticketId);

  await notion('PATCH', `/pages/${page.id}`, {
    properties: { Status: { status: { name: 'Done' } } },
  });
  console.log(`${ticketId.toUpperCase()} → Done`);
}

async function cmdUpdate(ticketId: string, args: string[]) {
  const page = await findTicket(ticketId);
  if (!page) {
    console.error(`Ticket ${ticketId.toUpperCase()} not found.`);
    process.exit(1);
  }

  const properties: Record<string, unknown> = {};

  for (const arg of args) {
    const [key, ...rest] = arg.replace(/^--/, '').split('=');
    const val = rest.join('=');

    switch (key.toLowerCase()) {
      case 'status': {
        const name = normalizeStatus(val);
        if (name === 'Done') assertMergedPr(page, ticketId);
        properties.Status = { status: { name } };
        break;
      }
      case 'priority':
        properties.Priority = { select: { name: val.toUpperCase() } };
        break;
      case 'area':
        properties.Area = { select: { name: val } };
        break;
      case 'title':
        properties.Title = { rich_text: [{ text: { content: val } }] };
        break;
      case 'pr': {
        const title = val
          ? execSync(`gh pr view "${val}" --json title --jq .title`)
              .toString()
              .trim()
          : '';
        properties.PR = {
          rich_text: val
            ? [
                {
                  text: {
                    content: `#${val.split('/').pop()} ${title}`,
                    link: { url: val },
                  },
                },
              ]
            : [],
        };
        break;
      }
      case 'depends':
      case 'depends-on': {
        const depIds = val.split(',').map((s) => s.trim().toUpperCase());
        const relations: RelationItem[] = [];
        for (const depId of depIds) {
          const depPage = await findTicket(depId);
          if (!depPage) {
            console.error(`Dependency ticket ${depId} not found.`);
            process.exit(1);
          }
          relations.push({ id: depPage.id });
        }
        properties['Depends On'] = { relation: relations };
        break;
      }
      default:
        console.warn(`Unknown property: ${key}`);
    }
  }

  if (Object.keys(properties).length === 0) {
    console.error(
      'No properties to update. Use --status=, --priority=, --area=, --title=, --pr=, --depends-on=',
    );
    process.exit(1);
  }

  await notion('PATCH', `/pages/${page.id}`, { properties });
  console.log(`${ticketId.toUpperCase()} updated.`);
}

async function cmdCreate(args: string[]) {
  let ticketId = '';
  let title = '';
  let priority = 'P1';
  let area = '';
  let dependsOn = '';
  let summary = '';
  let currentState = '';
  let scope = '';
  let acceptanceCriteria = '';
  let outOfScope = '';
  let implNotes = '';

  for (const arg of args) {
    const [key, ...rest] = arg.replace(/^--/, '').split('=');
    const val = rest.join('=');

    switch (key.toLowerCase()) {
      case 'id':
        ticketId = val.toUpperCase();
        break;
      case 'title':
        title = val;
        break;
      case 'priority':
        priority = val.toUpperCase();
        break;
      case 'area':
        area = val;
        break;
      case 'depends':
      case 'depends-on':
        dependsOn = val;
        break;
      case 'summary':
        summary = val;
        break;
      case 'current-state':
        currentState = val;
        break;
      case 'scope':
        scope = val;
        break;
      case 'acceptance-criteria':
      case 'criteria':
        acceptanceCriteria = val;
        break;
      case 'out-of-scope':
        outOfScope = val;
        break;
      case 'notes':
      case 'implementation-notes':
        implNotes = val;
        break;
      default:
        console.warn(`Unknown option: ${key}`);
    }
  }

  if (!ticketId || !title) {
    console.error('Required: --id=TICKET-ID --title="Ticket title"');
    console.error(
      'Optional: --priority=P0 --area=Discovery --depends-on=AUTH-001',
    );
    console.error(
      '  Body:   --summary="..." --current-state="..." --scope="..."',
    );
    console.error(
      '          --acceptance-criteria="..." --out-of-scope="..." --notes="..."',
    );
    process.exit(1);
  }

  const existing = await findTicket(ticketId);
  if (existing) {
    console.error(`Ticket ${ticketId} already exists.`);
    process.exit(1);
  }

  const properties: Record<string, unknown> = {
    Ticket: { title: [{ text: { content: ticketId } }] },
    Title: { rich_text: [{ text: { content: title } }] },
    Status: { status: { name: 'Not started' } },
    Priority: { select: { name: priority } },
  };

  if (area) properties.Area = { select: { name: area } };
  if (dependsOn) {
    const depIds = dependsOn.split(',').map((s) => s.trim().toUpperCase());
    const relations: RelationItem[] = [];
    for (const depId of depIds) {
      const depPage = await findTicket(depId);
      if (!depPage) {
        console.error(`Dependency ticket ${depId} not found.`);
        process.exit(1);
      }
      relations.push({ id: depPage.id });
    }
    properties['Depends On'] = { relation: relations };
  }

  const sections: [string, string][] = [
    ['Summary', summary],
    ['Current State', currentState],
    ['Scope', scope],
    ['Acceptance Criteria', acceptanceCriteria],
    ['Out of Scope', outOfScope],
    ['Implementation Notes', implNotes],
  ];

  const children: unknown[] = [];
  for (const [heading, content] of sections) {
    children.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ type: 'text', text: { content: heading } }],
      },
    });
    children.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: content ? [{ type: 'text', text: { content } }] : [],
      },
    });
  }

  const page = (await notion('POST', '/pages', {
    parent: { database_id: NOTION_DB_ID },
    properties,
    children,
  })) as { id: string };

  console.log(`Created ${ticketId}: ${title}`);
  console.log(`https://notion.so/${page.id.replace(/-/g, '')}`);
}

async function main() {
  const [subcommand, ...args] = process.argv.slice(2);

  switch (subcommand) {
    case 'list':
      await cmdList(args);
      break;
    case 'sync':
      await syncPrStatuses(await queryAllTickets());
      break;
    case 'view':
      if (!args[0]) {
        console.error('Usage: tickets view TICKET-ID');
        process.exit(1);
      }
      await cmdView(args[0]);
      break;
    case 'start':
      if (!args[0]) {
        console.error('Usage: tickets start TICKET-ID');
        process.exit(1);
      }
      await cmdStart(args[0]);
      break;
    case 'complete':
      if (!args[0]) {
        console.error('Usage: tickets complete TICKET-ID');
        process.exit(1);
      }
      await cmdComplete(args[0]);
      break;
    case 'update':
      if (!args[0]) {
        console.error('Usage: tickets update TICKET-ID --key=value');
        process.exit(1);
      }
      await cmdUpdate(args[0], args.slice(1));
      break;
    case 'create':
      await cmdCreate(args);
      break;
    default:
      console.log(`Polycord Ticket CLI

Commands:
  list     [--status=todo|inprogress|done|aborted] [--priority=P0|P1|P2]  (syncs status both ways with PR merge state)
  sync                            Reconcile all ticket statuses with PR merge state (used by CI)
  view     <TICKET-ID>
  start    <TICKET-ID>            Set status to In Progress
  complete <TICKET-ID>            Set status to Done (requires linked PR to be merged)
  update   <TICKET-ID> --key=val  Update properties (--status=aborted, --pr=<url>)
  create   --id=ID --title="..."  Create with all standard sections

Create options:
  --id, --title, --priority, --area, --depends-on
  --summary, --current-state, --scope, --acceptance-criteria
  --out-of-scope, --notes

Examples:
  bun run tickets list
  bun run tickets list --status=aborted --priority=P1
  bun run tickets view DISC-001
  bun run tickets start DISC-001
  bun run tickets create --id=FEAT-001 --title="New feature" --priority=P1 --area=Core
`);
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
