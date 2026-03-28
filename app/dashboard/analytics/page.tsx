'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

export default function AnalyticsPage() {
  const [data, setData] = useState<any>({ videos: [], stats: {}, quota: 0 });

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: videosData } = await supabase
      .from('videos')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: true });

    const statusCounts = videosData?.reduce((acc, v) => {
      acc[v.status] = (acc[v.status] || 0) + 1;
      return acc;
    }, {});

    // Mock real data structure - replace with YT API
    const chartData = videosData?.map(v => ({
      date: new Date(v.created_at).toLocaleDateString(),
      uploads: 1,
    })) || [];

    setData({
      videos: videosData || [],
      statusCounts,
      chartData: chartData.slice(-30), // Last 30 days
      quota: 5 // From profiles
    });
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <Card><CardHeader><CardTitle>Total Uploads</CardTitle></CardHeader><CardContent><h2 className="text-3xl font-bold">{data.videos.length}</h2></CardContent></Card>
        <Card><CardHeader><CardTitle>Success Rate</CardTitle></CardHeader><CardContent><h2 className="text-3xl font-bold">{((data.videos.filter((v: any) => v.status === 'uploaded').length / data.videos.length * 100) || 0).toFixed(1)}%</h2></CardContent></Card>
        <Card><CardHeader><CardTitle>Pending Queue</CardTitle></CardHeader><CardContent><h2 className="text-3xl font-bold">{data.statusCounts.pending || 0}</h2></CardContent></Card>
        <Card><CardHeader><CardTitle>Quota Used</CardTitle></CardHeader><CardContent><h2 className="text-3xl font-bold">{data.quota || 0}%</h2></CardContent></Card>
      </div>

      {/* 8 Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Uploads Over Time */}
        <Card>
          <CardHeader><CardTitle>Upload Progress (Last 30 Days)</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer>
              <LineChart data={data.chartData}>
                <Line type="monotone" dataKey="uploads" stroke="#8884d8" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 2. Status Distribution */}
        <Card>
          <CardHeader><CardTitle>Video Status</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={Object.entries(data.statusCounts || {}).map(([name, value]) => ({ name, value }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
                  {Object.entries(data.statusCounts || {}).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 3. Videos Per Month */}
        <Card>
          <CardHeader><CardTitle>Videos per Month</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer>
              <BarChart data={groupByMonth(data.videos)}>
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 4. Quota Usage */}
        <Card>
          <CardHeader><CardTitle>Quota Usage</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={[{name: 'Used', value: data.quota || 0}, {name: 'Remaining', value: 100 - (data.quota || 0)}]} dataKey="value" cx="50%" cy="50%" outerRadius={80} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 5. Success Rate */}
        <Card>
          <CardHeader><CardTitle>Success vs Failed</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={[
                  {name: 'Success', value: data.statusCounts.uploaded || 0},
                  {name: 'Failed', value: data.statusCounts.failed || 0}
                ]} dataKey="value" />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 6. Queue Status */}
        <Card>
          <CardHeader><CardTitle>Current Queue</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer>
              <BarChart data={[{pending: data.statusCounts.pending || 0, processing: data.statusCounts.processing || 0}]}>
                <Bar dataKey="pending" fill="#82ca9d" />
                <Bar dataKey="processing" fill="#ffc658" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 7. App Uploaded */}
        <Card>
          <CardHeader><CardTitle>App Uploaded Videos</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={[
                  {name: 'TubeSync', value: data.videos.filter((v: any) => v.app_uploaded).length || 0},
                  {name: 'Manual', value: data.videos.length - (data.videos.filter((v: any) => v.app_uploaded).length || 0)}
                ]} dataKey="value" />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 8. Channel Stats Trend (mock) */}
        <Card>
          <CardHeader><CardTitle>Channel Growth</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer>
              <LineChart data={[{month: 'Jan', subs: 1000}, {month: 'Feb', subs: 1200}, {month: 'Mar', subs: 1500}]}>
                <Line type="monotone" dataKey="subs" stroke="#8884d8" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function groupByMonth(videos: any[]) {
  const groups: Record<string, number> = {};
  videos.forEach((v: any) => {
    const month = new Date(v.created_at).toLocaleDateString('en', { month: 'short', year: 'numeric' });
    groups[month] = (groups[month] || 0) + 1;
  });
  return Object.entries(groups).map(([name, count]) => ({ name, count }));
}
