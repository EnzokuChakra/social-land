"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { AlertCircle, Clock, Wrench } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import io from "socket.io-client";

export default function AdminSettingsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState(
    "We're making some improvements to bring you a better experience. We'll be back shortly!"
  );

  // Check if user is MASTER_ADMIN
  useEffect(() => {
    if (status === "loading") return;
    
    if (!session || session.user.role !== "MASTER_ADMIN") {
      toast.error("You don't have permission to access this page");
      router.push("/dashboard/admin");
    } else {
      // Fetch maintenance settings
      fetchMaintenanceSettings();
    }
  }, [session, status, router]);

  // Fetch maintenance settings
  const fetchMaintenanceSettings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/settings/maintenance');
      if (response.ok) {
        const data = await response.json();
        setMaintenanceMode(data.maintenanceMode || false);
        setMaintenanceMessage(data.message || "We're making some improvements to bring you a better experience. We'll be back shortly!");
      }
    } catch (error) {
      console.error('Error fetching maintenance settings:', error);
      toast.error("Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  };

  // Save maintenance settings
  const saveMaintenanceSettings = async () => {
    try {
      setIsSaving(true);
      
      // Emit maintenance mode change to socket server
      const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5002");
      socket.emit("maintenanceMode", {
        maintenanceMode,
        message: maintenanceMessage,
      });
      
      // Update the database
      const response = await fetch('/api/admin/settings/maintenance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          maintenanceMode,
          message: maintenanceMessage,
        }),
      });
      
      if (response.ok) {
        toast.success("Settings saved successfully");
        socket.disconnect();
      } else {
        toast.error("Failed to save settings");
      }
    } catch (error) {
      console.error('Error saving maintenance settings:', error);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  // If loading or unauthorized, show loading state
  if (status === "loading" || isLoading || !session || session.user.role !== "MASTER_ADMIN") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          <p className="text-sm text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Maintenance Mode
          </CardTitle>
          <CardDescription>
            Enable maintenance mode to temporarily restrict access to the application.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="maintenanceMode">Maintenance Mode</Label>
              <p className="text-sm text-muted-foreground">
                When enabled, only administrators can access the site.
              </p>
            </div>
            <Switch
              id="maintenanceMode"
              checked={maintenanceMode}
              onCheckedChange={setMaintenanceMode}
            />
          </div>
          
          <div className="space-y-2 mt-4">
            <Label htmlFor="maintenanceMessage">Maintenance Message</Label>
            <Textarea 
              id="maintenanceMessage" 
              value={maintenanceMessage}
              onChange={(e) => setMaintenanceMessage(e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={saveMaintenanceSettings} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 