'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import AddToFolioModal from '@/components/AddToFolioModal';
import { useAuth } from '@/hooks/useAuth';
import StoryDetailsView, { ItemDetail } from '@/components/StoryDetailsView';

export default function DetailsPage() {
  const params = useParams();
  const router = useRouter();
  const type = typeof params.type === 'string' ? params.type : (Array.isArray(params.type) ? params.type[0] : '');
  const id = typeof params.id === 'string' ? params.id : (Array.isArray(params.id) ? params.id[0] : '');
  const { token } = useAuth();

  const [item, setItem] = useState<ItemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!type || !id) return;
      
      setLoading(true);
      try {
        const res = await fetch(`http://127.0.0.1:8010/api/v1/details/${type}/${id}`);
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
  }, [type, id]);

  const handleAddToFolio = async (rating: number, notes: string) => {
    if (!item || !token) return;

    try {
        const res = await fetch('http://127.0.0.1:8010/api/v1/collection/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                ...item,
                rating,
                notes
            })
        });

        if (res.status === 409) {
            alert("You have already collected this story.");
            return;
        }

        if (!res.ok) {
            throw new Error('Failed to add item');
        }
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
      />

      {/* Add Modal */}
      <AddToFolioModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSave={handleAddToFolio} 
        onViewDetails={(id) => {
            if (id) {
                router.push(`/collection/${id}`);
            }
        }}
        title={item.title} 
        external_id={item.external_id}
      />
    </>
  );
}
