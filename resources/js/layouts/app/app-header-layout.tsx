import { AppContent } from '@/components/app-content';
import { AppHeader } from '@/components/app-header';
import { AppShell } from '@/components/app-shell';
import type { AppLayoutProps } from '@/types';
import { useTranslation } from 'react-i18next';

export default function AppHeaderLayout({
    children,
    breadcrumbs,
}: AppLayoutProps) {
    const { t } = useTranslation();

    return (
        <AppShell>
            <AppHeader breadcrumbs={breadcrumbs} />
            <AppContent>{children}</AppContent>
            <footer className="shrink-0 border-t border-border/50 px-6 py-4 text-center text-xs text-muted-foreground">
                {t('common.footer')} {t('common.github')}{' '}
                <a
                    className="font-medium underline underline-offset-4 hover:text-foreground"
                    href="https://github.com/mkopcic/laravel-ai-agent-demo"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    mkopcic/laravel-ai-agent-demo
                </a>
            </footer>
        </AppShell>
    );
}
