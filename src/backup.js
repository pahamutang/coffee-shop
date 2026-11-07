import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export const isNative = () => {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
};

// Browser: downloads a file. Android app: opens the share sheet so you can save it to Drive/Files/WhatsApp, etc.
export async function saveBackup(text, filename) {
  if (isNative()) {
    const r = await Filesystem.writeFile({ path: filename, data: text, directory: Directory.Cache, encoding: Encoding.UTF8 });
    await Share.share({ title: 'Quick Coffee POS backup', url: r.uri, dialogTitle: 'Save your backup' });
    return;
  }
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
