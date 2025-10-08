import React from 'react';
import { Flame, Clock, BarChart3, User, LogIn, UserPlus, BookMarked } from 'lucide-react';

interface HeaderProps {
  responseTime: number | null;
  showMetrics: boolean;
  onToggleMetrics: () => void;
}

const Header: React.FC<HeaderProps> = ({ responseTime, showMetrics, onToggleMetrics }) => {
  return (
    <div className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-gradient-to-r from-slate-700 to-blue-800 rounded-lg shadow-lg">
              <Flame className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">연구의 등불</h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {responseTime && (
              <div className="flex items-center space-x-1 text-emerald-600 text-sm">
                <Clock size={16} />
                <span>{(responseTime / 1000).toFixed(1)}초</span>
              </div>
            )}
            <button
              onClick={onToggleMetrics}
              className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 transition-colors text-sm"
            >
              <BarChart3 size={16} />
              <span>성능 지표</span>
            </button>
            
            <div className="flex items-center space-x-2 ml-4 border-l pl-4">
              <button className="flex items-center space-x-1 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-sm">
                <BookMarked size={18} />
                <span>내 라이브러리</span>
              </button>
              <button className="flex items-center space-x-1 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-sm">
                <User size={18} />
                <span>마이페이지</span>
              </button>
              <button className="flex items-center space-x-1 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-sm">
                <LogIn size={18} />
                <span>로그인</span>
              </button>
              <button className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors text-sm font-medium">
                <UserPlus size={18} />
                <span>회원가입</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
