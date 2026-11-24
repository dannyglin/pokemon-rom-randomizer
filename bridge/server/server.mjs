import http from 'node:http';
import { spawn } from 'node:child_process';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdtemp, mkdir, readdir, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const jar = join(root, 'engine', 'PokeRandoZX.jar');
const webRoot = join(root, 'site');
const port = Number(process.env.PORT || 4769);
const allowedOrigin = process.env.SITE_ORIGIN || 'https://dannyglin.github.io';
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.svg':'image/svg+xml', '.webp':'image/webp' };

function send(res, status, body, type='application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control':'no-store' }); res.end(typeof body === 'string' ? body : JSON.stringify(body));
}
function run(cmd, args, cwd) {
  return new Promise((ok, fail) => {
    const p = spawn(cmd, args, { cwd, stdio:['ignore','ignore','pipe'] }); let err='';
    p.stderr.on('data', d => err += d.toString()); p.on('error', fail);
    p.on('close', code => code === 0 ? ok() : fail(new Error(err || `${cmd} exited ${code}`)));
  });
}
const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  if (origin && origin !== allowedOrigin && !/^http:\/\/127\.0\.0\.1(?::\d+)?$/.test(origin) && !/^http:\/\/localhost(?::\d+)?$/.test(origin)) return send(res, 403, {error:'This page is not allowed to use the local randomizer.'});
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-File-Name');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
  }
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === '/api/status' && req.method === 'GET') return send(res, 200, {ready:true, engine:'Universal Pokemon Randomizer ZX', formats:['.gba','.nds','.3ds']});
  if (url.pathname === '/api/randomize' && req.method === 'POST') {
    const name = decodeURIComponent(req.headers['x-file-name'] || 'pokemon-rom');
    const ext = extname(name).toLowerCase();
    if (!['.gba','.nds','.3ds'].includes(ext)) { req.resume(); return send(res, 400, {error:'Choose a .gba, .nds, or .3ds ROM.'}); }
    const work = await mkdtemp(join(tmpdir(), 'pocket-rando-'));
    try {
      const input = join(work, 'input' + ext); await pipeline(req, createWriteStream(input));
      const info = await stat(input); if (!info.size) throw new Error('The selected file is empty.');
      const settings = join(work, 'rules.rnqs');
      const flags = ['starters','evolutions','trainers','wild','staticPokemon','items'].map(k => url.searchParams.get(k) === 'true' ? 'true':'false');
      await run('java', ['-cp', `${jar}:${join(root,'server')}`, 'SettingsWriter', settings, ...flags], root);
      const output = join(work, ext === '.3ds' ? 'randomized-layeredfs' : `randomized${ext}`);
      const args = ['-jar', jar, 'cli', '-s', settings, '-i', input, '-o', output];
      if (ext === '.3ds') args.push('-d');
      await run('java', args, root);
      let deliver = output, downloadName = basename(name, ext) + '-randomized' + ext;
      if (ext === '.3ds') {
        const zip = join(work, basename(name, ext) + '-randomized-layeredfs.zip');
        await run('zip', ['-qr', zip, basename(output)], work); deliver = zip; downloadName = basename(zip);
      }
      res.writeHead(200, { 'Content-Type':'application/octet-stream', 'Content-Disposition':`attachment; filename="${downloadName.replaceAll('"','')}"`, 'Content-Length':String((await stat(deliver)).size), 'Cache-Control':'no-store' });
      await pipeline(createReadStream(deliver), res);
    } catch (e) { if (!res.headersSent) send(res, 500, {error: e.message || 'Randomization failed. Check that the ROM is supported.'}); else res.destroy(e); }
    finally { await rm(work, {recursive:true,force:true}); }
    return;
  }
  const path = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
  const file = resolve(webRoot, '.' + path);
  if (!file.startsWith(webRoot + '/') && file !== webRoot) return send(res, 403, 'Forbidden', 'text/plain');
  try { const s=await stat(file); if (!s.isFile()) throw new Error(); res.writeHead(200, {'Content-Type':mime[extname(file)]||'application/octet-stream'}); if (file === join(webRoot,'index.html')) { const html=(await readFile(file,'utf8')).replace(/<div class="engine-help">[\s\S]*?<\/div>/,''); res.end(html); } else createReadStream(file).pipe(res); }
  catch { send(res,404,'Not found','text/plain; charset=utf-8'); }
});
server.listen(port, '127.0.0.1', () => console.log(`Pocket Randomizer is ready at http://127.0.0.1:${port}`));
