'use client';

import React from 'react';
import type { RecapAspect, RecapData, RecapLocale, SceneKey } from '@/lib/recap/types';
import type { RecapCopy } from './scenes/shared';
import OpeningScene from './scenes/OpeningScene';
import TotalScene from './scenes/TotalScene';
import MoviesScene from './scenes/MoviesScene';
import SeriesScene from './scenes/SeriesScene';
import BooksScene from './scenes/BooksScene';
import GenresScene from './scenes/GenresScene';
import StoryAgeScene from './scenes/StoryAgeScene';
import TitleScene from './scenes/TitleScene';
import MonthlyScene from './scenes/MonthlyScene';
import PeakMonthScene from './scenes/PeakMonthScene';
import MonthsActiveScene from './scenes/MonthsActiveScene';
import TopRatedScene from './scenes/TopRatedScene';
import FirstLastScene from './scenes/FirstLastScene';
import ReflectionScene from './scenes/ReflectionScene';
import ClosingScene from './scenes/ClosingScene';

interface RecapSceneProps {
  sceneKey: SceneKey;
  recap: RecapData;
  copy: RecapCopy;
  locale: RecapLocale;
  aspectRatio: RecapAspect;
  animate: boolean;
  reflectionIndex?: number;
}

/** 依場景鍵渲染對應場景；該場景資料為 null 時回傳 null（不渲染空框）。結尾場景在階段 2B 實作。 */
export default function RecapScene({ sceneKey, recap, copy, locale, aspectRatio, animate, reflectionIndex = 0 }: RecapSceneProps) {
  const common = { copy, locale, aspectRatio, animate, year: recap.year, isPartial: recap.is_partial };

  switch (sceneKey) {
    case 'opening': return <OpeningScene {...common} data={recap.opening} />;
    case 'total': return <TotalScene {...common} data={recap.total} />;
    case 'movies': return recap.movies ? <MoviesScene {...common} data={recap.movies} /> : null;
    case 'series': return recap.series ? <SeriesScene {...common} data={recap.series} /> : null;
    case 'books': return recap.books ? <BooksScene {...common} data={recap.books} /> : null;
    case 'genres': return recap.genres ? <GenresScene {...common} data={recap.genres} /> : null;
    case 'story_age': return recap.story_age ? <StoryAgeScene {...common} data={recap.story_age} /> : null;
    case 'title': return recap.title ? <TitleScene {...common} data={recap.title} /> : null;
    case 'monthly': return recap.monthly ? <MonthlyScene {...common} data={recap.monthly} /> : null;
    case 'peak_month': return recap.peak_month ? <PeakMonthScene {...common} data={recap.peak_month} /> : null;
    case 'months_active': return recap.months_active ? <MonthsActiveScene {...common} data={recap.months_active} /> : null;
    case 'top_rated': return recap.top_rated ? <TopRatedScene {...common} data={recap.top_rated} /> : null;
    case 'first_last': return recap.first_last ? <FirstLastScene {...common} data={recap.first_last} /> : null;
    case 'reflection':
      return recap.reflection ? <ReflectionScene {...common} data={recap.reflection} reflectionIndex={reflectionIndex} /> : null;
    case 'closing': return <ClosingScene {...common} data={recap.closing} />;
    default: return null;
  }
}
