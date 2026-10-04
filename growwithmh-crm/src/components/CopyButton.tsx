import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { copyText } from '@/lib/utils';
import { useToast } from '@/components/overlays';
import { Button } from '@/components/ui';

export function CopyButton({ value, label, disabled }: { value: string | null | undefined; label: string; disabled?: boolean }) {
  const toast = useToast();
  const [done, setDone] = useState(false);
  return (
    <Button
      size="sm"
      disabled={disabled || !value}
      onClick={async () => {
        if (!value) return;
        if (await copyText(value)) {
          setDone(true);
          toast.success(`${label.replace(/^Copy /, '')} copied`);
          window.setTimeout(() => setDone(false), 1500);
        } else toast.error('Could not copy — select and copy it manually.');
      }}
    >
      {done ? <Check className="size-3.5 text-pos" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
      {label}
    </Button>
  );
}
