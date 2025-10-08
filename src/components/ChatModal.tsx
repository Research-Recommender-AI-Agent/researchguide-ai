import React from 'react';
import { Brain, Send, X, MessageCircle, ArrowUp, ArrowDown } from 'lucide-react';

interface ChatMessage {
  type: 'user' | 'agent';
  message: string;
  time: string;
}

interface ChatModalProps {
  isOpen: boolean;
  onToggle: () => void;
  chatMessages: ChatMessage[];
  chatInput: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
}

const ChatModal: React.FC<ChatModalProps> = ({
  isOpen,
  onToggle,
  chatMessages,
  chatInput,
  onInputChange,
  onSubmit,
}) => {
  // localStorage에서 대화 내용 로드
  React.useEffect(() => {
    const savedMessages = localStorage.getItem('chatMessages');
    const savedTimestamp = localStorage.getItem('chatMessagesTimestamp');
    
    if (savedMessages && savedTimestamp) {
      const timestamp = parseInt(savedTimestamp);
      const now = Date.now();
      const dayInMs = 24 * 60 * 60 * 1000;
      
      // 24시간 이내 데이터만 로드
      if (now - timestamp < dayInMs) {
        // chatMessages는 props이므로 여기서 직접 설정할 수 없음
        // 부모 컴포넌트에서 처리하도록 함
      } else {
        // 24시간 지난 데이터 삭제
        localStorage.removeItem('chatMessages');
        localStorage.removeItem('chatMessagesTimestamp');
      }
    }
  }, []);

  // 대화 내용이 변경될 때마다 localStorage에 저장
  React.useEffect(() => {
    if (chatMessages.length > 1) { // 초기 메시지 이상일 때만 저장
      localStorage.setItem('chatMessages', JSON.stringify(chatMessages));
      localStorage.setItem('chatMessagesTimestamp', Date.now().toString());
    }
  }, [chatMessages]);

  const allKeywords = [
    { text: '기후변화 연구', trend: 'up' as const },
    { text: '인공지능 최신 동향', trend: 'down' as const },
    { text: '바이오 의료 기술', trend: 'up' as const },
    { text: '양자 컴퓨팅', trend: 'up' as const },
    { text: '신약 개발 AI', trend: 'hot' as const },
    { text: '자율주행 기술', trend: 'down' as const },
  ];

  const generateKeywords = () => {
    const keywords = [...allKeywords]
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    
    // 항상 하나만 하강, 나머지는 상승
    const downIndex = Math.floor(Math.random() * 3); // 0, 1, 2 중 하나
    
    return keywords.map((k, index) => {
      const isDown = index === downIndex;
      return {
        ...k,
        change: Math.floor(Math.random() * 900) + 100,
        trend: isDown ? 'down' as const : 'up' as const
      };
    });
  };

  const [trendingKeywords, setTrendingKeywords] = React.useState(generateKeywords());

  // 5분마다 실시간 검색어 업데이트
  React.useEffect(() => {
    const interval = setInterval(() => {
      setTrendingKeywords(generateKeywords());
    }, 5 * 60 * 1000); // 5분

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-2xl hover:shadow-3xl hover:scale-110 transition-all z-50 flex items-center justify-center"
        >
          <MessageCircle size={28} />
        </button>
      )}

      {/* Chat Modal */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[700px] bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Brain size={20} />
              </div>
              <div>
                <p className="font-semibold">AI 연구 어시스턴트</p>
                <p className="text-xs text-blue-100">논문 추천 전문가</p>
              </div>
            </div>
            <button
              onClick={onToggle}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.map((msg, index) => (
              <div key={index} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-4 py-2 rounded-lg ${
                  msg.type === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  <p className="text-sm">{msg.message}</p>
                  <p className="text-xs opacity-70 mt-1">{msg.time}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Trending Keywords */}
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-xs font-medium text-gray-700 mb-2">실시간 검색어 순위 TOP 3</p>
            <div className="space-y-2">
              {trendingKeywords.map((item, index) => (
                <button
                  key={index}
                  onClick={() => {
                    onInputChange(item.text);
                    setTimeout(() => onSubmit(), 100); // 입력 값이 업데이트된 후 실행
                  }}
                  className="w-full px-3 py-2 bg-white text-gray-600 rounded-lg text-xs hover:bg-gray-200 hover:text-gray-800 transition-colors flex items-center justify-between border border-gray-200 group"
                >
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-blue-600 text-sm">{index + 1}</span>
                    <span className="font-medium">{item.text}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    {item.trend === 'up' ? (
                      <>
                        <ArrowUp size={18} className="text-emerald-500 font-bold" />
                        <span className="text-base font-black text-emerald-600">+{item.change}</span>
                      </>
                    ) : (
                      <>
                        <ArrowDown size={18} className="text-red-500 font-bold" />
                        <span className="text-base font-black text-red-600">-{Math.abs(item.change)}</span>
                      </>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && onSubmit()}
                className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 text-gray-800 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white placeholder-gray-500 text-sm"
                placeholder="궁금한 연구 주제를 입력해주세요..."
              />
              <button
                onClick={onSubmit}
                disabled={!chatInput.trim()}
                className="p-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all shadow-lg"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatModal;
