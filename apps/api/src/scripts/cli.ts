import { createInterface } from 'node:readline/promises';

export async function readSecret(prompt: string) {
  if (!process.stdin.isTTY) {
    let data = '';
    for await (const chunk of process.stdin) { data += String(chunk); if (data.length > 4096) throw new Error('Entrada demasiado larga'); }
    return data.replace(/\r?\n$/, '');
  }
  process.stdout.write(prompt); process.stdin.setRawMode(true); process.stdin.resume(); process.stdin.setEncoding('utf8');
  return new Promise<string>((resolve, reject) => {
    let value = '';
    const onData = (chunk: string) => {
      for (const c of chunk) {
        if (c === '\u0003') { finish(); reject(new Error('Cancelado')); return; }
        if (c === '\n' || c === '\r') { finish(); resolve(value); return; }
        if (c === '\u007f' || c === '\b') value = [...value].slice(0, -1).join('');
        else if (value.length < 1024 && c >= ' ') value += c;
      }
    };
    function finish() { process.stdin.off('data', onData); process.stdin.setRawMode(false); process.stdin.pause(); process.stdout.write('\n'); }
    process.stdin.on('data', onData);
  });
}
export async function confirmIdentity(username: string, supplied?: string) {
  if (supplied !== undefined) { if (supplied !== username) throw new Error('--confirm debe coincidir exactamente con el usuario mostrado'); return; }
  if (!process.stdin.isTTY) throw new Error('Requiere consola interactiva o --confirm con el username exacto');
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try { if (await rl.question(`Escribe ${username} para confirmar: `) !== username) throw new Error('Cancelado'); } finally { rl.close(); }
}
