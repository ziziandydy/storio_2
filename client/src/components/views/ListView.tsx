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
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 auto-rows-fr">
      {stories.map((story, index) => {
        // Create a Bento-like pattern: 
        // 1st item is large (2x2)
        // 5th item is wide (2x1)
        // 8th item is tall (1x2)
        // Others are standard (1x1)
        const isLarge = index === 0 || (index > 0 && index % 12 === 0);
        const isWide = index === 4 || (index > 4 && index % 12 === 5);
        
        let spanClasses = "col-span-1 row-span-1";
        if (isLarge) {
          spanClasses = "md:col-span-2 md:row-span-2 aspect-[2/3] md:aspect-auto";
        } else if (isWide) {
          spanClasses = "md:col-span-2 md:row-span-1";
        }

        return (
          <div key={story.id} className={`${spanClasses} group bg-folio-card border border-folio-outline rounded-xl overflow-hidden hover:bg-folio-card-hover transition-all flex flex-col h-full shadow-lg relative`}>
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
        );
      })}
    </div>
  );
}
