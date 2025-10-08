import React from 'react';
import { Brain, Send, X, MessageCircle } from 'lucide-react';

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
  const trendingKeywords = [
    '기후변화 연구',
    '인공지능 최신 동향',
    '바이오 의료 기술',
    '양자컴퓨팅',
    '환경 모니터링'
  ];

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
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 flex flex-col">
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
            <p className="text-xs font-medium text-gray-700 mb-2">실시간 검색어 순위</p>
            <div className="flex flex-wrap gap-2">
              {trendingKeywords.map((topic, index) => (
                <button
                  key={index}
                  onClick={() => onInputChange(topic)}
                  className="px-2 py-1 bg-white text-gray-600 rounded-full text-xs hover:bg-gray-200 hover:text-gray-800 transition-colors flex items-center space-x-1 border border-gray-200"
                >
                  <span className="font-bold text-blue-600">{index + 1}</span>
                  <span>{topic}</span>
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
