import { accessSync, constants, existsSync, lstatSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { readDirectoryCa } from '../config/directory-ca';
import { env } from '../config/environment';
try {
  const data = realpathSync(dirname(resolve(env.DATABASE_URL)));
  const backups = realpathSync(env.BACKUP_DIRECTORY);
  accessSync(data, constants.W_OK); accessSync(backups, constants.W_OK);
  if (existsSync(env.DATABASE_URL) && (!lstatSync(env.DATABASE_URL).isFile() || lstatSync(env.DATABASE_URL).isSymbolicLink())) throw new Error();
  if (env.NODE_ENV === 'production') {
    if ([data,backups].some(path=>(statSync(path).mode & 0o077)!==0)) throw new Error();
    const mounts = readFileSync('/proc/self/mountinfo', 'utf8').split('\n').map(line => line.split(' ')[4]?.replace(/\\040/g, ' '));
    const dataLine = readFileSync('/proc/self/mountinfo', 'utf8').split('\n').find(line=>line.split(' ')[4]===data);
    const filesystem = dataLine?.split(' - ')[1]?.split(' ')[0];
    if (!filesystem || /^(?:tmpfs|ramfs|overlay|nfs|nfs4|cifs|smb3|9p|ceph|glusterfs|fuse)/.test(filesystem)) throw new Error();
    if (data !== '/data' || backups !== '/backups' || !mounts.includes(data) || !mounts.includes(backups)) throw new Error();
  }
  if (env.AUTH_PROVIDER === 'ldap') readDirectoryCa(env.AD_CA_CERT_PATH);
} catch { console.error('Preflight fallido: exige volúmenes locales /data y /backups privados/escribibles, base regular y CA LDAP legible válida'); process.exitCode = 1; }
