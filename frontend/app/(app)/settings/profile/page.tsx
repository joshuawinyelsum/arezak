"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronLeft, Camera, UploadCloud, Trash2, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, ApiError } from "@/lib/api";

export default function ProfilePage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState(user?.first_name || "");
  const [lastName, setLastName] = useState(user?.last_name || "");
  const [handle, setHandle] = useState(user?.handle ? user.handle.replace(/^@/, '') : "");
  
  const [loading, setLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Handle availability state
  const [handleStatus, setHandleStatus] = useState<"idle" | "checking" | "available" | "unavailable" | "invalid">("idle");
  
  // Debounced handle check
  useEffect(() => {
    if (!handle) {
      setHandleStatus("invalid");
      return;
    }
    
    // Unchanged handle
    if (user?.handle && handle.toLowerCase() === user.handle.replace(/^@/, '').toLowerCase()) {
      setHandleStatus("available");
      return;
    }
    
    if (handle.length < 3) {
      setHandleStatus("invalid");
      return;
    }

    setHandleStatus("checking");
    
    const timeoutId = setTimeout(async () => {
      try {
        const res = await apiFetch("/identity/resolve", {
          method: "POST",
          body: JSON.stringify({ identifier: `@${handle.toLowerCase()}` })
        });
        
        // If it resolved successfully, someone owns it
        const data = await res.json();
        // Just in case it resolved to us (though we caught exact match above)
        setHandleStatus("unavailable");
      } catch (err: any) {
        if (err instanceof ApiError && err.status === 404) {
          // Not found means it's available!
          setHandleStatus("available");
        } else {
          setHandleStatus("idle");
        }
      }
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [handle, user?.handle]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (handleStatus === "unavailable" || handleStatus === "invalid") {
      setError("Please choose a valid and available handle.");
      return;
    }
    
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (user?.handle && handle.toLowerCase() !== user.handle.replace(/^@/, '').toLowerCase()) {
        await apiFetch("/identity/handle", {
          method: "PATCH",
          body: JSON.stringify({ handle }),
        });
      }
      
      await apiFetch("/identity/profile", {
        method: "PATCH",
        body: JSON.stringify({ first_name: firstName, last_name: lastName }),
      });
      
      await refreshUser();
      setSuccess("Profile updated successfully");
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 409) {
        setError("That handle is already in use.");
      } else {
        setError("Failed to update profile.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setError("Only JPEG and PNG images are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5MB.");
      return;
    }

    setPhotoLoading(true);
    setError("");
    const formData = new FormData();
    formData.append("file", file);

    try {
      await apiFetch("/identity/profile/photo", {
        method: "PUT",
        body: formData,
        headers: {}, // Let browser set multipart/form-data
      });
      await refreshUser();
      setSuccess("Photo updated");
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 501) {
        setError("Cloud storage is not configured on this server.");
      } else {
        setError("Failed to upload photo.");
      }
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleRemovePhoto = async () => {
    setPhotoLoading(true);
    setError("");
    try {
      await apiFetch("/identity/profile/photo", {
        method: "DELETE"
      });
      await refreshUser();
      setSuccess("Photo removed");
    } catch (err) {
      setError("Failed to remove photo");
    } finally {
      setPhotoLoading(false);
    }
  };

  const name = `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || "User";
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "?";

  return (
    <div className="w-full max-w-xl mx-auto space-y-6 animate-in fade-in duration-300 pb-12">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-slate-900">Edit Profile</h1>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium">{error}</div>}
      {success && <div className="bg-green-50 text-green-600 p-3 rounded-xl text-sm font-medium">{success}</div>}

      <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm flex flex-col items-center gap-4">
        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
          <div className="w-24 h-24 rounded-full bg-brand/10 flex items-center justify-center overflow-hidden border-4 border-white shadow-sm">
            {photoLoading ? (
              <Loader2 className="w-8 h-8 text-brand animate-spin" />
            ) : user?.profile_photo_url ? (
              <img src={user.profile_photo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-bold text-brand">{initials}</span>
            )}
            {!photoLoading && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                <Camera className="w-8 h-8 text-white" />
              </div>
            )}
          </div>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/jpeg,image/png" onChange={handlePhotoUpload} />
        </div>
        
        <div className="flex gap-3">
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={photoLoading} className="flex items-center gap-2 text-sm font-semibold text-slate-700 bg-slate-100 px-4 py-2 rounded-xl hover:bg-slate-200 transition-colors">
            <UploadCloud className="w-4 h-4" /> Upload new
          </button>
          {user?.profile_photo_url && (
            <button type="button" onClick={handleRemovePhoto} disabled={photoLoading} className="flex items-center gap-2 text-sm font-semibold text-red-600 bg-red-50 px-4 py-2 rounded-xl hover:bg-red-100 transition-colors">
              <Trash2 className="w-4 h-4" /> Remove
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-1.5">First name</label>
            <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand" disabled={loading} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-1.5">Last name</label>
            <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand" disabled={loading} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-1.5">@handle</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">@</span>
            <input type="text" value={handle} onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))} required minLength={3} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-3 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand" disabled={loading} />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {handleStatus === "checking" && <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />}
              {handleStatus === "available" && <CheckCircle2 className="w-4 h-4 text-green-500" />}
              {handleStatus === "unavailable" && <AlertCircle className="w-4 h-4 text-red-500" />}
            </div>
          </div>
          {handleStatus === "checking" && <p className="text-xs text-slate-500 mt-1.5">Checking...</p>}
          {handleStatus === "available" && <p className="text-xs text-green-600 mt-1.5 font-medium">Available</p>}
          {handleStatus === "unavailable" && <p className="text-xs text-red-600 mt-1.5 font-medium">That handle is unavailable</p>}
          {handleStatus === "invalid" && <p className="text-xs text-red-600 mt-1.5 font-medium">Invalid handle</p>}
        </div>
        
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-1.5">Email</label>
          <input type="email" value={user?.email || ""} disabled className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-500 cursor-not-allowed" />
          <p className="text-xs text-slate-400 mt-1.5">Email address cannot be changed.</p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-1.5">Phone number</label>
          <input type="text" value={user?.phone_number || ""} disabled className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-500 cursor-not-allowed" />
          <p className="text-xs text-slate-400 mt-1.5">Contact support to change your verified phone number.</p>
        </div>

        <button type="submit" disabled={loading || handleStatus === "unavailable" || handleStatus === "invalid" || handleStatus === "checking"} className="w-full bg-brand text-white font-semibold rounded-xl py-3.5 shadow-lg hover:bg-brand/90 disabled:opacity-50 mt-4">
          {loading ? "Saving..." : "Save changes"}
        </button>
      </form>
    </div>
  );
}
