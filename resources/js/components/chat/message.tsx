import { Bot, Globe, Search, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface MessageProps {
    role: 'user' | 'assistant';
    content: string;
    isStreaming?: boolean;
    toolCalls?: string[];
}

const toolIcons: Record<string, typeof Search> = {
    file_search: Search,
    web_search: Globe,
};

const toolLabelKeys: Record<string, string> = {
    file_search: 'chat.knowledgeBase',
    web_search: 'chat.webSearch',
};

export function Message({
    role,
    content,
    isStreaming,
    toolCalls,
}: MessageProps) {
    const { t } = useTranslation();
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
                {/* Tool usage badges */}
                {!isUser && toolCalls && toolCalls.length > 0 && (
                    <div
                        className={cn(
                            'flex flex-wrap gap-1.5',
                            isUser ? 'justify-end' : 'justify-start',
                        )}
                    >
                        {toolCalls.map((tool) => {
                            const Icon = toolIcons[tool] || Search;
                            const labelKey = toolLabelKeys[tool];
                            const label = labelKey ? t(labelKey) : tool;
                            return (
                                <span
                                    key={tool}
                                    className="inline-flex items-center gap-1 rounded-full bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground"
                                >
                                    <Icon className="size-3" />
                                    {label}
                                </span>
                            );
                        })}
                    </div>
                )}

                {/* Message content */}
                <div
                    className={cn(
                        'rounded-2xl px-4 py-3',
                        isUser
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted/50 text-foreground',
                    )}
                >
                    <div className="prose prose-sm prose-invert max-w-none">
                        {content.split('\n').map((paragraph, i) => (
                            <p
                                key={i}
                                className={cn(
                                    i > 0 && 'mt-2',
                                    'leading-relaxed',
                                )}
                            >
                                {paragraph}
                            </p>
                        ))}
                        {isStreaming && (
                            <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-current" />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
