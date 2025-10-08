import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, Clock, BarChart3, User, LogIn, UserPlus, BookMarked, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface HeaderProps {
  responseTime: number | null;
  showMetrics: boolean;
  onToggleMetrics: () => void;
}

const Header: React.FC<HeaderProps> = ({ responseTime, showMetrics, onToggleMetrics }) => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // 초기 세션 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      }
    });

    // 인증 상태 변경 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => {
            loadProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('프로필 로드 실패:', error);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success('로그아웃되었습니다');
      navigate('/');
    } catch (error: any) {
      toast.error('로그아웃 실패');
    }
  };
  return (
    <div className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center space-x-4 hover:opacity-80 transition-opacity"
          >
            <div className="p-2 bg-gradient-to-r from-slate-700 to-blue-800 rounded-lg shadow-lg">
              <Flame className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                연구의 등불
                <span className="text-xs font-semibold px-2 py-1 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-full animate-pulse">
                  AI Agent
                </span>
              </h1>
            </div>
          </button>
          
          <div className="flex items-center space-x-4">
            
            <div className="flex items-center space-x-2 ml-4 border-l pl-4 border-border">
              {user ? (
                <>
                  <button 
                    onClick={() => navigate('/profile')}
                    className="text-sm font-medium text-foreground px-3 py-2 hover:bg-accent/10 rounded-lg transition-colors"
                  >
                    {profile?.full_name || '연구자'}님
                  </button>
                  <button 
                    onClick={() => navigate('/library')}
                    className="flex items-center space-x-1 px-3 py-2 text-foreground hover:bg-accent/10 rounded-lg transition-colors text-sm"
                  >
                    <BookMarked size={18} />
                    <span>내 라이브러리</span>
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="flex items-center space-x-1 px-3 py-2 text-foreground hover:bg-accent/10 rounded-lg transition-colors text-sm"
                  >
                    <LogOut size={18} />
                    <span>로그아웃</span>
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => navigate('/auth?mode=signup')}
                    className="flex items-center space-x-1 px-3 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors text-sm font-medium"
                  >
                    <UserPlus size={18} />
                    <span>회원가입</span>
                  </button>
                  <button 
                    onClick={() => navigate('/auth?mode=login')}
                    className="flex items-center space-x-1 px-3 py-2 text-foreground hover:bg-accent/10 rounded-lg transition-colors text-sm"
                  >
                    <LogIn size={18} />
                    <span>로그인</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
