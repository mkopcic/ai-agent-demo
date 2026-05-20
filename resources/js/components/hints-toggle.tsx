import { Eye, EyeOff } from 'lucide-react';
import type { HTMLAttributes } from 'react';
import { useTranslation } from 'react-i18next';
import { useHints } from '@/hooks/use-hints';
import { cn } from '@/lib/utils';

export default function HintsToggle({
    className = '',
    ...props
}: HTMLAttributes<HTMLDivElement>) {
    const { t } = useTranslation();
    const { hintsEnabled, setHintsEnabled } = useHints();

    const tabs = [
        { value: true, icon: Eye, label: t('settings.show') },
        { value: false, icon: EyeOff, label: t('settings.hide') },
    ] as const;

    return (
        <div
            className={cn(
                'inline-flex gap-1 rounded-lg bg-muted p-1',
                className,
            )}
            {...props}
        >
            {tabs.map(({ value, icon: Icon, label }) => (
                <button
                    key={label}
                    onClick={() => setHintsEnabled(value)}
                    className={cn(
                        'flex items-center rounded-md px-3.5 py-1.5 transition-colors',
                        hintsEnabled === value
                            ? 'bg-background text-foreground shadow-xs'
                            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                    )}
                >
                    <Icon className="-ml-1 h-4 w-4" />
                    <span className="ml-1.5 text-sm">{label}</span>
                </button>
            ))}
        </div>
    );
}
