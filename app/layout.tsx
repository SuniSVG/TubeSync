import type {Metadata} from 'next';
import './globals.css';
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: 'TubeSync - Super Auto Flow for YouTube',
  description: 'TubeSync is a powerful tool that allows you to automate your YouTube workflow. With TubeSync, you can easily manage your YouTube channel, schedule uploads, and track your performance. Whether you are a content creator or a marketer, TubeSync has everything you need to succeed on YouTube.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
