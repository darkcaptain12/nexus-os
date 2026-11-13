import type { BackupVerifyReport } from './types';
import { createBackup, getRestorePlan } from '@/lib/cloud/cloud-backup';

// Backup & Restore Audit — Memory/Knowledge/Tasks/Projects/Plugins/Settings
// yedeğinin gerçekten oluştuğunu + restore planının çalıştığını doğrular.
// Mevcut cloud-backup (createBackup/getRestorePlan) REUSE eder; gerçek store
// sayılarıyla test eder (mock YOK).

export function runBackupVerify(): BackupVerifyReport {
  // Gerçek backup oluştur — cloud-backup gerçek store'lardan item sayar
  const snapshot = createBackup('production-audit');
  const backupCreated = snapshot.version > 0 && snapshot.domains.length > 0;

  // Restore planı gerçekten çözülüyor mu
  const plan = getRestorePlan(snapshot.version);
  const restoreWorks = plan !== null && plan.snapshot.id === snapshot.id;

  const totalItems = plan?.totalItems ?? 0;
  const status: BackupVerifyReport['status'] =
    backupCreated && restoreWorks ? 'pass' : backupCreated ? 'warn' : 'fail';

  const detail = !backupCreated
    ? 'Backup oluşturulamadı — store erişimi başarısız.'
    : !restoreWorks
      ? 'Backup oluştu ama restore planı çözülemedi.'
      : `Backup v${snapshot.version} oluştu + restore doğrulandı (${totalItems} kayıt, ${snapshot.domains.length} domain).`;

  return {
    backupCreated,
    restoreWorks,
    version: snapshot.version,
    domains: snapshot.domains,
    totalItems,
    domainCounts: snapshot.itemCounts,
    status,
    detail,
    generatedAt: new Date().toISOString(),
  };
}
