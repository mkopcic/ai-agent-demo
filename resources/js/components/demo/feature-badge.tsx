import { ExternalLink, FileCode, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type FeatureType =
    | 'streaming'
    | 'agent'
    | 'file-search'
    | 'web-search'
    | 'vector-store'
    | 'conversation'
    | 'vision'
    | 'broadcasting'
    | 'categorization';

interface FeatureInfo {
    label: string;
    description: string;
    file: string;
    lineRange?: string;
    code: string;
    prefix?: string;
    docUrl?: string;
}

const featureDetails: Record<FeatureType, FeatureInfo> = {
    streaming: {
        label: 'Streaming',
        description:
            'StreamableAgentResponse šalje tokene preko SSE-a, a Laravel brine o headerima i bufferiranju.',
        file: 'app/Http/Controllers/ConversationController.php',
        lineRange: '62-79',
        code: `public function stream(SendMessageRequest $request): StreamableAgentResponse
{
    $user = $request->user();
    $conversationId = $request->validated('conversation_id');
    $message = $request->validated('message');

    $agent = new ResearchAgent($user);

    if ($conversationId) {
        $this->authorizeConversation($conversationId, $user->id);
        $agent->continue($conversationId, as: $user);
    } else {
        $agent->forUser($user);
    }

    return $agent->stream($message);
}`,
    },
    agent: {
        label: 'Agent',
        description:
            'Agenti implementiraju sučelja koja definiraju ponašanje. Atributi podešavaju providera i temperaturu.',
        file: 'app/Agents/ResearchAgent.php',
        lineRange: '17-26',
        code: `#[Provider('openai')]
#[Temperature(0.7)]
class ResearchAgent implements Agent, Conversational, HasTools
{
    use Promptable;
    use RemembersConversations;

    public function __construct(protected User $user) {}
}`,
    },
    'file-search': {
        label: 'FileSearch',
        description:
            'Semantička pretraga kroz datoteke u vector storeu. Agent odlučuje kada dohvatiti relevantne dijelove.',
        file: 'app/Agents/ResearchAgent.php',
        lineRange: '45-57',
        code: `public function tools(): iterable
{
    $tools = [];

    if ($this->user->hasVectorStore()) {
        $tools[] = new FileSearch(stores: [$this->user->vector_store_id]);
    }

    $tools[] = new WebSearch;

    return $tools;
}`,
    },
    'web-search': {
        label: 'WebSearch',
        description:
            'AI web pretraga. Agent samostalno pretražuje kada treba aktualne informacije.',
        file: 'app/Agents/ResearchAgent.php',
        lineRange: '56',
        code: `$tools[] = new WebSearch;`,
    },
    'vector-store': {
        label: 'Vector Store',
        description:
            'OpenAI managed vector storage. Datoteke se automatski dijele, embeddingiraju i indeksiraju. pgvector nije potreban.',
        file: 'app/Jobs/AnalyzeResearchItem.php',
        lineRange: '54-74',
        code: `protected function ensureUserHasVectorStore($user): void
{
    if (! $user->hasVectorStore()) {
        $store = Stores::create("user-{$user->id}-research");
        $user->update(['vector_store_id' => $store->id]);
    }
}`,
    },
    conversation: {
        label: 'Conversational',
        description:
            'RemembersConversations sprema i učitava povijest poruka. continue() i forUser() upravljaju stanjem.',
        file: 'app/Http/Controllers/ConversationController.php',
        lineRange: '70-77',
        code: `$agent = new ResearchAgent($user);

if ($conversationId) {
    $this->authorizeConversation($conversationId, $user->id);
    $agent->continue($conversationId, as: $user);
} else {
    $agent->forUser($user);
}

return $agent->stream($message);`,
    },
    vision: {
        label: 'Vision',
        description:
            'Multimodalna analiza slika tako da se spremljene slike prilože agent promptu.',
        file: 'app/Jobs/AnalyzeResearchItem.php',
        lineRange: '77-86',
        code: `protected function analyzeImage(): void
{
    $agent = AnalysisAgent::forImage();

    $response = $agent->prompt(
        'Analyze this image and provide a detailed description.',
        attachments: [
            Image::fromStorage($this->item->file_path),
        ]
    );

    $summary = $response->text;
}`,
    },
    broadcasting: {
        label: 'Broadcasting',
        prefix: 'Laravel',
        docUrl: 'https://laravel.com/docs/12.x/broadcasting',
        description:
            'ShouldBroadcast eventi šalju real-time izmjene preko Reverb WebSocketa. AI analiza šalje event po završetku, a frontend sluša i automatski se osvježava.',
        file: 'app/Events/ResearchItemAnalyzed.php',
        lineRange: '12-41',
        code: `class ResearchItemAnalyzed implements ShouldBroadcast
{
    public function __construct(
        public ResearchItem $item,
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('App.Models.User.'.$this->item->user_id),
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->item->id,
            'title' => $this->item->title,
            'ai_summary' => $this->item->ai_summary,
        ];
    }
}`,
    },
    categorization: {
        label: 'Structured Output',
        description:
            'Anonimni agent() s JSON shemom ograničava AI da vrati strukturiranu kategoriju. enum() prima BackedEnum class-string izravno.',
        file: 'app/Jobs/AnalyzeResearchItem.php',
        lineRange: '214-224',
        code: `protected function categorize(string $content): string
{
    $response = agent(
        instructions: 'You are a content categorizer. Categorize the following content into the single most appropriate category.',
        schema: fn (JsonSchema $schema) => [
            'category' => $schema->string()
                ->enum(ResearchCategory::class)->required(),
        ],
    )->prompt($content);

    return ResearchCategory::tryFrom($response['category'])?->value
        ?? ResearchCategory::Other->value;
}`,
    },
};

interface FeatureBadgeProps {
    feature: FeatureType;
    className?: string;
    showLabel?: boolean;
}

export function FeatureBadge({
    feature,
    className,
    showLabel = true,
}: FeatureBadgeProps) {
    const { t } = useTranslation();
    const info = featureDetails[feature];

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    className={cn(
                        'inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20',
                        className,
                    )}
                >
                    <Info className="size-3" />
                    {showLabel && (
                        <span>
                            {info.prefix ?? 'AI SDK'}: {info.label}
                        </span>
                    )}
                </button>
            </TooltipTrigger>
            <TooltipContent
                className="max-w-lg bg-card p-0 text-card-foreground"
                side="bottom"
                align="start"
            >
                <div className="p-3">
                    <div className="flex items-center justify-between gap-4">
                        <h4 className="font-semibold text-primary">
                            {info.label}
                        </h4>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <FileCode className="size-3" />
                            <span className="font-mono">{info.file}</span>
                            {info.lineRange && (
                                <span className="opacity-60">
                                    :{info.lineRange}
                                </span>
                            )}
                        </div>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {info.description}
                    </p>
                    <pre className="mt-3 overflow-x-auto rounded-md border border-border bg-background p-3 text-xs leading-relaxed">
                        <code className="text-primary">{info.code}</code>
                    </pre>
                    <a
                        href={
                            info.docUrl ??
                            'https://laravel.com/docs/12.x/ai-sdk'
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                        <ExternalLink className="size-3" />
                        {info.docUrl
                            ? t('demo.laravelDocs')
                            : t('demo.aiSdkDocs')}
                    </a>
                </div>
            </TooltipContent>
        </Tooltip>
    );
}

interface FeatureBadgeGroupProps {
    features: FeatureType[];
    className?: string;
}

export function FeatureBadgeGroup({
    features,
    className,
}: FeatureBadgeGroupProps) {
    const { t } = useTranslation();

    return (
        <div className={cn('flex flex-wrap items-center gap-2', className)}>
            <span className="text-xs text-muted-foreground">
                {t('demo.poweredBy')}
            </span>
            {features.map((feature) => (
                <FeatureBadge key={feature} feature={feature} />
            ))}
        </div>
    );
}
