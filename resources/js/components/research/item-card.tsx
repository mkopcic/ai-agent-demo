import { Link, router } from '@inertiajs/react';
import { AlertTriangle, FileText, Globe, ImageIcon, Loader2, Tag, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import research from '@/routes/research';

interface ResearchItem {
    id: string;
    type: 'image' | 'document' | 'url';
    title: string;
    original_url: string | null;
    ai_summary: string | null;
    metadata?: { category?: string; fetch_failed?: boolean; fetch_error?: string } | null;
    created_at: string;
}

interface ItemCardProps {
    item: ResearchItem;
}

export function ItemCard({ item }: ItemCardProps) {
    const { t, i18n } = useTranslation();
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm(t('research.deleteConfirm'))) return;

        setIsDeleting(true);
        router.delete(research.destroy(item.id).url, {
            preserveScroll: true,
            onFinish: () => setIsDeleting(false),
        });
    };

    const Icon = {
        image: ImageIcon,
        document: FileText,
        url: Globe,
    }[item.type];

    const typeColors = {
        image: 'bg-violet-500/10 text-violet-500 dark:bg-violet-500/20',
        document: 'bg-blue-500/10 text-blue-500 dark:bg-blue-500/20',
        url: 'bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20',
    };

    const fetchFailed = item.metadata?.fetch_failed === true;
    const isProcessing = !item.ai_summary && !fetchFailed;
    const category = item.metadata?.category;
    const typeLabels = {
        image: t('research.image'),
        document: t('research.document'),
        url: t('research.url'),
    };

    return (
        <Link
            href={research.show(item.id).url}
            className="group relative block overflow-hidden rounded-xl border border-border/50 bg-card transition-all hover:border-border hover:shadow-md"
        >
            {/* Type Badge */}
            <div className="absolute top-3 right-3 z-10">
                <div
                    className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${typeColors[item.type]}`}
                >
                    <Icon className="size-3" />
                    <span>{typeLabels[item.type]}</span>
                </div>
            </div>

            {/* Content */}
            <div className="p-5">
                <h3 className="line-clamp-2 pr-20 text-base leading-tight font-semibold text-foreground">
                    {item.title}
                </h3>

                <div className="mt-3 min-h-[60px]">
                    {fetchFailed ? (
                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="size-4 shrink-0" />
                            <span className="text-sm">
                                {t('research.fetchFailed')}
                            </span>
                        </div>
                    ) : isProcessing ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="size-4 animate-spin" />
                            <span className="text-sm">
                                {t('research.analyzingContent')}
                            </span>
                        </div>
                    ) : (
                        <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                            {item.ai_summary?.replace(/[#*_~`>[\]()!|-]/g, '')}
                        </p>
                    )}
                </div>

                {/* Footer */}
                <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-4">
                    <div className="flex items-center gap-2">
                        <time className="text-xs text-muted-foreground">
                            {new Date(item.created_at).toLocaleDateString(i18n.language, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                            })}
                        </time>
                        {category && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                                <Tag className="size-2.5" />
                                {category}
                            </span>
                        )}
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="h-8 px-2 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                    >
                        {isDeleting ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : (
                            <Trash2 className="size-4" />
                        )}
                    </Button>
                </div>
            </div>

            {/* Subtle gradient overlay for depth */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        </Link>
    );
}
