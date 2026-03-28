'use client';

import { Card, CardContent } from '@/components/ui/card';

const guideContent = `
# TubeSync Pro Installation Guide

## 1. Frontend (Next.js)
1. Clone repo
2. cd into project
3. npm install
4. Setup Supabase project, run supabase_schema.sql
5. Set SUPABASE_URL and ANON_KEY in .env.local
6. npm run dev

## 2. Backend Worker (Python)
1. cd python-worker
2. cp .env.example .env, fill vars
3. pip install -r requirements.txt
4. python youtube_uploader.py

## 3. Google Apps Script
1. Create GAS project with upload_to_drive.gs
2. Deploy as Web App (Anyone)
3. Update GAS URL in frontend

## 4. Supabase Setup
- Run schema
- Enable RLS
`;

export default function GuidePage() {
  return (
    <div className="max-w-4xl mx-auto prose prose-slate dark:prose-invert">
      <Card>
        <CardContent className="pt-6">
          <div className="prose max-w-none">
            <div dangerouslySetInnerHTML={{ __html: guideContent.replace(/\n/g, '<br>') }} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

