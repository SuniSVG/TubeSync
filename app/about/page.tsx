'use client';

import Link from 'next/link';
import { Youtube, Linkedin, Twitter, Github, ArrowLeft, Heart, Zap, Shield } from 'lucide-react';

const team = [
  {
    name: 'Alex Nguyen',
    role: 'Founder & CEO',
    bio: 'Cựu kỹ sư tại Google với hơn 10 năm kinh nghiệm trong lĩnh vực Automation và Media.',
    image: 'AN',
    social: { linkedin: '#', twitter: '#' }
  },
  {
    name: 'Minh Trần',
    role: 'CTO',
    bio: 'Chuyên gia hệ thống phân tán và tối ưu hóa tài nguyên đám mây.',
    image: 'MT',
    social: { linkedin: '#', github: '#' }
  },
  {
    name: 'Sarah Pham',
    role: 'Head of Product',
    bio: 'Đam mê tạo ra các công cụ giúp nhà sáng tạo nội dung tự động hóa quy trình làm việc.',
    image: 'SP',
    social: { linkedin: '#', twitter: '#' }
  }
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#f5f4f0] font-sans selection:bg-red-100 selection:text-red-600">
      {/* Simple Nav */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 h-16 flex items-center justify-between px-8">
        <Link href="/" className="flex items-center gap-2 no-underline">
          <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center shadow-lg shadow-red-500/30">
            <Youtube className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-slate-900 tracking-tight">TUBE<span className="text-red-600">SYNC</span></span>
        </Link>
        <Link href="/" className="text-sm font-medium text-slate-500 hover:text-slate-900 flex items-center gap-1 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Quay lại trang chủ
        </Link>
      </nav>

      {/* Hero Section */}
      <section className="py-24 px-6 text-center max-w-4xl mx-auto">
        <h1 className="text-5xl md:text-6xl font-black text-slate-900 mb-6 tracking-tight">
          Sứ mệnh của chúng tôi là <span className="text-red-600">giải phóng</span> sự sáng tạo.
        </h1>
        <p className="text-lg text-slate-500 leading-relaxed">
          TubeSync Pro ra đời từ nhu cầu thực tế của các nhà sáng tạo nội dung. Chúng tôi tin rằng bạn nên dành thời gian để tạo ra những video tuyệt vời, thay vì lãng phí hàng giờ cho việc upload và quản lý thủ công.
        </p>
      </section>

      {/* Team Grid */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Gặp gỡ đội ngũ sáng lập</h2>
            <p className="text-slate-500">Những con người đứng sau cuộc cách mạng tự động hóa YouTube.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {team.map((member) => (
              <div key={member.name} className="group">
                <div className="w-32 h-32 rounded-3xl bg-slate-100 mb-6 flex items-center justify-center text-3xl font-bold text-slate-400 group-hover:bg-red-50 group-hover:text-red-500 transition-all duration-300">
                  {member.image}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-1">{member.name}</h3>
                <p className="text-red-600 font-semibold text-sm mb-4">{member.role}</p>
                <p className="text-slate-500 text-sm leading-relaxed mb-6">
                  {member.bio}
                </p>
                <div className="flex gap-4">
                  {member.social.linkedin && <Link href="#" className="text-slate-400 hover:text-blue-600"><Linkedin className="w-5 h-5" /></Link>}
                  {member.social.twitter && <Link href="#" className="text-slate-400 hover:text-sky-500"><Twitter className="w-5 h-5" /></Link>}
                  {member.social.github && <Link href="#" className="text-slate-400 hover:text-slate-900"><Github className="w-5 h-5" /></Link>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-24 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="space-y-4">
            <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto text-red-600">
              <Heart className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-900">Tận tâm</h4>
            <p className="text-xs text-slate-500 leading-relaxed">Luôn lắng nghe phản hồi của khách hàng để hoàn thiện sản phẩm.</p>
          </div>
          <div className="space-y-4">
            <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto text-red-600">
              <Zap className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-900">Tốc độ</h4>
            <p className="text-xs text-slate-500 leading-relaxed">Cung cấp giải pháp nhanh nhất, ổn định nhất cho quy trình của bạn.</p>
          </div>
          <div className="space-y-4">
            <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto text-red-600">
              <Shield className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-900">Bảo mật</h4>
            <p className="text-xs text-slate-500 leading-relaxed">Dữ liệu và kênh của bạn là tài sản quý giá nhất, chúng tôi bảo vệ nó.</p>
          </div>
        </div>
      </section>

      {/* Join Us */}
      <section className="py-24 text-center">
        <h2 className="text-3xl font-bold mb-8">Bạn muốn đồng hành cùng chúng tôi?</h2>
        <Link href="mailto:careers@tubesync.pro" className="bg-slate-900 text-white px-8 py-3 rounded-full font-bold hover:bg-slate-800 transition-all">
          Xem vị trí đang tuyển dụng
        </Link>
      </section>

      <footer className="py-12 border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Youtube className="w-5 h-5 text-red-600" />
            <span className="text-xs text-slate-400 font-medium">© 2024 TubeSync Pro. Made for creators.</span>
          </div>
          <div className="flex gap-8">
            <Link href="/privacy" className="text-xs text-slate-400 hover:text-slate-600 no-underline">Bảo mật</Link>
            <Link href="/terms" className="text-xs text-slate-400 hover:text-slate-600 no-underline">Điều khoản</Link>
            <Link href="/about" className="text-xs text-slate-400 hover:text-slate-600 no-underline">Đội ngũ</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}