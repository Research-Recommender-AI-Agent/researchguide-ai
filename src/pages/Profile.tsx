import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, User, Mail, Calendar, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import scientistIcon from '@/assets/scientist-icon.png';

const Profile = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [userType, setUserType] = useState('호기심 많은 과학자');
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
      return;
    }
    setUser(session.user);
    loadProfile(session.user.id);
  };

  const loadProfile = async (userId: string) => {
    try {
      const [profileRes, bookmarksRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', userId).single(),
        supabase.from('bookmarks').select('*').eq('user_id', userId)
      ]);

      if (profileRes.error) throw profileRes.error;
      setProfile(profileRes.data);
      
      if (!bookmarksRes.error) {
        setBookmarks(bookmarksRes.data || []);
        // 북마크 기반으로 회원 유형 결정
        const keywords = bookmarksRes.data?.flatMap((b: any) => b.keywords || []) || [];
        if (keywords.includes('climate') || keywords.includes('environment')) {
          setUserType('환경을 사랑하는 연구자');
        } else if (keywords.includes('AI') || keywords.includes('machine learning') || keywords.includes('deep learning')) {
          setUserType('현학적인 AI 공학자');
        } else if (keywords.includes('bio') || keywords.includes('medical')) {
          setUserType('생명을 구하는 의학자');
        } else if (keywords.includes('quantum')) {
          setUserType('미래를 보는 물리학자');
        } else {
          setUserType('호기심 많은 과학자');
        }
      }
    } catch (error: any) {
      toast.error('프로필을 불러오는데 실패했습니다.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header responseTime={null} showMetrics={false} onToggleMetrics={() => {}} />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header responseTime={null} showMetrics={false} onToggleMetrics={() => {}} />
      
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">내 정보</h1>
            <p className="text-muted-foreground mt-1">회원 정보를 확인하세요</p>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-8 shadow-lg">
          <div className="flex items-center gap-6 mb-8">
            <div className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center">
              <img src={scientistIcon} alt="Profile" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-foreground">{profile?.full_name || '연구자'}</h2>
                <span className="px-3 py-1 bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 rounded-full text-sm font-medium border border-purple-200">
                  {userType}
                </span>
              </div>
              <p className="text-muted-foreground mt-1">연구를 사랑하는 회원</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-background rounded-lg">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">이메일</p>
                <p className="text-foreground font-medium">{user?.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-background rounded-lg">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">이름</p>
                <p className="text-foreground font-medium">{profile?.full_name || '연구자'}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-background rounded-lg">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">가입일</p>
                <p className="text-foreground font-medium">
                  {new Date(user?.created_at).toLocaleDateString('ko-KR')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
