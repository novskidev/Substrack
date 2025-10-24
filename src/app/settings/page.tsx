"use client";

import { useState, useEffect, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { ArrowLeft, RefreshCw, Save, Lock, User, Image as ImageIcon, DollarSign } from "lucide-react";
import { CURRENCIES } from "@/constants/currencies";
import { getBearerToken } from "@/lib/auth-token";

interface ProfileData {
  id: string;
  name: string;
  email: string;
  image: string | null;
  currency: string;
}

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export default function SettingsPage() {
  const router = useRouter();
  const { data: session, isPending, refetch } = useSession();
  
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  
  // Profile form state
  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [isReadingImage, setIsReadingImage] = useState(false);
  
  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Protect route
  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  // Fetch profile data
  const fetchProfile = async () => {
    try {
      setLoading(true);
      setProfileError(null);
      const token = getBearerToken();
      const headers: Record<string, string> = {};

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch("/api/profile", { headers });

      if (!response.ok) {
        let message = "Failed to load profile";

        try {
          const errorBody = await response.json();
          if (errorBody?.error) {
            message = errorBody.error;
          }
        } catch {
          // Ignore JSON parsing issues and fall back to default message.
        }

        if (response.status === 401) {
          message = "Session expired. Please sign in again.";
          toast.error(message);
          setProfileError(message);
          router.push("/login");
          return;
        }

        setProfileError(message);
        toast.error(message);
        return;
      }
      
      const data: ProfileData = await response.json();
      setProfile(data);
      setName(data.name);
      setImage(data.image || "");
      setCurrency(data.currency);
      setProfileError(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load profile";
      setProfileError(message);
      toast.error(message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchProfile();
    }
  }, [session]);

  // Use session data as an immediate fallback while profile data loads.
  useEffect(() => {
    if (session?.user) {
      setName(session.user.name ?? "");
      setImage(session.user.image ?? "");
      setCurrency(session.user.currency ?? "USD");
    }
  }, [session]);

  const fallbackProfile: ProfileData | null = session?.user
    ? {
        id: session.user.id,
        name: session.user.name ?? "",
        email: session.user.email ?? "",
        image: session.user.image ?? null,
        currency: session.user.currency ?? "USD",
      }
    : null;

  const currentProfile = profile ?? fallbackProfile;

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file.");
      input.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      toast.error("Image must be 5MB or smaller.");
      input.value = "";
      return;
    }

    setIsReadingImage(true);

    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;

      if (typeof result === "string") {
        setImage(result);
      } else {
        toast.error("Unsupported image format.");
      }

      setIsReadingImage(false);
      input.value = "";
    };

    reader.onerror = () => {
      toast.error("Failed to read image file.");
      setIsReadingImage(false);
      input.value = "";
    };

    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImage("");
  };

  // Update profile
  const handleUpdateProfile = async () => {
    if (isReadingImage) {
      toast.info("Please wait for the image to finish processing.");
      return;
    }

    if (!session?.user) {
      toast.error("You must be signed in to update your profile.");
      return;
    }

    const baselineName = profile?.name ?? session.user.name ?? "";
    const baselineImage = profile?.image ?? session.user.image ?? "";
    const baselineCurrency =
      profile?.currency ?? session.user.currency ?? "USD";

    const updates: { name?: string; image?: string | null; currency?: string } =
      {};

    if (name !== baselineName) {
      updates.name = name;
    }
    if (image !== baselineImage) {
      updates.image = image.trim() === "" ? null : image;
    }
    if (currency !== baselineCurrency) {
      updates.currency = currency;
    }

    if (Object.keys(updates).length === 0) {
      toast.info("No changes to save");
      return;
    }

    try {
      setSaving(true);
      const token = getBearerToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers,
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        let message = "Failed to update profile";

        try {
          const errorBody = await response.json();
          if (errorBody?.error) {
            message = errorBody.error;
          }
        } catch {
          // Ignore parse errors and use default message.
        }

        if (response.status === 401) {
          message = "Session expired. Please sign in again.";
          toast.error(message);
          router.push("/login");
          return;
        }

        throw new Error(message);
      }

      const updatedProfile = await response.json();
      setProfile(updatedProfile);
      setName(updatedProfile.name);
      setImage(updatedProfile.image || "");
      setCurrency(updatedProfile.currency);
      setProfileError(null);
      await refetch(); // Refresh session to update user data in header
      toast.success("Profile updated successfully");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update profile";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  // Update password
  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("All password fields are required");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    
    try {
      setSavingPassword(true);
      const token = getBearerToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
      const response = await fetch("/api/profile/password", {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          const message = "Session expired. Please sign in again.";
          toast.error(message);
          router.push("/login");
          return;
        }

        let message = "Failed to update password";

        try {
          const errorBody = await response.json();
          if (errorBody?.error) {
            message = errorBody.error;
          }
        } catch {
          // Ignore parse errors and use default message.
        }

        throw new Error(message);
      }
      
      toast.success("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update password");
    } finally {
      setSavingPassword(false);
    }
  };

  if ((isPending && !session?.user) || (loading && !currentProfile)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <RefreshCw className="h-12 w-12 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      <div className="container mx-auto p-6 max-w-4xl space-y-8">
        {profileError && (
          <Alert variant="destructive">
            <AlertTitle>Unable to load profile details</AlertTitle>
            <AlertDescription>
              <p>{profileError}</p>
            </AlertDescription>
          </Alert>
        )}
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground mt-2">
              Manage your account settings and preferences
            </p>
          </div>
        </div>

        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Update your name and profile picture
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={currentProfile?.email ?? ""}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="image-upload" className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" aria-hidden="true" />
                Profile Picture
              </Label>
              <Input
                id="image-upload"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={isReadingImage}
              />
              <p className="text-xs text-muted-foreground">
                PNG, JPG, or GIF up to 5MB.
              </p>
              {image && (
                <div className="mt-2 flex items-center gap-4">
                  <img
                    src={image}
                    alt="Profile preview"
                    className="h-20 w-20 rounded-full object-cover border-2 border-border"
                    onError={(e) => {
                      e.currentTarget.src = "https://via.placeholder.com/80?text=Invalid";
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveImage}
                    disabled={saving || isReadingImage}
                  >
                    Remove
                  </Button>
                </div>
              )}
              {isReadingImage && (
                <p className="text-xs text-muted-foreground">Processing image...</p>
              )}
            </div>
            
            <Button
              onClick={handleUpdateProfile}
              disabled={saving || isReadingImage}
              className="w-full sm:w-auto"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Currency Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Currency Preference
            </CardTitle>
            <CardDescription>
              Choose your preferred currency for displaying subscription costs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((curr) => (
                    <SelectItem key={curr.code} value={curr.code}>
                      {curr.symbol} {curr.code} - {curr.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button
              onClick={handleUpdateProfile}
              disabled={saving}
              className="w-full sm:w-auto"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Currency
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Separator />

        {/* Password Change */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Change Password
            </CardTitle>
            <CardDescription>
              Update your password to keep your account secure
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                autoComplete="off"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 8 characters)"
                autoComplete="off"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                autoComplete="off"
              />
            </div>
            
            <Button
              onClick={handleUpdatePassword}
              disabled={savingPassword}
              variant="secondary"
              className="w-full sm:w-auto"
            >
              {savingPassword ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Update Password
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
