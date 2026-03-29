 'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutDashboard, BookOpen, Users, BarChart3, Upload, Calendar, Settings, History } from 'lucide-react';

export default function DashboardTabs({ children }: { children: React.ReactNode }) {
  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full grid-cols-8">
        <TabsTrigger value="overview"><LayoutDashboard className="h-4 w-4 mr-2" /> Overview</TabsTrigger>
        <TabsTrigger value="guide"><BookOpen className="h-4 w-4 mr-2" /> Guide</TabsTrigger>
        <TabsTrigger value="channels"><Users className="h-4 w-4 mr-2" /> Channels</TabsTrigger>
        <TabsTrigger value="analytics"><BarChart3 className="h-4 w-4 mr-2" /> Analytics</TabsTrigger>
        <TabsTrigger value="upload"><Upload className="h-4 w-4 mr-2" /> Upload</TabsTrigger>
        <TabsTrigger value="schedule"><Calendar className="h-4 w-4 mr-2" /> Schedule</TabsTrigger>
        <TabsTrigger value="history"><History className="h-4 w-4 mr-2" /> History</TabsTrigger>
        <TabsTrigger value="settings"><Settings className="h-4 w-4 mr-2" /> Settings</TabsTrigger>
      </TabsList>
      {children}
    </Tabs>
  );
}
