"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useSession } from "@/lib/auth-client";
import {
  Camera,
  CheckCircle2,
  Loader2,
  Save,
  ArrowRight,
  X,
  Copy,
  Check,
  ShieldCheck,
  Mail,
  Phone,
} from "lucide-react";
import {
  getMeAction,
  updateMeAction,
  sendEmailOtpAction,
  verifyEmailOtpAction,
  sendPhoneOtpAction,
  verifyPhoneOtpAction,
  createAvatarUploadUrlAction,
  saveAvatarAction,
} from "@/lib/actions/user.actions";

export interface AccountUser {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string | null;
  image?: string | null;
  emailVerified?: boolean;
  phoneNumberVerified?: boolean;
  role?: string;
  createdAt?: string;
  account?: {
    id: string;
    name: string;
    accountType: string;
  } | null;
}

interface AccountProfileViewProps {
  initialUser: AccountUser;
}

export function AccountProfileView({ initialUser }: AccountProfileViewProps) {
  const { data: clientSession } = useSession();
  const [user, setUser] = React.useState<AccountUser>(initialUser);

  // Sync client-side session if available and newer
  React.useEffect(() => {
    if (clientSession?.user) {
      setUser((prev) => ({
        ...prev,
        id: clientSession.user.id || prev.id,
        name: clientSession.user.name || prev.name,
        email: clientSession.user.email || prev.email,
        image: clientSession.user.image ?? prev.image,
        phoneNumber: (clientSession.user as any).phoneNumber ?? prev.phoneNumber,
        emailVerified: clientSession.user.emailVerified ?? prev.emailVerified,
        phoneNumberVerified: (clientSession.user as any).phoneNumberVerified ?? prev.phoneNumberVerified,
      }));
    }
  }, [clientSession]);

  // Name editing
  const [name, setName] = React.useState(initialUser?.name || "");
  const [savingName, setSavingName] = React.useState(false);

  React.useEffect(() => {
    if (user?.name) {
      setName(user.name);
    }
  }, [user?.name]);

  // Avatar uploading
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Email change flow
  const [showEmailChange, setShowEmailChange] = React.useState(false);
  const [newEmail, setNewEmail] = React.useState("");
  const [emailOtp, setEmailOtp] = React.useState("");
  const [emailOtpSent, setEmailOtpSent] = React.useState(false);
  const [emailLoading, setEmailLoading] = React.useState(false);

  // Phone change flow
  const [showPhoneChange, setShowPhoneChange] = React.useState(false);
  const [newPhone, setNewPhone] = React.useState("");
  const [phoneOtp, setPhoneOtp] = React.useState("");
  const [phoneOtpSent, setPhoneOtpSent] = React.useState(false);
  const [phoneLoading, setPhoneLoading] = React.useState(false);

  // Copy user ID
  const [copiedId, setCopiedId] = React.useState(false);

  // Handle Name Update
  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName || cleanName === user.name) return;

    setSavingName(true);
    try {
      const res = await updateMeAction({ name: cleanName });
      if (res.success && res.data) {
        setUser((prev) => ({ ...prev, ...res.data, name: cleanName }));
        toast.success("Display name updated successfully");
      } else {
        toast.error(res.error || "Failed to update name");
      }
    } catch {
      toast.error("Network error updating name");
    } finally {
      setSavingName(false);
    }
  };

  // Handle Avatar Upload: Purely client-side direct-to-storage upload via presigned URL
  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image file is too large. Maximum size is 10 MB.");
      return;
    }

    setUploadingAvatar(true);
    try {
      // 1. Get presigned upload URL from backend
      const presignedRes = await createAvatarUploadUrlAction(file.type || "image/jpeg");
      if (!presignedRes.success || !presignedRes.data) {
        throw new Error(presignedRes.error || "Failed to generate upload URL");
      }

      const { uploadUrl, key } = presignedRes.data;

      // 2. Direct-to-storage upload from browser to Cloudflare R2
      const uploadHttp = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "image/jpeg" },
        body: file,
      });

      if (!uploadHttp.ok) {
        throw new Error(`Direct storage upload failed with status ${uploadHttp.status}`);
      }

      // 3. Save avatar key in backend DB
      const saveRes = await saveAvatarAction(key);
      if (!saveRes.success) {
        throw new Error(saveRes.error || "Failed to save profile picture");
      }

      setUser((prev) => ({ ...prev, ...saveRes.data }));
      toast.success("Profile photo updated successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload profile photo");
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Handle Photo Removal
  const handleRemoveAvatar = async () => {
    setUploadingAvatar(true);
    try {
      const res = await updateMeAction({ image: "" });
      if (res.success) {
        setUser((prev) => ({ ...prev, image: null }));
        toast.success("Profile photo removed");
      } else {
        toast.error(res.error || "Failed to remove photo");
      }
    } catch {
      toast.error("Network error removing photo");
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Handle Email OTP Send
  const handleSendEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    setEmailLoading(true);
    try {
      const res = await sendEmailOtpAction(newEmail.trim());
      if (res.success) {
        setEmailOtpSent(true);
        toast.success("Verification code sent to " + newEmail.trim());
      } else {
        toast.error(res.error || "Failed to send code");
      }
    } catch {
      toast.error("Network error sending code");
    } finally {
      setEmailLoading(false);
    }
  };

  // Handle Email OTP Verification
  const handleVerifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOtp.trim()) return;

    setEmailLoading(true);
    try {
      const res = await verifyEmailOtpAction(newEmail.trim(), emailOtp.trim());
      if (res.success && res.data) {
        setUser((prev) => ({
          ...prev,
          ...res.data,
          email: newEmail.trim(),
          emailVerified: true,
        }));
        setShowEmailChange(false);
        setEmailOtpSent(false);
        setNewEmail("");
        setEmailOtp("");
        toast.success("Email address updated and verified");
      } else {
        toast.error(res.error || "Invalid or expired verification code");
      }
    } catch {
      toast.error("Network error verifying code");
    } finally {
      setEmailLoading(false);
    }
  };

  // Handle Phone OTP Send
  const handleSendPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhone.trim()) return;

    setPhoneLoading(true);
    try {
      const res = await sendPhoneOtpAction(newPhone.trim());
      if (res.success) {
        setPhoneOtpSent(true);
        toast.success("SMS verification code sent to " + newPhone.trim());
      } else {
        toast.error(res.error || "Failed to send SMS code");
      }
    } catch {
      toast.error("Network error sending SMS");
    } finally {
      setPhoneLoading(false);
    }
  };

  // Handle Phone OTP Verification
  const handleVerifyPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneOtp.trim()) return;

    setPhoneLoading(true);
    try {
      const res = await verifyPhoneOtpAction(newPhone.trim(), phoneOtp.trim());
      if (res.success && res.data) {
        setUser((prev) => ({
          ...prev,
          ...res.data,
          phoneNumber: newPhone.trim(),
          phoneNumberVerified: true,
        }));
        setShowPhoneChange(false);
        setPhoneOtpSent(false);
        setNewPhone("");
        setPhoneOtp("");
        toast.success("Phone number updated and verified");
      } else {
        toast.error(res.error || "Invalid or expired verification code");
      }
    } catch {
      toast.error("Network error verifying code");
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleCopyId = () => {
    if (!user.id) return;
    navigator.clipboard.writeText(user.id);
    setCopiedId(true);
    toast.success("User ID copied to clipboard");
    setTimeout(() => setCopiedId(false), 2000);
  };

  const initials = user.name
    ? user.name
        .split(" ")
        .filter(Boolean)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email
    ? user.email[0].toUpperCase()
    : "A";

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "Active Member";

  return (
    <div className="flex flex-col gap-5 max-w-4xl">
      {/* Minimal Header */}
      <div className="flex flex-col gap-1 pb-1">
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          Account Profile
        </h1>
        <p className="text-xs text-muted-foreground">
          Manage your personal credentials, contact channels, and console security
        </p>
      </div>

      {/* Flat Unified Settings Container */}
      <div className="overflow-hidden border border-border/50 bg-card shadow-none divide-y divide-border/40">
        
        {/* ROW 1: Profile Photo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 items-start">
          <div className="space-y-1">
            <h2 className="text-xs font-semibold text-foreground">Profile Photo</h2>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Your avatar displayed in the console header and audit trails
            </p>
          </div>
          <div className="md:col-span-2 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="relative">
              <Avatar className="size-16 border border-border/70 shrink-0 bg-muted">
                {user.image ? (
                  <AvatarImage src={user.image} alt={user.name || "User"} className="object-cover" />
                ) : null}
                <AvatarFallback className="text-sm font-semibold bg-muted text-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {uploadingAvatar && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/70 rounded-full">
                  <Loader2 className="size-4 animate-spin text-primary" />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarFileSelect}
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingAvatar}
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8 text-xs font-normal gap-1.5"
                >
                  <Camera className="size-3.5" />
                  <span>{uploadingAvatar ? "Uploading..." : "Upload New Photo"}</span>
                </Button>

                {user.image && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={uploadingAvatar}
                    onClick={handleRemoveAvatar}
                    className="h-8 text-xs font-normal text-muted-foreground hover:text-destructive"
                  >
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Supported formats: JPG, PNG, WebP or AVIF (max 10 MB).
              </p>
            </div>
          </div>
        </div>

        {/* ROW 2: Display Name */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 items-start">
          <div className="space-y-1">
            <h2 className="text-xs font-semibold text-foreground">Display Name</h2>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Your full name associated with platform actions
            </p>
          </div>
          <div className="md:col-span-2">
            <form onSubmit={handleUpdateName} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 max-w-md">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="h-8 text-xs border-border/50 bg-background shadow-none"
              />
              <Button
                type="submit"
                size="sm"
                disabled={savingName || !name.trim() || name.trim() === user.name}
                className="h-8 text-xs font-normal gap-1.5 shrink-0"
              >
                {savingName ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Save className="size-3.5" />
                )}
                <span>Save</span>
              </Button>
            </form>
          </div>
        </div>

        {/* ROW 3: Email Address */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 items-start">
          <div className="space-y-1">
            <h2 className="text-xs font-semibold text-foreground">Email Address</h2>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Primary email used for sign-in and security notifications
            </p>
          </div>
          <div className="md:col-span-2 space-y-3">
            {!showEmailChange ? (
              <div className="flex flex-wrap items-center justify-between gap-3 max-w-lg">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-xs font-medium text-foreground truncate">
                    {user.email || "No email linked"}
                  </span>
                  {user.email && (
                    user.emailVerified ? (
                      <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/10 border-emerald-500/20 font-normal gap-1 py-0 h-5">
                        <CheckCircle2 className="size-3" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-amber-600 bg-amber-500/10 border-amber-500/20 font-normal py-0 h-5">
                        Unverified
                      </Badge>
                    )
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowEmailChange(true);
                    setNewEmail("");
                    setEmailOtpSent(false);
                    setEmailOtp("");
                  }}
                  className="h-7 text-xs font-normal"
                >
                  Change Email
                </Button>
              </div>
            ) : (
              <div className="p-3.5 rounded border border-border/60 bg-muted/20 max-w-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    <Mail className="size-3.5 text-primary" />
                    Update Email Address
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowEmailChange(false)}
                    className="size-6 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>

                {!emailOtpSent ? (
                  <form onSubmit={handleSendEmailOtp} className="space-y-2.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-foreground">
                        New Email Address
                      </label>
                      <Input
                        type="email"
                        required
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="new.email@kairos.io"
                        className="h-8 text-xs font-mono bg-background border-border/50 shadow-none"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        type="submit"
                        size="sm"
                        disabled={emailLoading || !newEmail.trim()}
                        className="h-8 text-xs font-normal gap-1.5"
                      >
                        {emailLoading ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <ArrowRight className="size-3.5" />
                        )}
                        <span>Send Verification Code</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowEmailChange(false)}
                        className="h-8 text-xs font-normal text-muted-foreground"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyEmailOtp} className="space-y-2.5">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-foreground">
                          Enter 6-digit code sent to <strong className="font-mono text-foreground">{newEmail}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => setEmailOtpSent(false)}
                          className="text-primary hover:underline text-[11px]"
                        >
                          Change email
                        </button>
                      </div>
                      <Input
                        type="text"
                        maxLength={6}
                        required
                        value={emailOtp}
                        onChange={(e) => setEmailOtp(e.target.value)}
                        placeholder="000000"
                        className="h-8 font-mono text-center tracking-widest text-sm bg-background border-border/50 max-w-[150px]"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        type="submit"
                        size="sm"
                        disabled={emailLoading || emailOtp.trim().length !== 6}
                        className="h-8 text-xs font-normal gap-1.5"
                      >
                        {emailLoading && <Loader2 className="size-3.5 animate-spin" />}
                        <span>Verify & Update</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={emailLoading}
                        onClick={handleSendEmailOtp}
                        className="h-8 text-xs font-normal text-muted-foreground"
                      >
                        Resend Code
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowEmailChange(false)}
                        className="h-8 text-xs font-normal text-muted-foreground"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ROW 4: Mobile Number */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 items-start">
          <div className="space-y-1">
            <h2 className="text-xs font-semibold text-foreground">Mobile Number</h2>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Used for SMS OTP authentication and critical operational alerts
            </p>
          </div>
          <div className="md:col-span-2 space-y-3">
            {!showPhoneChange ? (
              <div className="flex flex-wrap items-center justify-between gap-3 max-w-lg">
                <div className="flex items-center gap-2 min-w-0">
                  {user.phoneNumber ? (
                    <>
                      <span className="font-mono text-xs font-medium text-foreground">
                        {user.phoneNumber}
                      </span>
                      {user.phoneNumberVerified ? (
                        <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/10 border-emerald-500/20 font-normal gap-1 py-0 h-5">
                          <CheckCircle2 className="size-3" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-amber-600 bg-amber-500/10 border-amber-500/20 font-normal py-0 h-5">
                          Unverified
                        </Badge>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">
                      No mobile number configured
                    </span>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowPhoneChange(true);
                    setNewPhone("");
                    setPhoneOtpSent(false);
                    setPhoneOtp("");
                  }}
                  className="h-7 text-xs font-normal"
                >
                  {user.phoneNumber ? "Change Number" : "Add Number"}
                </Button>
              </div>
            ) : (
              <div className="p-3.5 rounded border border-border/60 bg-muted/20 max-w-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    <Phone className="size-3.5 text-primary" />
                    Verify Mobile Number
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPhoneChange(false)}
                    className="size-6 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>

                {!phoneOtpSent ? (
                  <form onSubmit={handleSendPhoneOtp} className="space-y-2.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-foreground">
                        Mobile Phone Number (E.164 Format)
                      </label>
                      <Input
                        type="tel"
                        required
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        placeholder="+919876543210"
                        className="h-8 text-xs font-mono bg-background border-border/50 shadow-none"
                      />
                      <p className="text-[11px] text-muted-foreground pt-0.5">
                        Include country code, e.g. <span className="font-mono text-foreground">+919876543210</span>. A 6-digit SMS OTP will be dispatched.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        type="submit"
                        size="sm"
                        disabled={phoneLoading || !newPhone.trim()}
                        className="h-8 text-xs font-normal gap-1.5"
                      >
                        {phoneLoading ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <ArrowRight className="size-3.5" />
                        )}
                        <span>Send SMS Code</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPhoneChange(false)}
                        className="h-8 text-xs font-normal text-muted-foreground"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyPhoneOtp} className="space-y-2.5">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-foreground">
                          SMS OTP dispatched to <strong className="font-mono text-foreground">{newPhone}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => setPhoneOtpSent(false)}
                          className="text-primary hover:underline text-[11px]"
                        >
                          Change number
                        </button>
                      </div>
                      <Input
                        type="text"
                        maxLength={6}
                        required
                        value={phoneOtp}
                        onChange={(e) => setPhoneOtp(e.target.value)}
                        placeholder="000000"
                        className="h-8 font-mono text-center tracking-widest text-sm bg-background border-border/50 max-w-[150px]"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        type="submit"
                        size="sm"
                        disabled={phoneLoading || phoneOtp.trim().length !== 6}
                        className="h-8 text-xs font-normal gap-1.5"
                      >
                        {phoneLoading && <Loader2 className="size-3.5 animate-spin" />}
                        <span>Verify & Save</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={phoneLoading}
                        onClick={handleSendPhoneOtp}
                        className="h-8 text-xs font-normal text-muted-foreground"
                      >
                        Resend SMS
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPhoneChange(false)}
                        className="h-8 text-xs font-normal text-muted-foreground"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ROW 5: Security & Platform Access */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 items-start">
          <div className="space-y-1">
            <h2 className="text-xs font-semibold text-foreground">Console Access & Role</h2>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Permissions and workspace attribution assigned to your account
            </p>
          </div>
          <div className="md:col-span-2 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg text-xs">
              <div className="p-2.5 rounded border border-border/40 bg-muted/10 space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Platform Role</span>
                <div className="flex items-center gap-1.5 pt-0.5">
                  <ShieldCheck className="size-3.5 text-primary" />
                  <Badge variant="outline" className="font-mono text-[10px] font-normal uppercase py-0">
                    {user.role || "SUPER_ADMIN"}
                  </Badge>
                </div>
              </div>

              <div className="p-2.5 rounded border border-border/40 bg-muted/10 space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Member Since</span>
                <p className="font-mono text-xs text-foreground pt-0.5">
                  {memberSince}
                </p>
              </div>

              <div className="sm:col-span-2 p-2.5 rounded border border-border/40 bg-muted/10 flex items-center justify-between">
                <div className="space-y-0.5 min-w-0 pr-2">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Unique Identity ID</span>
                  <p className="font-mono text-[11px] text-muted-foreground truncate">
                    {user.id || "N/A"}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyId}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground shrink-0 gap-1"
                >
                  {copiedId ? (
                    <>
                      <Check className="size-3 text-emerald-600" />
                      <span className="text-[11px] text-emerald-600">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3" />
                      <span className="text-[11px]">Copy</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
