<?php

namespace App\Events;

use App\Models\ResearchItem;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ResearchItemAnalyzed implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public ResearchItem $item,
    ) {}

    /**
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('App.Models.User.'.$this->item->user_id),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'id' => $this->item->id,
            'title' => $this->item->title,
            'ai_summary' => $this->item->ai_summary,
            'category' => $this->item->metadata['category'] ?? null,
            'fetch_failed' => $this->item->metadata['fetch_failed'] ?? false,
            'fetch_error' => $this->item->metadata['fetch_error'] ?? null,
        ];
    }
}
