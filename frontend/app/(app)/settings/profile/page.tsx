"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, ApiError } from "@/lib/api";
import { ChevronLeft, Camera, UploadCloud, Trash2, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function ProfilePage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  const [firstName, setFirstName] = useState(user?.first_name || "");
  const [lastName, setLastName] = useState(user?.last_name || "");
  const [handle, setHandle] = useState(user?.handle || "");
  const [handleStatus, setHandleStatus] = useState<"idle" | "checking" | "available" | "unavailable" | "invalid">("idle");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isDirty = firstName !== (user?.first_name || "") || lastName !== (user?.last_name || "") || handle !== (user?.handle || "");

  const [photoLoading, setPhotoLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Phone Change State
  const [isChangingPhone, setIsChangingPhone] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [phoneStep, setPhoneStep] = useState<"request" | "verify">("request");
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneError, setPhoneError] = useState("");

  useEffect(() => {
    let active = true;

    if (user?.handle && handle === user.handle) {
      setHandleStatus("idle");
      return;
    }
    if (handle.length < 3) {
      setHandleStatus("invalid");
      return;
    }

    const checkHandle = async () => {
      if (!active) return;
      setHandleStatus("checking");
      try {
        const res = await apiFetch(`/identity/handle/available?handle=${handle}`);
        const data = await res.json();
        if (active) {
          setHandleStatus(data.available ? "available" : "unavailable");
        }
      } catch (err) {
        if (active) {
          setHandleStatus("invalid");
        }
      }
    };

    const debounce = setTimeout(checkHandle, 500);
    return () => {
      active = false;
      clearTimeout(debounce);
    };
  }, [handle, user?.handle]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await apiFetch("/identity/profile", {
        method: "PATCH",
          first_name: firstName, 
          last_name: lastName,
          ...(handle !== user?.handle ? { handle } : {})
        }),
      });

      await refreshUser();
      setSuccess("Profile updated successfully.");
        setError("That handle is already in use.");
        setError("Failed to update profile.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Only JPEG, PNG and WEBP images are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5MB.");
      return;
    }

    setPhotoLoading(true);
    setError("");
    setSuccess("");
    const formData = new FormData();
    formData.append("file", file);

    try {
      await apiFetch("/identity/profile/photo", {
        method: "PUT",
        body: formData,
        headers: {}, 
      });
      await refreshUser();
      setSuccess("Photo updated successfully.");
        setError("Cloud storage is not configured on this server.");
        setError("Failed to upload photo.");
      }
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleRemovePhoto = async () => {
    setPhotoLoading(true);
    setError("");
    setSuccess("");
    try {
      await apiFetch("/identity/profile/photo", {
        method: "DELETE"
      });
      await refreshUser();
      setSuccess("Photo removed successfully.");
    } catch (err) {
      setError("Failed to remove photo.");
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleRequestPhoneChange = async () => {
    if (!newPhone) return;
    setPhoneLoading(true);
    setPhoneError("");
    try {
      await apiFetch("/identity/request-phone-change", {
      });
      setPhoneStep("verify");
      setPhoneError(err.message?.includes("400") ? "This phone number is already registered." : "Failed to send code. Make sure the number is valid.");
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleVerifyPhoneChange = async () => {
    if (!otp) return;
    setPhoneLoading(true);
    setPhoneError("");
    try {
      await apiFetch("/identity/verify-phone-change", {
      });
      await refreshUser();
      setSuccess("Phone number changed successfully.");
      setIsChangingPhone(false);
      setNewPhone("");
      setOtp("");
      setPhoneStep("request");
      setPhoneError("Invalid or expired code.");
    } finally {
      setPhoneLoading(false);
    }
  };

  const name = `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || "User";
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "?";

  return (
    <div className="w-full max-w-xl mx-auto space-y-6 animate-in fade-in duration-300 pb-12">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-accent rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Edit Profile</h1>
      </div>

      {error && <div className="bg-destructive text-destructive-foreground p-4 rounded-xl text-sm font-medium">{error}</div>}
      {success && <div className="bg-success text-success-foreground p-4 rounded-xl text-sm font-medium">{success}</div>}

      <div className="bg-card border border-border rounded-[24px] p-8 shadow-sm flex flex-col items-center gap-5">
        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
          <div className="w-24 h-24 rounded-full bg-brand/10 flex items-center justify-center overflow-hidden border-4 border-card shadow-sm relative">
            {photoLoading ? (
              <Loader2 className="w-8 h-8 text-brand animate-spin" />
            ) : user?.profile_photo_url ? (
              <Image src={user.profile_photo_url} alt="Profile" fill className="object-cover" unoptimized />
            ) : (
              <span className="text-3xl font-bold text-brand">{initials}</span>
            )}
            {!photoLoading && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                <Camera className="w-8 h-8 text-white" />
              </div>
            )}
          </div>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoUpload} />
        </div>
        
        <div className="flex gap-3">
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={photoLoading} className="flex items-center gap-2 text-sm font-semibold text-foreground bg-muted px-4 py-2 rounded-xl hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <UploadCloud className="w-4 h-4" /> Upload new
          </button>
          {user?.profile_photo_url && (
            <button type="button" onClick={handleRemovePhoto} disabled={photoLoading} className="flex items-center gap-2 text-sm font-semibold text-destructive-foreground bg-destructive px-4 py-2 rounded-xl hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive-foreground">
              <Trash2 className="w-4 h-4" /> Remove
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-card border border-border rounded-[24px] p-6 sm:p-8 shadow-sm space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-card-foreground mb-1.5">First name</label>
            <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="w-full bg-input border border-border rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring text-foreground transition-all" disabled={loading} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-card-foreground mb-1.5">Last name</label>
            <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required className="w-full bg-input border border-border rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring text-foreground transition-all" disabled={loading} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-card-foreground mb-1.5">@handle</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">@</span>
            <input type="text" value={handle} onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} required minLength={3} className="w-full bg-input border border-border rounded-xl pl-9 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring text-foreground transition-all" disabled={loading} />
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              {handleStatus === "checking" && <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />}
              {handleStatus === "available" && <CheckCircle2 className="w-4 h-4 text-green-500" />}
              {handleStatus === "unavailable" && <AlertCircle className="w-4 h-4 text-red-500" />}
            </div>
          </div>
          {handleStatus === "checking" && <p className="text-xs text-muted-foreground mt-1.5">Checking...</p>}
          {handleStatus === "available" && <p className="text-xs text-success-foreground mt-1.5 font-medium">Available</p>}
          {handleStatus === "unavailable" && <p className="text-xs text-destructive-foreground mt-1.5 font-medium">That handle is unavailable</p>}
          {handleStatus === "invalid" && <p className="text-xs text-destructive-foreground mt-1.5 font-medium">Invalid handle</p>}
        </div>
        
        <div>
          <label className="block text-sm font-semibold text-card-foreground mb-1.5">Email</label>
          <input type="email" value={user?.email || ""} disabled className="w-full bg-muted border border-border rounded-xl px-4 py-3.5 text-sm text-muted-foreground cursor-not-allowed" />
          <p className="text-xs text-muted-foreground mt-1.5">Email address cannot be changed.</p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-card-foreground mb-1.5 flex items-center justify-between">
            Phone number
            {!isChangingPhone && (
               <button type="button" onClick={() => setIsChangingPhone(true)} className="text-xs text-brand hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-sm">
                 Change
               </button>
            )}
          </label>
          
          {!isChangingPhone ? (
             <input type="text" value={user?.phone_number || ""} disabled className="w-full bg-muted border border-border rounded-xl px-4 py-3.5 text-sm text-muted-foreground cursor-not-allowed" />
          ) : (
             <div className="space-y-3 bg-muted p-4 sm:p-5 rounded-xl border border-border">
                {phoneError && <div className="text-xs font-medium text-destructive-foreground bg-destructive p-3 rounded-lg">{phoneError}</div>}
                
                {phoneStep === "request" ? (
                   <>
                     <input type="tel" placeholder="+233..." value={newPhone} onChange={e => setNewPhone(e.target.value)} className="w-full bg-card border border-border rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring text-foreground" />
                     <div className="flex gap-2 pt-1">
                       <button type="button" onClick={handleRequestPhoneChange} disabled={!newPhone || phoneLoading} className="flex-1 bg-foreground text-background text-xs font-semibold py-3 rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity">
                         {phoneLoading ? "Sending..." : "Send Code"}
                       </button>
                       <button type="button" onClick={() => setIsChangingPhone(false)} className="flex-1 bg-card border border-border text-foreground text-xs font-semibold py-3 rounded-xl hover:bg-accent transition-colors">
                         Cancel
                       </button>
                     </div>
                   </>
                ) : (
                   <>
                     <p className="text-xs text-muted-foreground">Enter the 6-digit code sent to {newPhone}</p>
                     <input type="text" placeholder="123456" maxLength={6} value={otp} onChange={e => setOtp(e.target.value)} className="w-full bg-card border border-border rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring text-foreground text-center tracking-widest font-mono" />
                     <div className="flex gap-2 pt-1">
                       <button type="button" onClick={handleVerifyPhoneChange} disabled={!otp || phoneLoading} className="flex-1 bg-brand text-white text-xs font-semibold py-3 rounded-xl hover:bg-brand/90 disabled:opacity-50 transition-opacity">
                         {phoneLoading ? "Verifying..." : "Verify"}
                       </button>
                       <button type="button" onClick={() => { setPhoneStep("request"); setOtp(""); }} className="flex-1 bg-card border border-border text-foreground text-xs font-semibold py-3 rounded-xl hover:bg-accent transition-colors">
                         Back
                       </button>
                     </div>
                   </>
                )}
             </div>
          )}
        </div>

        <div className="pt-4">
           <button type="submit" disabled={!isDirty || loading || handleStatus === "unavailable" || handleStatus === "invalid" || handleStatus === "checking"} className="w-full bg-brand text-white font-semibold rounded-xl py-4 shadow-lg shadow-brand/20 hover:bg-brand/90 disabled:opacity-50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
             {loading ? "Saving..." : "Save changes"}
           </button>
        </div>
      </form>
    </div>
  );
}
