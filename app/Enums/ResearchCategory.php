<?php

namespace App\Enums;

enum ResearchCategory: string
{
    case Technology = 'technology';
    case Design = 'design';
    case Research = 'research';
    case News = 'news';
    case Recipes = 'recipes';
    case Finance = 'finance';
    case Health = 'health';
    case Education = 'education';
    case Entertainment = 'entertainment';
    case Travel = 'travel';
    case Science = 'science';
    case Business = 'business';
    case Art = 'art';
    case Reference = 'reference';
    case Other = 'other';
}
