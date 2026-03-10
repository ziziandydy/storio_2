'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import AddToFolioModal from '@/components/AddToFolioModal';
import { useAuth } from '@/hooks/useAuth';
import { useSettingsStore } from '@/store/settingsStore';
import { getApiUrl } from '@/lib/api';
import { ItemDetail } from '@/types';
import StoryDetailsView from '@/components/StoryDetailsView';

function DetailsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const type = searchParams.get('type') || '';
  const id = searchParams.get('id') || '';

  const { token } = useAuth();
  const { language } = useSettingsStore();

  const [item, setItem] = useState<ItemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!type || !id) {
        setLoading(false);
        setError('Missing required URL parameters.');
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(getApiUrl(`/api/v1/details/${type}/${id}`), {
          headers: {
            'Accept-Language': language
          }
        });
        if (!res.ok) throw new Error('Failed to fetch details');
        const data = await res.json();
        setItem(data);
      } catch (err) {
        setError('Could not retrieve story details.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [type, id, language]);

  const handleAddToFolio = async (rating: number, notes: string, date?: string) => {
    if (!item || !token) return;

    try {
      const res = await fetch(getApiUrl('/api/v1/collection/'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...item,
          rating,
          notes,
          created_at: date ? new Date(date).toISOString() : undefined
        })
      });

      if (res.status === 409) {
        return { status: 'duplicate' };
      }

      if (res.status === 403) {
        return { status: 'capacity_reached' };
      }

      if (!res.ok) {
        throw new Error('Failed to add item');
      }

      return await res.json();
    } catch (error) {
      console.error("Error adding to folio:", error);
      throw error;
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#000000] flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <div className="relative w-48 h-48">
          <Image
            src="/image/loading.gif"
            alt="Loading..."
            fill
            className="object-contain"
            unoptimized
          />
        </div>
        <p className="text-accent-gold font-bold tracking-[0.3em] uppercase text-xs animate-pulse">Consulting the Archives...</p>
      </div>
    </div>
  );

  if (error || !item) return (
    <div className="min-h-screen bg-folio-black flex flex-col items-center justify-center gap-4">
      <div className="text-red-500">{error || 'Item not found'}</div>
      <button onClick={() => router.back()} className="text-accent-gold hover:underline">Go Back</button>
    </div>
  );

  return (
    <>
      <StoryDetailsView
        item={item}
        onAddClick={() => setIsAddModalOpen(true)}
        showAddButton={true}
        onBack={() => router.back()}
      />

      {/* Add Modal */}
      <AddToFolioModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleAddToFolio}
        onViewDetails={(newId) => {
          if (newId) {
            router.push(`/collection/item?id=${newId}`);
          }
        }}
        title={item.title}
        external_id={item.external_id}
      />
    </>
  );
}

export default function DetailsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="relative w-48 h-48">
          <Image src="/image/loading.gif" alt="Loading..." fill className="object-contain" unoptimized />
        </div>
      </div>
    }>
      <DetailsPageContent />
    </Suspense>
  );
}
