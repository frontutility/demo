<?php

declare(strict_types=1);

namespace ConnectNKT\Models;

use ConnectNKT\Core\BaseModel;

final class Event extends BaseModel
{
    protected string $table = 'events';
    protected array $fillable = [
        'user_id',
        'event_title',
        'slug',
        'category',
        'organizer_name',
        'organizer_phone',
        'organizer_email',
        'event_description',
        'banner_image',
        'event_date',
        'start_time',
        'end_time',
        'venue_name',
        'full_address',
        'village_area',
        'contact_person_1',
        'contact_person_1_phone',
        'contact_person_2',
        'contact_person_2_phone',
        'contact_person_3',
        'contact_person_3_phone',
        'whatsapp_number',
        'social_links',
        'views',
        'status',
        'frontend_visible_until'
    ];
    protected bool $softDeletes = true;
}
