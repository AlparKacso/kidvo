// Prints the play counts as a table.
//   npm run counts            the last 7 days, per game
//   npm run counts:weeks      the last 12 weeks, all games
// Add --local to read the database of `npm run dev` instead of the live one.
import { execFileSync } from 'node:child_process';

const QUERIES = {
  days: `SELECT game, SUM(opens) AS opens, ROUND(SUM(seconds) / 60.0) AS minutes,
    ROUND(SUM(seconds) / 60.0 / MAX(SUM(opens), 1), 1) AS min_per_open, SUM(rounds) AS rounds,
    SUM(m0) AS under_1_min, SUM(m1) AS min_1_5, SUM(m5) AS min_5_15, SUM(m15) AS over_15_min
    FROM plays WHERE day >= date('now', '-6 days') GROUP BY game ORDER BY opens DESC`,
  weeks: `SELECT strftime('%Y week %W', day) AS week, SUM(opens) AS opens, ROUND(SUM(seconds) / 60.0) AS minutes,
    SUM(rounds) AS rounds FROM plays GROUP BY week ORDER BY week DESC LIMIT 12`
};

const which = process.argv.includes('weeks') ? 'weeks' : 'days';
const where = process.argv.includes('--local') ? '--local' : '--remote';
let out;
try {
  out = execFileSync('npx', ['wrangler', 'd1', 'execute', 'kidvo-count', where, '--json', '--command', QUERIES[which].replace(/\s+/g, ' ')],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
} catch (err) {
  const text = String(err.stderr || err.stdout || err.message).trim();
  console.error(text);
  if (/login|authenticat/i.test(text)) console.error('\nSign in first: npx wrangler login');
  process.exit(1);
}
const rows = JSON.parse(out)[0].results;
console.log(which === 'days' ? 'Plays in the last 7 days (UTC), per game:' : 'Plays per week, all games:');
if (rows.length) console.table(rows);
else console.log('No plays counted yet.');
