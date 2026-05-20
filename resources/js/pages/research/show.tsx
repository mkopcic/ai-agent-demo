import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    Download,
    ExternalLink,
    FileText,
    Globe,
    ImageIcon,
    Loader2,
    Save,
    Tag,
    Trash2,
    Upload,
} from 'lucide-react';
import { useRef, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useHints } from '@/hooks/use-hints';
import AppLayout from '@/layouts/app-layout';
import research from '@/routes/research';
import type { BreadcrumbItem } from '@/types';

interface ResearchItem {
    id: string;
    type: 'image' | 'document' | 'url';
    title: string;
    original_url: string | null;
    file_path: string | null;
    ai_summary: string | null;
    user_notes: string | null;
    metadata: {
        original_name?: string;
        mime_type?: string;
        size?: number;
        category?: string;
        fetch_failed?: boolean;
        fetch_error?: string;
    } | null;
    created_at: string;
    updated_at: string;
}

interface PageProps {
    [key: string]: unknown;
    item: ResearchItem;
    flash?: { success?: string };
}

const typeConfig = {
    image: {
        icon: ImageIcon,
        color: 'bg-violet-500/10 text-violet-500',
        labelKey: 'researchShow.image',
    },
    document: {
        icon: FileText,
        color: 'bg-blue-500/10 text-blue-500',
        labelKey: 'researchShow.document',
    },
    url: {
        icon: Globe,
        color: 'bg-emerald-500/10 text-emerald-500',
        labelKey: 'researchShow.url',
    },
};

export default function ResearchShow() {
    const { t } = useTranslation();
    const { item, flash } = usePage<PageProps>().props;
    const { hintsEnabled } = useHints();
    const config = typeConfig[item.type];
    const Icon = config.icon;

    const { data, setData, put, processing, errors } = useForm({
        title: item.title,
        user_notes: item.user_notes ?? '',
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('researchShow.breadcrumb'), href: research.index().url },
        { title: item.title, href: research.show(item.id).url },
    ];

    const [isDeleting, setIsDeleting] = useState(false);
    const fetchFailed = item.metadata?.fetch_failed === true;
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const replaceForm = useForm<{ file: File | null }>({ file: null });

    const handleFileDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) {
            replaceForm.setData('file', file);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            replaceForm.setData('file', file);
        }
    };

    const handleReplace = (e: React.FormEvent) => {
        e.preventDefault();
        if (!replaceForm.data.file) return;

        replaceForm.post(research.replace(item.id).url, {
            forceFormData: true,
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(research.update(item.id).url);
    };

    const handleDelete = () => {
        if (!confirm(t('researchShow.deleteConfirm'))) return;

        setIsDeleting(true);
        router.delete(research.destroy(item.id).url);
    };

    const formatFileSize = (bytes?: number) => {
        if (!bytes) return t('researchShow.unknownSize');
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={item.title} />

            <div className="p-6">
                {flash?.success && (
                    <div className="mb-6 rounded-lg border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-600 dark:text-green-400">
                        {flash.success}
                    </div>
                )}

                {/* Back link */}
                <Link
                    href={research.index().url}
                    className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                    <ArrowLeft className="size-4" />
                    {t('researchShow.backToLibrary')}
                </Link>

                <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
                    {/* Main Content */}
                    <div className="min-w-0 space-y-6">
                        {/* Header */}
                        <div className="flex items-start gap-4">
                            <div className="flex-1">
                                <div className="mb-2 flex items-center gap-3">
                                    <Badge
                                        variant="secondary"
                                        className={config.color}
                                    >
                                        <Icon className="mr-1 size-3" />
                                        {t(config.labelKey)}
                                    </Badge>
                                    {item.metadata?.category && (
                                        <Badge variant="outline" className="gap-1">
                                            <Tag className="size-3" />
                                            {item.metadata.category}
                                        </Badge>
                                    )}
                                    <time className="text-sm text-muted-foreground">
                                        {new Date(
                                            item.created_at,
                                        ).toLocaleDateString('hr-HR', {
                                            month: 'long',
                                            day: 'numeric',
                                            year: 'numeric',
                                        })}
                                    </time>
                                </div>
                                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                    {item.title}
                                </h1>
                            </div>
                        </div>

                        {/* Content area based on type */}
                        {item.type === 'image' && item.file_path && (
                            <div className="overflow-hidden rounded-xl border border-border/50 bg-muted/20">
                                <img
                                    src={research.serveFile(item.id).url}
                                    alt={item.title}
                                    className="w-full object-contain"
                                />
                            </div>
                        )}

                        {item.type === 'document' && (
                            <div className="flex items-center gap-4 rounded-xl border border-border/50 bg-muted/20 p-6">
                                <div className="flex size-14 items-center justify-center rounded-full bg-blue-500/10">
                                    <FileText className="size-7 text-blue-500" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-foreground">
                                        {item.metadata?.original_name ??
                                            t('researchShow.document')}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {formatFileSize(item.metadata?.size)}
                                    </p>
                                </div>
                                <a
                                    href={research.serveFile(item.id).url}
                                    download
                                    className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                                >
                                    <Download className="size-4" />
                                    {t('researchShow.download')}
                                </a>
                            </div>
                        )}

                        {item.type === 'url' && item.original_url && (
                            <div className="flex items-center gap-4 rounded-xl border border-border/50 bg-muted/20 p-6">
                                <div className="flex size-14 items-center justify-center rounded-full bg-emerald-500/10">
                                    <Globe className="size-7 text-emerald-500" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="font-medium text-foreground">
                                        {t('researchShow.originalUrl')}
                                    </p>
                                    <a
                                        href={item.original_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block truncate text-sm text-primary transition-colors hover:underline"
                                    >
                                        {item.original_url}
                                    </a>
                                </div>
                                <a
                                    href={item.original_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                                >
                                    <ExternalLink className="size-4" />
                                    {t('researchShow.visit')}
                                </a>
                            </div>
                        )}

                        {/* Fetch Failed State */}
                        {fetchFailed && (
                            <div className="rounded-xl border-2 border-amber-500/30 bg-amber-500/5 p-6">
                                <div className="flex items-start gap-4">
                                    <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-amber-500/15">
                                        <AlertTriangle className="size-6 text-amber-500" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-amber-700 dark:text-amber-400">
                                            {t('researchShow.fetchFailed')}
                                        </h2>
                                        <p className="mt-1 text-sm text-amber-600/80 dark:text-amber-400/60">
                                            {item.metadata?.fetch_error ??
                                                t('researchShow.fetchBlocked')}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-6 space-y-3">
                                    <p className="text-sm font-medium text-foreground">
                                        {t('researchShow.uploadAlternative')}
                                    </p>
                                    <form onSubmit={handleReplace} className="space-y-3">
                                        <div
                                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                            onDragLeave={() => setIsDragging(false)}
                                            onDrop={handleFileDrop}
                                            onClick={() => fileInputRef.current?.click()}
                                            className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 transition-colors ${
                                                isDragging
                                                    ? 'border-primary bg-primary/5'
                                                    : 'border-amber-500/20 bg-background/50 hover:border-amber-500/40 hover:bg-background/80'
                                            }`}
                                        >
                                            <Upload className="size-8 text-amber-500/60" />
                                            {replaceForm.data.file ? (
                                                <p className="text-sm font-medium text-foreground">
                                                    {replaceForm.data.file.name}
                                                </p>
                                            ) : (
                                                <>
                                                    <p className="text-sm font-medium text-foreground">
                                                        {t('researchShow.dropFile')}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {t('researchShow.fileHint')}
                                                    </p>
                                                </>
                                            )}
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                onChange={handleFileSelect}
                                                accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                                                className="hidden"
                                            />
                                        </div>
                                        {replaceForm.errors.file && (
                                            <p className="text-sm text-destructive">{replaceForm.errors.file}</p>
                                        )}
                                        {replaceForm.data.file && (
                                            <Button
                                                type="submit"
                                                disabled={replaceForm.processing}
                                                className="w-full"
                                            >
                                                {replaceForm.processing ? (
                                                    <>
                                                        <Loader2 className="size-4 animate-spin" />
                                                        {t('researchShow.uploading')}
                                                    </>
                                                ) : (
                                                    <>
                                                        <Upload className="size-4" />
                                                        {t('researchShow.uploadAnalyze')}
                                                    </>
                                                )}
                                            </Button>
                                        )}
                                    </form>
                                </div>
                            </div>
                        )}

                        {/* AI Summary */}
                        {!fetchFailed && (
                            <div className="rounded-xl border border-border/50 bg-card p-6">
                                <h2 className="mb-4 text-lg font-semibold text-foreground">
                                    {t('researchShow.aiSummary')}
                                </h2>
                                {item.ai_summary ? (
                                    <div className="prose prose-sm prose-invert max-w-none text-muted-foreground">
                                        <Markdown remarkPlugins={[remarkGfm]}>
                                            {item.ai_summary}
                                        </Markdown>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Loader2 className="size-4 animate-spin" />
                                        <span className="text-sm">
                                            {t('researchShow.analysisInProgress')}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Sidebar - Edit Form */}
                    <div className="lg:sticky lg:top-6 lg:self-start">
                        <form
                            onSubmit={handleSubmit}
                            className="space-y-6 rounded-2xl border border-border/50 bg-gradient-to-br from-card to-card/80 p-6 shadow-lg"
                        >
                            <h2 className="text-lg font-semibold text-foreground">
                                {t('researchShow.editDetails')}
                            </h2>

                            <div>
                                <label
                                    htmlFor="title"
                                    className="mb-2 block text-sm font-medium text-foreground"
                                >
                                    {t('researchShow.title')}
                                </label>
                                <input
                                    id="title"
                                    type="text"
                                    value={data.title}
                                    onChange={(e) =>
                                        setData('title', e.target.value)
                                    }
                                    maxLength={100}
                                    className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                                />
                                {errors.title && (
                                    <p className="mt-1.5 text-sm text-destructive">
                                        {errors.title}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label
                                    htmlFor="user_notes"
                                    className="mb-2 block text-sm font-medium text-foreground"
                                >
                                    {t('researchShow.notes')}
                                </label>
                                <textarea
                                    id="user_notes"
                                    placeholder={t(
                                        'researchShow.notesPlaceholder',
                                    )}
                                    value={data.user_notes}
                                    onChange={(e) =>
                                        setData('user_notes', e.target.value)
                                    }
                                    rows={6}
                                    className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                                />
                                {errors.user_notes && (
                                    <p className="mt-1.5 text-sm text-destructive">
                                        {errors.user_notes}
                                    </p>
                                )}
                                {hintsEnabled && (
                                    <p className="mt-1.5 text-xs text-muted-foreground">
                                        {t('researchShow.notesHint')}
                                    </p>
                                )}
                            </div>

                            <Button
                                type="submit"
                                disabled={processing}
                                className="w-full"
                            >
                                {processing ? (
                                    <>
                                        <Loader2 className="size-4 animate-spin" />
                                        {t('researchShow.saving')}
                                    </>
                                ) : (
                                    <>
                                        <Save className="size-4" />
                                        {t('researchShow.saveChanges')}
                                    </>
                                )}
                            </Button>

                            <div className="border-t border-border/50 pt-4">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    disabled={isDeleting}
                                    onClick={handleDelete}
                                    className="w-full text-muted-foreground hover:text-destructive"
                                >
                                    {isDeleting ? (
                                        <>
                                            <Loader2 className="size-4 animate-spin" />
                                            {t('researchShow.deleting')}
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 className="size-4" />
                                            {t('researchShow.deleteItem')}
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
