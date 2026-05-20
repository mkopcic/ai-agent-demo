import { useForm } from '@inertiajs/react';
import { FileText, Globe, Loader2, MessageSquare, Upload, X } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useHints } from '@/hooks/use-hints';
import research from '@/routes/research';

type CaptureTab = 'files' | 'urls';

function isValidUrl(str: string): boolean {
    try {
        const url = new URL(str);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

export function CaptureForm() {
    const { t } = useTranslation();
    const { hintsEnabled } = useHints();
    const [activeTab, setActiveTab] = useState<CaptureTab>('files');
    const [isDragOver, setIsDragOver] = useState(false);
    const [expandedFileNotes, setExpandedFileNotes] = useState<Set<number>>(new Set());
    const [expandedUrlNotes, setExpandedUrlNotes] = useState<Set<number>>(new Set());
    const [urlInput, setUrlInput] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { data, setData, post, processing, reset, errors, clearErrors } =
        useForm<{
            files: File[];
            file_notes: string[];
            urls: string[];
            url_notes: string[];
        }>({
            files: [],
            file_notes: [],
            urls: [],
            url_notes: [],
        });

    const handleTabChange = (tab: CaptureTab) => {
        setActiveTab(tab);
        setData({ files: [], file_notes: [], urls: [], url_notes: [] });
        setExpandedFileNotes(new Set());
        setExpandedUrlNotes(new Set());
        setUrlInput('');
        clearErrors();
    };

    const addFiles = useCallback(
        (newFiles: FileList | File[]) => {
            const arr = Array.from(newFiles);
            const combined = [...data.files, ...arr].slice(0, 20);
            const notes = [...data.file_notes];
            while (notes.length < combined.length) {
                notes.push('');
            }
            setData((prev) => ({
                ...prev,
                files: combined,
                file_notes: notes.slice(0, combined.length),
            }));
        },
        [data.files, data.file_notes, setData],
    );

    const removeFile = useCallback(
        (index: number) => {
            setData((prev) => ({
                ...prev,
                files: prev.files.filter((_, i) => i !== index),
                file_notes: prev.file_notes.filter((_, i) => i !== index),
            }));
            setExpandedFileNotes((prev) => {
                const next = new Set<number>();
                prev.forEach((i) => {
                    if (i < index) next.add(i);
                    else if (i > index) next.add(i - 1);
                });
                return next;
            });
        },
        [setData],
    );

    const addUrls = useCallback(
        (raw: string) => {
            const parsed = raw
                .split(/[,\n\s]+/)
                .map((s) => s.trim())
                .filter((s) => s !== '' && isValidUrl(s));
            if (parsed.length === 0) return;
            const combined = [...data.urls, ...parsed].slice(0, 20);
            const notes = [...data.url_notes];
            while (notes.length < combined.length) {
                notes.push('');
            }
            setData((prev) => ({
                ...prev,
                urls: combined,
                url_notes: notes.slice(0, combined.length),
            }));
        },
        [data.urls, data.url_notes, setData],
    );

    const removeUrl = useCallback(
        (index: number) => {
            setData((prev) => ({
                ...prev,
                urls: prev.urls.filter((_, i) => i !== index),
                url_notes: prev.url_notes.filter((_, i) => i !== index),
            }));
            setExpandedUrlNotes((prev) => {
                const next = new Set<number>();
                prev.forEach((i) => {
                    if (i < index) next.add(i);
                    else if (i > index) next.add(i - 1);
                });
                return next;
            });
        },
        [setData],
    );

    const handleUrlPaste = useCallback(
        (e: React.ClipboardEvent<HTMLInputElement>) => {
            const pasted = e.clipboardData.getData('text');
            if (pasted.includes(',') || pasted.includes('\n') || pasted.split(/\s+/).filter(isValidUrl).length > 1) {
                e.preventDefault();
                addUrls(pasted);
                setUrlInput('');
            }
        },
        [addUrls],
    );

    const handleUrlKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (urlInput.trim()) {
                    addUrls(urlInput);
                    setUrlInput('');
                }
            }
        },
        [urlInput, addUrls],
    );

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragOver(false);
            if (e.dataTransfer.files.length > 0) {
                addFiles(e.dataTransfer.files);
            }
        },
        [addFiles],
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(research.bulkStore().url, {
            forceFormData: true,
            onSuccess: () => {
                reset();
                setExpandedFileNotes(new Set());
                setExpandedUrlNotes(new Set());
                setUrlInput('');
            },
        });
    };

    const itemCount = data.files.length + data.urls.length;

    const tabs = [
        { type: 'files' as const, label: t('research.files'), icon: Upload },
        { type: 'urls' as const, label: t('research.urls'), icon: Globe },
    ];

    const toggleFileNote = (index: number) => {
        setExpandedFileNotes((prev) => {
            const next = new Set(prev);
            if (next.has(index)) {
                next.delete(index);
            } else {
                next.add(index);
            }
            return next;
        });
    };

    const toggleUrlNote = (index: number) => {
        setExpandedUrlNotes((prev) => {
            const next = new Set(prev);
            if (next.has(index)) {
                next.delete(index);
            } else {
                next.add(index);
            }
            return next;
        });
    };

    return (
        <div className="overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card to-card/80 shadow-lg">
            {/* Tab Navigation */}
            <div className="flex border-b border-border/50 bg-muted/30">
                {tabs.map(({ type, label, icon: Icon }) => (
                    <button
                        key={type}
                        type="button"
                        onClick={() => handleTabChange(type)}
                        className={`flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all ${
                            activeTab === type
                                ? 'border-b-2 border-primary bg-background/50 text-foreground'
                                : 'text-muted-foreground hover:bg-background/30 hover:text-foreground'
                        }`}
                    >
                        <Icon className="size-4" />
                        {label}
                    </button>
                ))}
            </div>

            {/* Form Content */}
            <form onSubmit={handleSubmit} className="p-6">
                {activeTab === 'files' ? (
                    <>
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept="image/*,.pdf,.doc,.docx,.txt"
                            onChange={(e) => {
                                if (e.target.files) {
                                    addFiles(e.target.files);
                                }
                                e.target.value = '';
                            }}
                            className="hidden"
                        />
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={(e) => {
                                e.preventDefault();
                                setIsDragOver(true);
                            }}
                            onDragLeave={() => setIsDragOver(false)}
                            onDrop={handleDrop}
                            className={`flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-all ${
                                isDragOver
                                    ? 'border-primary bg-primary/5'
                                    : data.files.length > 0
                                      ? 'border-green-500/50 bg-green-500/5'
                                      : 'border-border/50 bg-muted/20 hover:border-primary/50 hover:bg-muted/30'
                            }`}
                        >
                            <div className="flex flex-col items-center gap-3 text-center">
                                <div className="flex size-14 items-center justify-center rounded-full bg-muted">
                                    <Upload className="size-7 text-muted-foreground" />
                                </div>
                                <div>
                                    <p className="font-medium text-foreground">
                                        {t('research.dropFiles')}
                                    </p>
                                    {hintsEnabled && (
                                        <p className="text-sm text-muted-foreground">
                                            {t('research.fileHint')}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* File list with per-item notes */}
                        {data.files.length > 0 && (
                            <div className="mt-3 space-y-1.5">
                                {data.files.map((file, index) => (
                                    <div key={`${file.name}-${index}`}>
                                        <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-sm">
                                            {file.type.startsWith('image/') ? (
                                                <Upload className="size-3.5 shrink-0 text-violet-500" />
                                            ) : (
                                                <FileText className="size-3.5 shrink-0 text-blue-500" />
                                            )}
                                            <span className="min-w-0 flex-1 truncate text-foreground">
                                                {file.name}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => toggleFileNote(index)}
                                                className={`shrink-0 rounded p-0.5 transition-colors ${
                                                    expandedFileNotes.has(index)
                                                        ? 'text-primary'
                                                        : 'text-muted-foreground hover:text-foreground'
                                                }`}
                                                title={t('research.addNote')}
                                            >
                                                <MessageSquare className="size-3.5" />
                                            </button>
                                            <span className="shrink-0 text-xs text-muted-foreground">
                                                {(file.size / 1024 / 1024).toFixed(1)}MB
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => removeFile(index)}
                                                className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:text-destructive"
                                            >
                                                <X className="size-3.5" />
                                            </button>
                                        </div>
                                        {expandedFileNotes.has(index) && (
                                            <input
                                                type="text"
                                                placeholder={t('research.addFileNote')}
                                                value={data.file_notes[index] ?? ''}
                                                onChange={(e) => {
                                                    const notes = [...data.file_notes];
                                                    notes[index] = e.target.value;
                                                    setData('file_notes', notes);
                                                }}
                                                className="mt-1 ml-6 w-[calc(100%-1.5rem)] rounded-md border border-border/50 bg-transparent px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="space-y-3">
                        <div className="relative">
                            <Globe className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder={t('research.urlPlaceholder')}
                                value={urlInput}
                                onChange={(e) => setUrlInput(e.target.value)}
                                onPaste={handleUrlPaste}
                                onKeyDown={handleUrlKeyDown}
                                className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex w-full rounded-md border bg-transparent py-2 pr-3 pl-10 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                            />
                        </div>
                        {hintsEnabled && (
                            <p className="text-xs text-muted-foreground">
                                {t('research.urlHint')}
                            </p>
                        )}

                        {/* Parsed URL list with per-item notes */}
                        {data.urls.length > 0 && (
                            <div className="space-y-1.5">
                                {data.urls.map((url, index) => (
                                    <div key={`${url}-${index}`}>
                                        <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-sm">
                                            <Globe className="size-3.5 shrink-0 text-emerald-500" />
                                            <span className="min-w-0 flex-1 truncate text-foreground">
                                                {url}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => toggleUrlNote(index)}
                                                className={`shrink-0 rounded p-0.5 transition-colors ${
                                                    expandedUrlNotes.has(index)
                                                        ? 'text-primary'
                                                        : 'text-muted-foreground hover:text-foreground'
                                                }`}
                                                title={t('research.addNote')}
                                            >
                                                <MessageSquare className="size-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => removeUrl(index)}
                                                className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:text-destructive"
                                            >
                                                <X className="size-3.5" />
                                            </button>
                                        </div>
                                        {expandedUrlNotes.has(index) && (
                                            <input
                                                type="text"
                                                placeholder={t('research.addUrlNote')}
                                                value={data.url_notes[index] ?? ''}
                                                onChange={(e) => {
                                                    const notes = [...data.url_notes];
                                                    notes[index] = e.target.value;
                                                    setData('url_notes', notes);
                                                }}
                                                className="mt-1 ml-6 w-[calc(100%-1.5rem)] rounded-md border border-border/50 bg-transparent px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {errors.files && (
                    <p className="mt-2 text-sm text-destructive">
                        {errors.files}
                    </p>
                )}
                {errors.urls && (
                    <p className="mt-2 text-sm text-destructive">
                        {errors.urls}
                    </p>
                )}

                <Button
                    type="submit"
                    disabled={processing || itemCount === 0}
                    className="mt-6 w-full"
                    size="lg"
                >
                    {processing ? (
                        <>
                            <Loader2 className="size-4 animate-spin" />
                            {t('research.analyzing')}
                        </>
                    ) : (
                        <>
                            <Upload className="size-4" />
                            {itemCount > 0
                                ? t('research.captureItems', { count: itemCount })
                                : t('research.captureAnalyze')}
                        </>
                    )}
                </Button>
            </form>
        </div>
    );
}
