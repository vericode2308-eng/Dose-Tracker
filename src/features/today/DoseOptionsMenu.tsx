import type { DoseAction, ScheduledDose } from '@/database';
import { AppText } from '@/features/ui/AppText';
import { Button } from '@/features/ui/Button';
import { Sheet } from '@/features/ui/Sheet';

export function DoseOptionsMenu({ dose, onClose, onAction }: {
  dose: ScheduledDose; onClose: () => void; onAction: (dose: ScheduledDose, action: DoseAction) => void;
}) {
  const time = new Date(dose.scheduledAtMs).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return <Sheet visible title={dose.medicine.name} onClose={onClose}>
    <AppText variant="subhead" tone="secondary">{time} · {dose.status}</AppText>
    {(['Taken', 'Skipped', 'Reset'] as const).filter(action => action !== dose.status).map(action =>
      <Button key={action} variant={action === 'Reset' ? 'plain' : 'secondary'}
        icon={action === 'Taken' ? 'taken' : action === 'Skipped' ? 'skipped' : 'undo'}
        title={action === 'Reset' ? 'Reset to Pending' : `Mark as ${action}`}
        onPress={() => { onClose(); onAction(dose, action); }} />)}
  </Sheet>;
}
