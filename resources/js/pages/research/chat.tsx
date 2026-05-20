import { Head, Link, router, usePage } from '@inertiajs/react';
import { useStream } from '@laravel/stream-react';
import {
    Bot,
    Check,
    ChevronRight,
    ExternalLink,
    Globe,
    Loader2,
    MessageSquare,
    Plus,
    Search,
    Send,
    Sparkles,
    Trash2,
    User,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTranslation } from 'react-i18next';
import TitleGenerator from '@/components/chat/title-generator';
import {
    FeatureBadge,
    FeatureBadgeGroup,
} from '@/components/demo/feature-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useHints } from '@/hooks/use-hints';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import research from '@/routes/research';

// --- Types ---

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    tool_calls: string;
    created_at: string;
}

interface Conversation {
    id: string;
    title: string | null;
    created_at: string;
    updated_at: string;
}

interface PageProps {
    [key: string]: unknown;
    conversations: Conversation[];
    currentConversation: Conversation | null;
    messages: Message[];
    fileMap: Record<string, string>;
    flash?: { success?: string };
}

interface ToolActivity {
    id: string;
    name: string;
    status: 'searching' | 'complete' | 'error';
    result?: string;
}

interface Citation {
    title: string;
    url: string;
    itemId?: string;
}

interface ParsedStream {
    text: string;
    tools: ToolActivity[];
    citations: Citation[];
}

// --- Tool metadata ---

const toolMeta: Record<string, { icon: typeof Search; labelKey: string }> = {
    file_search: { icon: Search, labelKey: 'chat.knowledgeBase' },
    web_search: { icon: Globe, labelKey: 'chat.webSearch' },
};

// --- Citation marker cleanup ---
// OpenAI wraps inline citations with Unicode Private Use Area characters:
// \ue200 (start) + filecite + \ue202 (separator) + turnXfileY refs + \ue201 (end)
// The SDK's citation stream events are currently disabled, so we strip markers
// and rely on the article titles/sources already present in the text.

function stripCitationMarkers(text: string): string {
    return text
        .replace(/\ue200[^\ue201]*\ue201/g, '') // PUA-wrapped: \ue200filecite...\ue201
        .replace(/\u3010\d+[:\u2020][^\u3011]*\u3011/g, '') // 【4:0†source】
        .replace(/filecite(?:\ue202?turn\d+file\d+)+/g, '') // Fallback plain text markers
        .replace(/ {2,}/g, ' ')
        .trim();
}

// --- SSE Parser ---

function parseStreamEvents(
    raw: string,
    fileMap?: Record<string, string>,
    researchItemLabel = 'Research item',
): ParsedStream {
    let text = '';
    const toolMap = new Map<string, ToolActivity>();
    const citations: Citation[] = [];

    for (const line of raw.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const json = line.slice(6);
        if (json === '[DONE]') continue;
        try {
            const event = JSON.parse(json);
            switch (event.type) {
                case 'text_delta':
                    if (event.delta) text += event.delta;
                    break;

                case 'tool_call':
                    if (event.tool_name) {
                        toolMap.set(event.tool_id ?? event.tool_name, {
                            id: event.tool_id ?? event.tool_name,
                            name: event.tool_name,
                            status: 'searching',
                        });
                    }
                    break;

                case 'tool_result':
                    if (event.tool_id && toolMap.has(event.tool_id)) {
                        const tool = toolMap.get(event.tool_id)!;
                        tool.status = event.successful ? 'complete' : 'error';
                        tool.result =
                            typeof event.result === 'string'
                                ? event.result
                                : JSON.stringify(event.result);
                    }
                    break;

                case 'citation':
                    if (event.citation?.url) {
                        const exists = citations.some(
                            (c) => c.url === event.citation.url,
                        );
                        if (!exists) {
                            citations.push({
                                title:
                                    event.citation.title || event.citation.url,
                                url: event.citation.url,
                            });
                        }
                    } else if (event.citation?.file_id && fileMap) {
                        const itemId = fileMap[event.citation.file_id];
                        if (
                            itemId &&
                            !citations.some((c) => c.itemId === itemId)
                        ) {
                            citations.push({
                                title:
                                    event.citation.filename ||
                                    researchItemLabel,
                                url: `/research/${itemId}`,
                                itemId,
                            });
                        }
                    }
                    break;

                default:
                    // ProviderToolEvents like file_search_call, web_search_call
                    if (event.type?.includes('file_search')) {
                        const id = event.item_id ?? 'file_search';
                        if (!toolMap.has(id)) {
                            toolMap.set(id, {
                                id,
                                name: 'file_search',
                                status:
                                    event.status === 'completed'
                                        ? 'complete'
                                        : 'searching',
                            });
                        } else if (event.status === 'completed') {
                            toolMap.get(id)!.status = 'complete';
                        }
                    } else if (event.type?.includes('web_search')) {
                        const id = event.item_id ?? 'web_search';
                        if (!toolMap.has(id)) {
                            toolMap.set(id, {
                                id,
                                name: 'web_search',
                                status:
                                    event.status === 'completed'
                                        ? 'complete'
                                        : 'searching',
                            });
                        } else if (event.status === 'completed') {
                            toolMap.get(id)!.status = 'complete';
                        }
                    }
                    break;
            }
        } catch {
            // Incomplete JSON chunk — will be complete on next update
        }
    }

    return {
        text: stripCitationMarkers(text),
        tools: Array.from(toolMap.values()),
        citations,
    };
}

function parseToolCalls(toolCallsJson: string): ToolActivity[] {
    try {
        const parsed = JSON.parse(toolCallsJson || '[]');
        return parsed
            .filter((tc: { name?: string }) => tc.name)
            .map((tc: { name: string }, i: number) => ({
                id: `saved-${i}`,
                name: tc.name,
                status: 'complete' as const,
            }));
    } catch {
        return [];
    }
}

// --- Components ---

function ToolCallCard({
    tool,
    isLive,
}: {
    tool: ToolActivity;
    isLive?: boolean;
}) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const meta = toolMeta[tool.name] ?? {
        icon: Search,
        labelKey: tool.name,
    };
    const Icon = meta.icon;
    const isSearching = tool.status === 'searching';
    const hasResult = tool.result && tool.result.length > 0;

    return (
        <Collapsible open={open} onOpenChange={setOpen}>
            <CollapsibleTrigger asChild>
                <button
                    type="button"
                    className="group flex w-full items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50"
                >
                    <div
                        className={cn(
                            'flex size-6 shrink-0 items-center justify-center rounded-md',
                            isSearching && isLive
                                ? 'bg-violet-500/15 text-violet-500'
                                : 'bg-emerald-500/15 text-emerald-500',
                        )}
                    >
                        {isSearching && isLive ? (
                            <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                            <Icon className="size-3.5" />
                        )}
                    </div>

                    <span className="flex-1 font-medium text-foreground/80">
                        {meta.labelKey.startsWith('chat.')
                            ? t(meta.labelKey)
                            : meta.labelKey}
                    </span>

                    <Badge
                        variant={
                            isSearching && isLive ? 'secondary' : 'outline'
                        }
                        className={cn(
                            'text-[10px] font-normal',
                            isSearching &&
                                isLive &&
                                'animate-pulse border-transparent',
                            !isSearching &&
                                'border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
                        )}
                    >
                        {isSearching && isLive ? (
                            t('chat.searching')
                        ) : (
                            <>
                                <Check className="size-2.5" /> {t('chat.done')}
                            </>
                        )}
                    </Badge>

                    {hasResult && (
                        <ChevronRight
                            className={cn(
                                'size-3.5 text-muted-foreground transition-transform',
                                open && 'rotate-90',
                            )}
                        />
                    )}
                </button>
            </CollapsibleTrigger>

            {hasResult && (
                <CollapsibleContent>
                    <div className="mt-1 rounded-lg border border-border/30 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                        <pre className="max-h-32 overflow-auto font-mono whitespace-pre-wrap">
                            {tool.result!.length > 500
                                ? tool.result!.slice(0, 500) + '...'
                                : tool.result}
                        </pre>
                    </div>
                </CollapsibleContent>
            )}
        </Collapsible>
    );
}

function CitationList({ citations }: { citations: Citation[] }) {
    if (citations.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-1.5 pt-1">
            {citations.map((citation) =>
                citation.itemId ? (
                    <Link
                        key={citation.url}
                        href={citation.url}
                        className="inline-flex items-center gap-1 rounded-md border border-violet-500/30 bg-violet-500/10 px-2 py-1 text-xs text-violet-600 transition-colors hover:border-violet-500/50 hover:text-violet-500 dark:text-violet-400"
                    >
                        <Search className="size-3" />
                        {citation.title}
                    </Link>
                ) : (
                    <a
                        key={citation.url}
                        href={citation.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border border-border/50 bg-background px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-border hover:text-foreground"
                    >
                        <ExternalLink className="size-3" />
                        {citation.title}
                    </a>
                ),
            )}
        </div>
    );
}

function MessageBubble({
    role,
    content,
    isStreaming,
    tools,
    citations,
}: {
    role: 'user' | 'assistant';
    content: string;
    isStreaming?: boolean;
    tools?: ToolActivity[];
    citations?: Citation[];
}) {
    const isUser = role === 'user';

    return (
        <div
            className={cn(
                'flex gap-4',
                isUser ? 'flex-row-reverse' : 'flex-row',
            )}
        >
            <div
                className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-full',
                    isUser
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white',
                )}
            >
                {isUser ? (
                    <User className="size-4" />
                ) : (
                    <Bot className="size-4" />
                )}
            </div>

            <div
                className={cn(
                    'max-w-[80%] space-y-2',
                    isUser ? 'text-right' : 'text-left',
                )}
            >
                {!isUser && tools && tools.length > 0 && (
                    <div className="space-y-1.5">
                        {tools.map((tool) => (
                            <ToolCallCard
                                key={tool.id}
                                tool={tool}
                                isLive={isStreaming}
                            />
                        ))}
                    </div>
                )}

                {(content || isUser) && (
                    <div
                        className={cn(
                            'rounded-2xl px-4 py-3',
                            isUser
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted/50 text-foreground',
                        )}
                    >
                        <div className="prose prose-sm max-w-none prose-invert">
                            {isUser ? (
                                <p className="leading-relaxed">{content}</p>
                            ) : (
                                <Markdown remarkPlugins={[remarkGfm]}>
                                    {content}
                                </Markdown>
                            )}
                            {isStreaming && (
                                <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-current" />
                            )}
                        </div>
                    </div>
                )}

                {!isUser && citations && <CitationList citations={citations} />}
            </div>
        </div>
    );
}

// --- Suggestion Pool ---

function useRotatingSuggestions(
    suggestionPool: string[],
    groupSize = 3,
    intervalMs = 6000,
) {
    const [groupIndex, setGroupIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(true);
    const totalGroups = Math.ceil(suggestionPool.length / groupSize);

    useEffect(() => {
        const interval = setInterval(() => {
            setIsVisible(false);
            const timeout = setTimeout(() => {
                setGroupIndex((prev) => (prev + 1) % totalGroups);
                setIsVisible(true);
            }, 300);
            return () => clearTimeout(timeout);
        }, intervalMs);

        return () => clearInterval(interval);
    }, [totalGroups, intervalMs]);

    const suggestions = suggestionPool.slice(
        groupIndex * groupSize,
        groupIndex * groupSize + groupSize,
    );

    return { suggestions, isVisible };
}

// --- Main Page ---

export default function ResearchChat() {
    const { t } = useTranslation();
    const { conversations, currentConversation, messages, fileMap, flash } =
        usePage<PageProps>().props;
    const { hintsEnabled } = useHints();

    const [localConversations, setLocalConversations] =
        useState<Conversation[]>(conversations);
    const [generatingTitleFor, setGeneratingTitleFor] = useState<string | null>(
        null,
    );
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const formRef = useRef<HTMLFormElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const [input, setInput] = useState('');
    const suggestionPool = useMemo(
        () => [
            t('chat.suggestionAi'),
            t('chat.suggestionRecent'),
            t('chat.suggestionConnections'),
            t('chat.suggestionThemes'),
            t('chat.suggestionCompare'),
            t('chat.suggestionSavedRecently'),
            t('chat.suggestionMachineLearning'),
            t('chat.suggestionTakeaways'),
            t('chat.suggestionWebDev'),
            t('chat.suggestionPatterns'),
            t('chat.suggestionFindings'),
            t('chat.suggestionTopics'),
        ],
        [t],
    );
    const { suggestions, isVisible: suggestionsVisible } =
        useRotatingSuggestions(suggestionPool);
    const [localMessages, setLocalMessages] = useState<
        Array<{ id: string; role: 'user' | 'assistant'; content: string }>
    >(
        messages.map((m) => ({
            id: m.id,
            role: m.role,
            content:
                m.role === 'assistant'
                    ? stripCitationMarkers(m.content)
                    : m.content,
        })),
    );

    const { data, isFetching, isStreaming, send } = useStream(
        research.stream().url,
        {
            onFinish: () => {
                if (!currentConversation) {
                    router.reload({
                        only: ['conversations'],
                        onSuccess: (page) => {
                            const props = page.props as unknown as PageProps;
                            const newest = props.conversations[0];
                            if (newest) {
                                router.visit(
                                    research.chat({
                                        mergeQuery: {
                                            conversation: newest.id,
                                        },
                                    }).url,
                                    {
                                        preserveState: false,
                                        onSuccess: () => {
                                            setGeneratingTitleFor(newest.id);
                                        },
                                    },
                                );
                            }
                        },
                    });
                } else {
                    router.reload({
                        only: [
                            'conversations',
                            'currentConversation',
                            'messages',
                        ],
                        onSuccess: (page) => {
                            const props = page.props as unknown as PageProps;
                            setLocalMessages(
                                props.messages.map((m) => ({
                                    id: m.id,
                                    role: m.role,
                                    content:
                                        m.role === 'assistant'
                                            ? stripCitationMarkers(m.content)
                                            : m.content,
                                })),
                            );
                            if (
                                props.currentConversation &&
                                (!props.currentConversation.title ||
                                    props.currentConversation.title ===
                                        'Untitled')
                            ) {
                                setGeneratingTitleFor(
                                    props.currentConversation.id,
                                );
                            }
                        },
                    });
                }
            },
            onError: (err) => {
                console.error('Stream error:', err);
            },
        },
    );

    // Auto-focus the textarea on mount
    useEffect(() => {
        textareaRef.current?.focus();
    }, []);

    // Sync conversations from props
    useEffect(() => {
        setLocalConversations(conversations);
    }, [conversations]);

    // Sync messages when conversation changes
    useEffect(() => {
        setLocalMessages(
            messages.map((m) => ({
                id: m.id,
                role: m.role,
                content:
                    m.role === 'assistant'
                        ? stripCitationMarkers(m.content)
                        : m.content,
            })),
        );
    }, [messages]);

    // Parse SSE events from the accumulated stream data
    const streamParsed = useMemo(
        () =>
            data
                ? parseStreamEvents(data, fileMap, t('chat.researchItem'))
                : null,
        [data, fileMap, t],
    );

    // Scroll to bottom when messages or streaming data change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [localMessages, data]);

    const handleTitleUpdate = useCallback(
        (conversationId: string, title: string) => {
            setLocalConversations((prev) =>
                prev.map((conv) =>
                    conv.id === conversationId ? { ...conv, title } : conv,
                ),
            );
        },
        [],
    );

    const handleTitleComplete = useCallback(() => {
        setGeneratingTitleFor(null);
    }, []);

    const handleNewChat = () => {
        router.visit(research.chat().url);
    };

    const handleSelectConversation = (conversationId: string) => {
        router.visit(
            research.chat({ mergeQuery: { conversation: conversationId } }).url,
        );
    };

    const handleDeleteConversation = (
        e: React.MouseEvent,
        conversationId: string,
    ) => {
        e.stopPropagation();
        if (!confirm(t('chat.deleteConfirm'))) return;
        router.delete(research.chat.destroy(conversationId).url, {
            preserveScroll: true,
        });
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!input.trim() || isStreaming || isFetching) return;

        const userMessage = {
            id: `temp-${Date.now()}`,
            role: 'user' as const,
            content: input.trim(),
        };
        setLocalMessages((prev) => [...prev, userMessage]);

        send({
            message: input.trim(),
            conversation_id: currentConversation?.id ?? null,
        });

        setInput('');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            formRef.current?.requestSubmit();
        }
    };

    const getConversationTitle = (conversation: Conversation): string => {
        if (generatingTitleFor === conversation.id) {
            return t('chat.generatingTitle');
        }
        return conversation.title || t('chat.newConversation');
    };

    const currentTitle =
        currentConversation?.id === generatingTitleFor
            ? localConversations.find((c) => c.id === currentConversation.id)
                  ?.title || t('chat.title')
            : currentConversation?.title || null;

    return (
        <AppLayout>
            <Head
                title={
                    currentTitle
                        ? `${currentTitle} - ${t('chat.headSuffix')}`
                        : t('chat.title')
                }
            />

            {generatingTitleFor && (
                <TitleGenerator
                    conversationId={generatingTitleFor}
                    onTitleUpdate={handleTitleUpdate}
                    onComplete={handleTitleComplete}
                />
            )}

            <div className="flex h-[calc(100vh-57px)] overflow-hidden">
                {/* Sidebar */}
                <div className="hidden w-72 shrink-0 flex-col border-r border-border/50 bg-muted/20 md:flex">
                    <div className="border-b border-border/50 p-4">
                        <Button
                            onClick={handleNewChat}
                            className="w-full"
                            variant="outline"
                        >
                            <Plus className="size-4" />
                            {t('chat.newChat')}
                        </Button>
                    </div>

                    {hintsEnabled && (
                        <div className="border-b border-border/50 px-4 py-2">
                            <FeatureBadge
                                feature="conversation"
                                className="w-full justify-center"
                            />
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto p-2">
                        {localConversations.length === 0 ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                                {t('chat.noConversations')}
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {localConversations.map((conversation) => (
                                    <div
                                        key={conversation.id}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() =>
                                            handleSelectConversation(
                                                conversation.id,
                                            )
                                        }
                                        onKeyDown={(e) => {
                                            if (
                                                e.key === 'Enter' ||
                                                e.key === ' '
                                            ) {
                                                e.preventDefault();
                                                handleSelectConversation(
                                                    conversation.id,
                                                );
                                            }
                                        }}
                                        className={`group flex w-full cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                                            currentConversation?.id ===
                                            conversation.id
                                                ? 'bg-primary/10 text-foreground'
                                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                        }`}
                                    >
                                        <MessageSquare className="mt-0.5 size-4 shrink-0" />
                                        <div className="min-w-0 flex-1">
                                            <p
                                                className={cn(
                                                    'truncate text-sm font-medium',
                                                    generatingTitleFor ===
                                                        conversation.id &&
                                                        'animate-pulse',
                                                )}
                                            >
                                                {getConversationTitle(
                                                    conversation,
                                                )}
                                            </p>
                                            <p className="mt-0.5 text-xs text-muted-foreground">
                                                {new Date(
                                                    conversation.created_at,
                                                ).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(e) =>
                                                handleDeleteConversation(
                                                    e,
                                                    conversation.id,
                                                )
                                            }
                                            className="p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                                        >
                                            <Trash2 className="size-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {hintsEnabled && (
                        <div className="border-t border-border/50 px-4 py-3">
                            <FeatureBadge
                                feature="conversation"
                                className="w-full justify-center"
                            />
                            <p className="mt-2 text-center text-xs text-muted-foreground">
                                {t('chat.autoSaved')}
                            </p>
                        </div>
                    )}
                </div>

                {/* Main Chat Area */}
                <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                    {/* Feature Badges Header */}
                    {hintsEnabled && (
                        <div className="shrink-0 border-b border-border/50 bg-muted/10 px-4 py-3">
                            <FeatureBadgeGroup
                                features={[
                                    'agent',
                                    'streaming',
                                    'file-search',
                                    'web-search',
                                ]}
                                className="justify-center"
                            />
                        </div>
                    )}

                    {flash?.success && (
                        <div className="border-b border-green-500/20 bg-green-500/10 px-4 py-2 text-sm text-green-600 dark:text-green-400">
                            {flash.success}
                        </div>
                    )}

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {localMessages.length === 0 && !isStreaming ? (
                            <div className="flex h-full flex-col items-center justify-center text-center">
                                <div className="flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/20 to-indigo-600/20">
                                    <Sparkles className="size-8 text-violet-500" />
                                </div>
                                <h3 className="mt-4 text-xl font-semibold text-foreground">
                                    {t('chat.startTitle')}
                                </h3>
                                <p className="mt-2 max-w-sm text-muted-foreground">
                                    {t('chat.startDescription')}
                                </p>
                                <div
                                    className={`mt-6 flex flex-wrap justify-center gap-2 transition-all duration-300 ${
                                        suggestionsVisible
                                            ? 'translate-y-0 opacity-100'
                                            : 'translate-y-1 opacity-0'
                                    }`}
                                >
                                    {suggestions.map((suggestion) => (
                                        <button
                                            key={suggestion}
                                            type="button"
                                            onClick={() => setInput(suggestion)}
                                            className="rounded-full border border-border/50 bg-muted/30 px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground"
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="mx-auto max-w-3xl space-y-6">
                                {localMessages.map((message) => {
                                    const serverMsg = messages.find(
                                        (m) => m.id === message.id,
                                    );
                                    const msgTools = serverMsg
                                        ? parseToolCalls(serverMsg.tool_calls)
                                        : [];

                                    return (
                                        <MessageBubble
                                            key={message.id}
                                            role={message.role}
                                            content={message.content}
                                            tools={msgTools}
                                        />
                                    );
                                })}

                                {isStreaming && streamParsed && (
                                    <>
                                        {streamParsed.tools.length > 0 &&
                                            !streamParsed.text && (
                                                <div className="flex gap-4">
                                                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white">
                                                        <Bot className="size-4" />
                                                    </div>
                                                    <div className="max-w-[80%] space-y-1.5">
                                                        {streamParsed.tools.map(
                                                            (tool) => (
                                                                <ToolCallCard
                                                                    key={
                                                                        tool.id
                                                                    }
                                                                    tool={tool}
                                                                    isLive
                                                                />
                                                            ),
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                        {streamParsed.text && (
                                            <MessageBubble
                                                role="assistant"
                                                content={streamParsed.text}
                                                tools={streamParsed.tools}
                                                citations={
                                                    streamParsed.citations
                                                }
                                                isStreaming
                                            />
                                        )}
                                    </>
                                )}

                                {(isStreaming || isFetching) &&
                                    !streamParsed?.text &&
                                    !streamParsed?.tools.length && (
                                        <div className="flex items-center gap-3 text-muted-foreground">
                                            <Loader2 className="size-5 animate-spin" />
                                            <span>{t('chat.thinking')}</span>
                                        </div>
                                    )}

                                <div ref={messagesEndRef} />
                            </div>
                        )}
                    </div>

                    {/* Input */}
                    <div className="shrink-0 border-t border-border/50 bg-background/80 p-4 backdrop-blur-sm">
                        <form
                            ref={formRef}
                            onSubmit={handleSubmit}
                            className="mx-auto max-w-3xl"
                        >
                            <div className="relative flex items-end gap-3 rounded-2xl border border-border/50 bg-muted/30 p-2 transition-colors focus-within:border-border focus-within:bg-muted/50">
                                <textarea
                                    ref={textareaRef}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={t('chat.askPlaceholder')}
                                    rows={1}
                                    className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none"
                                    style={{
                                        height: 'auto',
                                        minHeight: '40px',
                                    }}
                                    onInput={(e) => {
                                        const target =
                                            e.target as HTMLTextAreaElement;
                                        target.style.height = 'auto';
                                        target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
                                    }}
                                />
                                <Button
                                    type="submit"
                                    size="icon"
                                    disabled={
                                        !input.trim() ||
                                        isStreaming ||
                                        isFetching
                                    }
                                    className="size-10 shrink-0 rounded-xl"
                                >
                                    {isStreaming || isFetching ? (
                                        <Loader2 className="size-4 animate-spin" />
                                    ) : (
                                        <Send className="size-4" />
                                    )}
                                </Button>
                            </div>
                            {hintsEnabled && (
                                <p className="mt-2 text-center text-xs text-muted-foreground">
                                    {t('chat.hint')}
                                </p>
                            )}
                        </form>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
