import { isNativePlatform } from './nativeShell';

export interface ExportBackupResult {
  method: 'download' | 'share';
  message: string;
}

export async function exportSanctuaryBackupFile(
  json: string,
  filename = 'selah-sanctuary-backup.json'
): Promise<ExportBackupResult> {
  if (isNativePlatform()) {
    const [{ Directory, Encoding, Filesystem }, { Share }] = await Promise.all([
      import('@capacitor/filesystem'),
      import('@capacitor/share'),
    ]);

    const { uri } = await Filesystem.writeFile({
      path: filename,
      data: json,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });

    await Share.share({
      title: 'Selah Reading Ledger Backup',
      text: 'Selah JSON backup file',
      url: uri,
      dialogTitle: 'Export Selah Backup',
    });

    return {
      method: 'share',
      message: 'Backup ready in share sheet.',
    };
  }

  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);

  return {
    method: 'download',
    message: 'Backup JSON downloaded.',
  };
}
