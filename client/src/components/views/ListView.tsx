'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Story } from '@/types';
import StoryCard from '@/components/StoryCard';

interface ListViewProps {
  stories: Story[];
}

export default function ListView({ stories }: ListViewProps) {
  const router = useRouter();

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-5">
      {stories.map((story) => (
        <div key={story.id} className="group bg-folio-card border border-folio-outline rounded-xl overflow-hidden hover:bg-folio-card-hover transition-all flex flex-col h-full shadow-lg relative">
          <StoryCard 
            external_id={story.external_id}
            title={story.title}
            type={story.media_type}
            subtype={story.subtype}
            year={story.year}
            source={story.source}
            posterUrl={story.poster_path}
            rating={story.rating}
            notes={story.notes}
            addedAt={story.created_at}
            viewingNumber={story.viewingNumber}
            onViewDetails={() => router.push(`/collection/${story.id}`)}
          />
        </div>
      ))}
    </div>
  );
}
