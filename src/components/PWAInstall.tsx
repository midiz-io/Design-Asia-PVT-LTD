import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, Smartphone, Monitor, X, CheckCircle, RefreshCw } from 'lucide-react';
import { pwaManager } from '@/utils/pwa';

const PWAInstall: React.FC = () => {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // Check if app is installable
    const checkInstallability = () => {
      setIsInstallable(pwaManager.isInstallable());
      setIsInstalled(pwaManager.isInstalled());
    };

    // Check for updates
    const checkForUpdates = async () => {
      const updateAvailable = await pwaManager.checkForUpdates();
      setHasUpdate(updateAvailable);
    };

    checkInstallability();
    checkForUpdates();

    // Listen for changes
    const interval = setInterval(() => {
      checkInstallability();
      checkForUpdates();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      const success = await pwaManager.installApp();
      if (success) {
        setIsInstalled(true);
        setIsInstallable(false);
      }
    } catch (error) {
      console.error('Installation failed:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      await pwaManager.updateApp();
    } catch (error) {
      console.error('Update failed:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Don't show if already installed or not installable
  if (isInstalled || (!isInstallable && !hasUpdate)) {
    return null;
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4">
          <Download className="w-8 h-8 text-white" />
        </div>
        <CardTitle className="text-xl">
          {hasUpdate ? 'Update Available' : 'Install TaskVision'}
        </CardTitle>
        <CardDescription>
          {hasUpdate 
            ? 'A new version is ready with improved features and performance.'
            : 'Install TaskVision on your device for quick access and offline functionality.'
          }
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {hasUpdate ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="w-4 h-4" />
              <span>New features and improvements available</span>
            </div>
            
            <Button 
              onClick={handleUpdate} 
              disabled={isUpdating}
              className="w-full"
            >
              {isUpdating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Update Now
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <Smartphone className="w-5 h-5 text-blue-500" />
                <div>
                  <div className="text-sm font-medium">Mobile</div>
                  <div className="text-xs text-muted-foreground">iOS & Android</div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <Monitor className="w-5 h-5 text-green-500" />
                <div>
                  <div className="text-sm font-medium">Desktop</div>
                  <div className="text-xs text-muted-foreground">Windows & Mac</div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Offline access to your data</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Faster loading and performance</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Native app-like experience</span>
              </div>
            </div>

            <Button 
              onClick={handleInstall} 
              disabled={isInstalling}
              className="w-full"
              size="lg"
            >
              {isInstalling ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Installing...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Install App
                </>
              )}
            </Button>

            <div className="text-center">
              <Badge variant="secondary" className="text-xs">
                Free • No App Store Required
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PWAInstall;
