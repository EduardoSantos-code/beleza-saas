"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Star,
  Trash2,
  MessageSquare,
  ImageIcon,
  Upload,
  X,
  Plus,
} from "lucide-react";

type ReviewAdmin = {
  id: string;
  clientName: string;
  phoneE164: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  appointment: {
    service: { name: string };
    professional: { name: string };
  };
};

type GalleryPhotoAdmin = {
  id: string;
  imageUrl: string;
  publicId: string;
  caption: string | null;
  sortOrder: number;
  createdAt: string;
};

export default function AdminReviewsPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [reviews, setReviews] = useState<ReviewAdmin[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [photos, setPhotos] = useState<GalleryPhotoAdmin[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadCaption, setUploadCaption] = useState("");
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  const [activeSection, setActiveSection] = useState<"reviews" | "gallery">("reviews");

  const loadReviews = useCallback(async () => {
    try {
      setLoadingReviews(true);
      const res = await fetch(`/api/admin/${slug}/reviews`);
      if (!res.ok) return;
      const data = await res.json();
      setReviews(data.reviews || []);
      setAverageRating(data.averageRating || 0);
      setTotalReviews(data.totalReviews || 0);
    } catch {
      // silent
    } finally {
      setLoadingReviews(false);
    }
  }, [slug]);

  const loadPhotos = useCallback(async () => {
    try {
      setLoadingPhotos(true);
      const res = await fetch(`/api/admin/${slug}/gallery`);
      if (!res.ok) return;
      const data = await res.json();
      setPhotos(data.photos || []);
    } catch {
      // silent
    } finally {
      setLoadingPhotos(false);
    }
  }, [slug]);

  useEffect(() => {
    loadReviews();
    loadPhotos();
  }, [loadReviews, loadPhotos]);

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm("Tem certeza que deseja remover esta avaliação?")) return;
    try {
      setDeletingId(reviewId);
      const res = await fetch(`/api/admin/${slug}/reviews?id=${reviewId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        loadReviews();
      }
    } catch {
      // silent
    } finally {
      setDeletingId(null);
    }
  };

  const handleUploadPhoto = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.querySelector('input[type="file"]') as HTMLInputElement;
    const file = fileInput?.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      if (uploadCaption.trim()) {
        formData.append("caption", uploadCaption.trim());
      }

      const res = await fetch(`/api/admin/${slug}/gallery`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setUploadCaption("");
        setShowUpload(false);
        fileInput.value = "";
        loadPhotos();
      }
    } catch {
      // silent
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm("Tem certeza que deseja remover esta foto?")) return;
    try {
      setDeletingPhotoId(photoId);
      const res = await fetch(`/api/admin/${slug}/gallery?id=${photoId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        loadPhotos();
      }
    } catch {
      // silent
    } finally {
      setDeletingPhotoId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 dark:text-white italic tracking-tight">
            Avaliações & Galeria
          </h1>
          <p className="text-sm font-bold text-zinc-500 mt-1">
            Gerencie as avaliações dos clientes e fotos do seu trabalho.
          </p>
        </div>

        {/* Stats Mini */}
        <div className="flex items-center gap-4">
          {averageRating > 0 && (
            <div className="flex items-center gap-2 rounded-2xl bg-white dark:bg-zinc-900 px-5 py-3 shadow-md ring-1 ring-zinc-200 dark:ring-zinc-800">
              <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
              <span className="text-xl font-black text-zinc-900 dark:text-white">{averageRating.toFixed(1)}</span>
              <span className="text-[10px] font-bold text-zinc-400 uppercase">({totalReviews})</span>
            </div>
          )}
        </div>
      </div>

      {/* SECTION TABS */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setActiveSection("reviews")}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
            activeSection === "reviews"
              ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-lg"
              : "bg-white dark:bg-zinc-900 text-zinc-500 ring-1 ring-zinc-200 dark:ring-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800"
          }`}
        >
          <MessageSquare size={14} />
          Avaliações ({totalReviews})
        </button>
        <button
          type="button"
          onClick={() => setActiveSection("gallery")}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
            activeSection === "gallery"
              ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-lg"
              : "bg-white dark:bg-zinc-900 text-zinc-500 ring-1 ring-zinc-200 dark:ring-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800"
          }`}
        >
          <ImageIcon size={14} />
          Galeria ({photos.length})
        </button>
      </div>

      {/* REVIEWS SECTION */}
      {activeSection === "reviews" && (
        <div className="space-y-4">
          {loadingReviews ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin h-8 w-8 border-4 border-zinc-300 dark:border-zinc-700 border-t-zinc-900 dark:border-t-white rounded-full" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="rounded-3xl bg-white dark:bg-zinc-900 p-12 shadow-md ring-1 ring-zinc-200 dark:ring-zinc-800 text-center">
              <MessageSquare className="h-12 w-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
              <p className="text-sm font-bold text-zinc-500">Nenhuma avaliação ainda.</p>
              <p className="text-xs text-zinc-400 mt-1">As avaliações dos clientes aparecerão aqui.</p>
            </div>
          ) : (
            reviews.map((review) => (
              <div key={review.id} className="rounded-2xl bg-white dark:bg-zinc-900 p-5 shadow-md ring-1 ring-zinc-200 dark:ring-zinc-800">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-sm font-black text-zinc-500 shrink-0">
                      {review.clientName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-black text-zinc-900 dark:text-white truncate">{review.clientName}</h3>
                        <span className="text-[10px] font-bold text-zinc-400 shrink-0">
                          {new Date(review.createdAt).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      <div className="flex gap-0.5 mb-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star
                            key={i}
                            className={`h-3.5 w-3.5 ${
                              i <= review.rating
                                ? "text-amber-400 fill-amber-400"
                                : "text-zinc-200 dark:text-zinc-700"
                            }`}
                          />
                        ))}
                      </div>
                      {review.comment && (
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mb-2">{review.comment}</p>
                      )}
                      <p className="text-[10px] font-bold text-zinc-400">
                        {review.appointment.service.name} • {review.appointment.professional.name} • {review.phoneE164}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteReview(review.id)}
                    disabled={deletingId === review.id}
                    className="shrink-0 rounded-xl border border-red-200 bg-red-50/50 hover:bg-red-50 px-3 py-2 text-red-600 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/40 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* GALLERY SECTION */}
      {activeSection === "gallery" && (
        <div className="space-y-6">
          {/* Upload button */}
          <button
            type="button"
            onClick={() => setShowUpload(!showUpload)}
            className="flex items-center gap-2 rounded-2xl bg-zinc-900 dark:bg-white px-5 py-3 text-xs font-black uppercase tracking-widest text-white dark:text-zinc-900 shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus size={14} />
            Adicionar Foto
          </button>

          {/* Upload form */}
          {showUpload && (
            <form onSubmit={handleUploadPhoto} className="rounded-2xl bg-white dark:bg-zinc-900 p-6 shadow-md ring-1 ring-zinc-200 dark:ring-zinc-800 space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
                  Foto (máx 5MB)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  required
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-bold text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-900 file:px-3 file:py-1 file:text-xs file:font-bold file:text-white dark:file:bg-white dark:file:text-zinc-900 cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
                  Legenda (opcional)
                </label>
                <input
                  type="text"
                  value={uploadCaption}
                  onChange={(e) => setUploadCaption(e.target.value)}
                  placeholder="Ex: Corte degradê"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-bold text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowUpload(false)}
                  className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-800 py-3 text-xs font-black uppercase tracking-widest text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-[2] rounded-xl bg-zinc-900 dark:bg-white py-3 text-xs font-black uppercase tracking-widest text-white dark:text-zinc-900 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <span className="animate-spin h-4 w-4 border-2 border-white dark:border-zinc-900 border-t-transparent rounded-full" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Upload size={14} />
                      Enviar Foto
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Photos Grid */}
          {loadingPhotos ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin h-8 w-8 border-4 border-zinc-300 dark:border-zinc-700 border-t-zinc-900 dark:border-t-white rounded-full" />
            </div>
          ) : photos.length === 0 ? (
            <div className="rounded-3xl bg-white dark:bg-zinc-900 p-12 shadow-md ring-1 ring-zinc-200 dark:ring-zinc-800 text-center">
              <ImageIcon className="h-12 w-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
              <p className="text-sm font-bold text-zinc-500">Nenhuma foto na galeria.</p>
              <p className="text-xs text-zinc-400 mt-1">Adicione fotos dos seus trabalhos para os clientes verem.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {photos.map((photo) => (
                <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-800 ring-1 ring-zinc-200 dark:ring-zinc-700 shadow-md">
                  <img
                    src={photo.imageUrl}
                    alt={photo.caption || "Foto da galeria"}
                    className="h-full w-full object-cover"
                  />
                  {photo.caption && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                      <p className="text-[10px] font-bold text-white truncate">{photo.caption}</p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeletePhoto(photo.id)}
                    disabled={deletingPhotoId === photo.id}
                    className="absolute top-2 right-2 h-8 w-8 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg cursor-pointer disabled:opacity-50"
                  >
                    {deletingPhotoId === photo.id ? (
                      <span className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <Trash2 size={12} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
