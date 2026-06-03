import { Head } from '@inertiajs/react';
import { AlertCircle, AlertTriangle, Bug, ChevronDown, FileText, Info, Loader2, Search } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

interface LogFile {
    identifier: string;
    name: string;
    size_formatted: string;
    earliest_timestamp: string | null;
    latest_timestamp: string | null;
}

interface LogEntry {
    index: number;
    file_identifier: string;
    level: string;
    level_name: string;
    datetime: string | null;
    message: string;
    full_text?: string;
}

interface LevelCount {
    level: string;
    level_name: string;
    count: number;
}

interface Pagination {
    current_page: number;
    last_page: number;
    total: number;
}

const LEVEL_STYLES: Record<string, { bg: string; text: string; border: string }> = {
    emergency: { bg: 'bg-red-500/15', text: 'text-red-500', border: 'border-red-500/30' },
    critical: { bg: 'bg-red-500/15', text: 'text-red-500', border: 'border-red-500/30' },
    alert: { bg: 'bg-orange-500/15', text: 'text-orange-500', border: 'border-orange-500/30' },
    error: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-400/30' },
    warning: { bg: 'bg-yellow-500/15', text: 'text-yellow-500', border: 'border-yellow-500/30' },
    notice: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-400/30' },
    info: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-400/30' },
    debug: { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border/50' },
    processed: { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/30' },
};

function LevelBadge({ level }: { level: string }) {
    const style = LEVEL_STYLES[level] ?? LEVEL_STYLES.debug;
    return (
        <span
            className={`inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 text-xs font-medium uppercase ${style.bg} ${style.text} ${style.border}`}
        >
            {level}
        </span>
    );
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Logovi', href: '/logs' }];

export default function LogsIndex() {
    const [files, setFiles] = useState<LogFile[]>([]);
    const [selectedFile, setSelectedFile] = useState<string>('');
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [levelCounts, setLevelCounts] = useState<LevelCount[]>([]);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [expandedLog, setExpandedLog] = useState<string | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

    useEffect(() => {
        fetch('/api/logs/files')
            .then((res) => res.json())
            .then((data: { data: LogFile[] }) => {
                setFiles(data.data ?? []);
                if (data.data?.length > 0) {
                    setSelectedFile(data.data[0].identifier);
                }
            })
            .catch(() => {});
    }, []);

    const loadLogs = useCallback((file: string, q: string, p: number) => {
        if (!file) {
            return;
        }
        setLoading(true);
        const params = new URLSearchParams({
            file,
            query: q,
            per_page: '25',
            page: String(p),
        });
        fetch(`/api/logs/entries?${params}`)
            .then((res) => res.json())
            .then((data) => {
                setLogs(data.logs?.data ?? []);
                setLevelCounts(data.levelCounts ?? []);
                setPagination(data.pagination ?? null);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (!selectedFile) {
            return;
        }
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }
        debounceRef.current = setTimeout(() => {
            loadLogs(selectedFile, search, page);
        }, 300);
        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [selectedFile, search, page, loadLogs]);

    const handleFileSelect = (identifier: string) => {
        setSelectedFile(identifier);
        setPage(1);
        setSearch('');
        setExpandedLog(null);
    };

    const toggleLog = (key: string) => {
        setExpandedLog((prev) => (prev === key ? null : key));
    };

    const totalErrors = levelCounts
        .filter((l) => ['emergency', 'critical', 'alert', 'error'].includes(l.level))
        .reduce((sum, l) => sum + l.count, 0);
    const totalWarnings = levelCounts.find((l) => l.level === 'warning')?.count ?? 0;
    const totalInfo = levelCounts
        .filter((l) => ['info', 'notice'].includes(l.level))
        .reduce((sum, l) => sum + l.count, 0);
    const totalDebug = levelCounts.find((l) => l.level === 'debug')?.count ?? 0;

    const statItems = [
        { label: 'Greške', value: totalErrors, icon: AlertCircle, level: 'error' },
        { label: 'Upozorenja', value: totalWarnings, icon: AlertTriangle, level: 'warning' },
        { label: 'Info', value: totalInfo, icon: Info, level: 'info' },
        { label: 'Debug', value: totalDebug, icon: Bug, level: 'debug' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Logovi" />

            <div className="p-6">
                <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
                    {/* Main Content */}
                    <div>
                        <div className="mb-6">
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">Pregled logova</h1>
                            <p className="mt-1 text-muted-foreground">
                                Pregledaj aplikacijske logove i prati greške i upozorenja.
                            </p>
                        </div>

                        {/* Stats */}
                        <Collapsible className="mb-6">
                            <CollapsibleTrigger className="group flex w-full items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                                <ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180" />
                                <span>Statistika logova</span>
                                {pagination && (
                                    <span className="text-xs text-muted-foreground/60">{pagination.total} zapisa</span>
                                )}
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                                    {statItems.map(({ label, value, icon: Icon, level }) => {
                                        const style = LEVEL_STYLES[level] ?? LEVEL_STYLES.debug;
                                        return (
                                            <div key={label} className="rounded-xl border border-border/50 bg-card/50 p-4">
                                                <div className="flex items-center gap-2">
                                                    <Icon className={`size-4 ${style.text}`} />
                                                    <span className="text-sm text-muted-foreground">{label}</span>
                                                </div>
                                                <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CollapsibleContent>
                        </Collapsible>

                        {/* Search */}
                        <div className="relative mb-4">
                            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                placeholder="Pretraži logove..."
                                className="w-full rounded-lg border border-border/50 bg-card/50 py-2.5 pr-4 pl-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                            />
                        </div>

                        {/* Log Entries */}
                        {loading ? (
                            <div className="flex items-center justify-center py-16">
                                <Loader2 className="size-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : logs.length > 0 ? (
                            <div>
                                <div className="overflow-hidden rounded-xl border border-border/50 bg-card/50">
                                    {logs.map((log) => {
                                        const key = `${log.file_identifier}-${log.index}`;
                                        const isExpanded = expandedLog === key;
                                        return (
                                            <div
                                                key={key}
                                                className="cursor-pointer border-b border-border/40 px-3 py-2 last:border-0 transition-colors hover:bg-muted/30"
                                                onClick={() => toggleLog(key)}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <LevelBadge level={log.level} />
                                                    <p className="min-w-0 flex-1 truncate text-xs text-foreground">
                                                        {log.message}
                                                    </p>
                                                    {log.datetime && (
                                                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground/60">
                                                            {log.datetime.split(' ')[1]}
                                                        </span>
                                                    )}
                                                </div>
                                                {isExpanded && log.full_text && (
                                                    <pre className="mt-2 overflow-x-auto rounded-md bg-muted/50 p-2 text-xs whitespace-pre-wrap break-all text-muted-foreground">
                                                        {log.full_text}
                                                    </pre>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {pagination && pagination.last_page > 1 && (
                                    <nav className="mt-6 flex items-center justify-center gap-2">
                                        <button
                                            type="button"
                                            disabled={page <= 1}
                                            onClick={() => setPage((p) => p - 1)}
                                            className="inline-flex h-9 items-center justify-center rounded-md px-3 text-sm bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                                        >
                                            ← Prethodna
                                        </button>
                                        <span className="text-sm text-muted-foreground">
                                            {pagination.current_page} / {pagination.last_page}
                                        </span>
                                        <button
                                            type="button"
                                            disabled={page >= pagination.last_page}
                                            onClick={() => setPage((p) => p + 1)}
                                            className="inline-flex h-9 items-center justify-center rounded-md px-3 text-sm bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                                        >
                                            Sljedeća →
                                        </button>
                                    </nav>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 bg-muted/20 py-16 text-center">
                                <div className="flex size-14 items-center justify-center rounded-full bg-muted">
                                    <FileText className="size-7 text-muted-foreground" />
                                </div>
                                <h3 className="mt-4 text-lg font-semibold text-foreground">
                                    {selectedFile ? 'Nema log zapisa' : 'Odaberi log datoteku'}
                                </h3>
                                <p className="mt-1 max-w-sm text-muted-foreground">
                                    {selectedFile
                                        ? search
                                            ? 'Nema rezultata za traženi pojam.'
                                            : 'Log datoteka je prazna.'
                                        : 'Odaberi log datoteku s desne strane.'}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="lg:sticky lg:top-6 lg:self-start">
                        <h2 className="mb-4 text-lg font-semibold text-foreground">Log datoteke</h2>

                        <div className="rounded-xl border border-border/50 bg-card/50">
                            {files.length === 0 ? (
                                <div className="p-6 text-center text-sm text-muted-foreground">Nema log datoteka</div>
                            ) : (
                                <div className="divide-y divide-border/50">
                                    {files.map((file) => (
                                        <button
                                            key={file.identifier}
                                            type="button"
                                            onClick={() => handleFileSelect(file.identifier)}
                                            className={`w-full px-4 py-3 text-left transition-colors first:rounded-t-xl last:rounded-b-xl hover:bg-muted/50 ${
                                                selectedFile === file.identifier ? 'bg-muted/50' : ''
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex min-w-0 items-center gap-2">
                                                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                                                    <span className="truncate text-sm font-medium text-foreground">
                                                        {file.name}
                                                    </span>
                                                </div>
                                                <span className="shrink-0 text-xs text-muted-foreground">
                                                    {file.size_formatted}
                                                </span>
                                            </div>
                                            {file.latest_timestamp && (
                                                <p className="mt-0.5 pl-6 text-xs text-muted-foreground">
                                                    {file.latest_timestamp}
                                                </p>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {levelCounts.filter((l) => l.count > 0).length > 0 && (
                            <div className="mt-4">
                                <h3 className="mb-2 text-sm font-medium text-muted-foreground">Razine logova</h3>
                                <div className="flex flex-wrap gap-2">
                                    {levelCounts
                                        .filter((l) => l.count > 0)
                                        .map((level) => {
                                            const style = LEVEL_STYLES[level.level] ?? LEVEL_STYLES.debug;
                                            return (
                                                <div
                                                    key={level.level}
                                                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${style.bg} ${style.text} ${style.border}`}
                                                >
                                                    <span className="uppercase">{level.level}</span>
                                                    <span className="opacity-70">{level.count}</span>
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
