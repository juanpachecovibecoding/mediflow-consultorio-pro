import { proto, BufferJSON } from '@whiskeysockets/baileys';
import { prisma } from './db.js';

/**
 * Adaptador de autenticación Baileys para PostgreSQL (Supabase / Render).
 * Almacena las claves criptográficas y credenciales de sesión en la tabla WhatsAppSession
 * utilizando BufferJSON oficial para evitar corrupción de llaves de cifrado (Bad MAC).
 */
export async function usePrismaAuthState(sessionId = 'default') {
  const writeData = async (type: string, id: string, data: any) => {
    const key = `${sessionId}:${type}:${id}`;
    const serialized = JSON.stringify(data, BufferJSON.replacer);

    await prisma.whatsAppSession.upsert({
      where: { id: key },
      create: { id: key, data: serialized },
      update: { data: serialized }
    });
  };

  const readData = async (type: string, id: string): Promise<any | null> => {
    const key = `${sessionId}:${type}:${id}`;
    try {
      const record = await prisma.whatsAppSession.findUnique({
        where: { id: key }
      });
      if (!record) return null;

      return JSON.parse(record.data, BufferJSON.reviver);
    } catch (e) {
      return null;
    }
  };

  const removeData = async (type: string, id: string) => {
    const key = `${sessionId}:${type}:${id}`;
    try {
      await prisma.whatsAppSession.delete({
        where: { id: key }
      });
    } catch (e) {
      // Ignorar si no existe
    }
  };

  // Leer credenciales iniciales
  let creds = await readData('creds', 'creds');
  if (!creds) {
    const { initAuthCreds } = await import('@whiskeysockets/baileys');
    creds = initAuthCreds();
    await writeData('creds', 'creds', creds);
  }

  return {
    state: {
      creds,
      keys: {
        get: async (type: string, ids: string[]) => {
          const data: { [key: string]: any } = {};
          await Promise.all(
            ids.map(async (id) => {
              let value = await readData(type, id);
              if (type === 'app-state-sync-key' && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value);
              }
              data[id] = value;
            })
          );
          return data;
        },
        set: async (data: any) => {
          const tasks: Promise<any>[] = [];
          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id];
              if (value) {
                tasks.push(writeData(category, id, value));
              } else {
                tasks.push(removeData(category, id));
              }
            }
          }
          await Promise.all(tasks);
        }
      }
    },
    saveCreds: () => writeData('creds', 'creds', creds)
  };
}
