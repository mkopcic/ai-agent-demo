import { useEventStream } from '@laravel/stream-react';
import research from '@/routes/research';

interface TitleGeneratorProps {
    conversationId: string;
    onTitleUpdate: (conversationId: string, title: string) => void;
    onComplete: () => void;
}

export default function TitleGenerator({
    conversationId,
    onTitleUpdate,
    onComplete,
}: TitleGeneratorProps) {
    useEventStream(research.chat.titleStream(conversationId).url, {
        eventName: 'title-update',
        endSignal: '</stream>',
        onMessage: (event) => {
            try {
                const parsed = JSON.parse(event.data);
                if (parsed.title) {
                    onTitleUpdate(conversationId, parsed.title);
                }
            } catch (error) {
                console.error('Error parsing title JSON:', error);
            }
        },
        onComplete,
        onError: (error) => {
            console.error('Title generation error:', error);
            onComplete();
        },
    });

    return null;
}
