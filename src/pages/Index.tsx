import React, { useState, useEffect } from 'react';
import { Database, FileText, ExternalLink, BarChart3, ChevronDown, ChevronUp, Target, TrendingUp, ArrowUp, ArrowDown, Minus, Star, Brain, Clock } from 'lucide-react';
import Header from '@/components/Header';
import ChatModal from '@/components/ChatModal';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ChatMessage {
  type: 'user' | 'agent';
  message: string;
  time: string;
}

const ResearchRecommendationAgent = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [expandedCard, setExpandedCard] = useState(null);
  const [showMetrics, setShowMetrics] = useState(false);
  const [responseTime, setResponseTime] = useState(null);
  const [chatInput, setChatInput] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [bookmarkedPapers, setBookmarkedPapers] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { 
      type: 'agent', 
      message: '김연구님 안녕하세요! 궁금한 내용을 설명해주시면 논문이나 데이터를 추천해드릴게요', 
      time: new Date().toLocaleTimeString() 
    }
  ]);

  const [trendingPapers, setTrendingPapers] = useState([
    { id: 1, rank: 1, prevRank: 5, title: 'GPT-4 in Scientific Research', author: 'OpenAI Research Team', trend: 'hot' },
    { id: 2, rank: 2, prevRank: 3, title: 'Climate Change ML Models', author: 'Smith, J. et al.', trend: 'up' },
    { id: 3, rank: 3, prevRank: 1, title: 'Quantum Computing Advances', author: 'Chen, L. & Park, K.', trend: 'down' },
    { id: 4, rank: 4, prevRank: 4, title: 'Biomedical Data Mining', author: 'Johnson, M. et al.', trend: 'same' },
    { id: 5, rank: 5, prevRank: 2, title: 'Neural Network Optimization', author: 'Lee, S. & Kim, H.', trend: 'down' }
  ]);

  const mockRecommendations = [
    {
      id: 1,
      type: 'paper',
      title: 'Deep Learning Approaches for Climate Change Analysis',
      description: 'This paper presents novel deep learning methodologies for analyzing climate change patterns.',
      score: 0.94,
      level: '가장 추천',
      reason: '입력된 연구데이터와 높은 의미적 연관성을 보입니다.',
      detailedReason: {
        semanticSimilarity: 0.94,
        keywordMatch: 0.89,
        citationRelevance: 0.92,
        recencyScore: 0.88,
        explanation: '귀하의 연구 데이터와 94%의 의미적 유사도를 보이며, 핵심 키워드 매칭률 89%를 기록했습니다. 특히 딥러닝 기반 기후 분석 방법론이 귀하의 연구 방향과 완벽하게 일치하며, 최근 인용 빈도(127회)가 높아 학계에서 주목받고 있는 연구입니다.'
      },
      url: 'https://scienceon.kisti.re.kr/paper/12345',
      journal: 'Nature Climate Change',
      authors: ['Smith, J.', 'Kim, H.S.'],
      year: 2023,
      citationCount: 127,
      keywords: ['deep learning', 'climate change', 'satellite data']
    },
    {
      id: 2,
      type: 'dataset',
      title: 'Global Climate Monitoring Dataset',
      description: 'Comprehensive global climate monitoring dataset including temperature and precipitation.',
      score: 0.91,
      level: '가장 추천',
      reason: '입력 데이터와 주제적 연관성이 매우 높습니다.',
      detailedReason: {
        semanticSimilarity: 0.91,
        keywordMatch: 0.87,
        citationRelevance: 0.85,
        recencyScore: 0.95,
        explanation: '귀하의 연구 주제와 91%의 의미적 연관성을 가진 최신 데이터셋입니다. 키워드 매칭률 87%로 연구에 직접 활용 가능한 데이터를 포함하고 있으며, 2024년 최신 데이터로 실시간 업데이트되어 연구 신뢰도를 크게 높일 수 있습니다.'
      },
      url: 'https://dataon.kisti.re.kr/dataset/67890',
      publisher: 'World Meteorological Organization',
      year: 2024,
      dataSize: '127GB',
      format: 'NetCDF, CSV',
      keywords: ['climate', 'meteorology', 'global']
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setTrendingPapers(prev => {
        const last = prev[prev.length - 1];
        const others = prev.slice(0, -1);
        
        const updated = [
          { ...last, rank: 1, prevRank: last.rank, trend: 'hot' },
          ...others.map((item, index) => ({
            ...item,
            rank: index + 2,
            prevRank: item.rank,
            trend: index === 0 ? 'down' : item.rank < index + 2 ? 'down' : item.rank > index + 2 ? 'up' : 'same'
          }))
        ];
        
        return updated;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // 사용자 인증 확인 및 북마크 로드
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadBookmarks(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => {
            loadBookmarks(session.user.id);
          }, 0);
        } else {
          setBookmarkedIds(new Set());
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const loadBookmarks = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('bookmarks')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      
      const ids = new Set(data?.map(b => `${b.title}-${b.year}`) || []);
      setBookmarkedIds(ids);
      setBookmarkedPapers(data || []);
    } catch (error) {
      console.error('북마크 로드 실패:', error);
    }
  };

  const toggleBookmark = async (paper: any) => {
    if (!user) {
      toast.error('로그인이 필요합니다');
      return;
    }

    const bookmarkId = `${paper.title}-${paper.year}`;
    const isBookmarked = bookmarkedIds.has(bookmarkId);

    try {
      if (isBookmarked) {
        // 북마크 제거
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('title', paper.title);

        if (error) throw error;

        setBookmarkedIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(bookmarkId);
          return newSet;
        });
        toast.success('북마크를 제거했습니다');
      } else {
        // 북마크 추가
        const { data, error } = await supabase
          .from('bookmarks')
          .insert({
            user_id: user.id,
            title: paper.title,
            description: paper.description,
            url: paper.url,
            paper_type: paper.type || 'paper',
            authors: paper.authors || [],
            year: paper.year,
            journal: paper.journal || '',
            keywords: paper.keywords || [],
          })
          .select()
          .single();

        if (error) throw error;

        setBookmarkedIds(prev => new Set(prev).add(bookmarkId));
        toast.success('북마크에 추가했습니다');
      }
    } catch (error: any) {
      toast.error('북마크 처리 중 오류가 발생했습니다');
      console.error(error);
    }
  };

  const handleRecommendation = async () => {
    setIsLoading(true);
    setRecommendations([]);
    setHasSearched(true);
    
    const startTime = Date.now();
    
    setTimeout(() => {
      setRecommendations(mockRecommendations);
      setResponseTime(Date.now() - startTime);
      setIsLoading(false);
    }, 2000);
  };

  const handleChatSubmit = () => {
    if (!chatInput.trim()) return;
    
    const userMessage: ChatMessage = {
      type: 'user',
      message: chatInput,
      time: new Date().toLocaleTimeString()
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    const searchQuery = chatInput;
    setChatInput('');
    setHasSearched(true);
    
    setTimeout(() => {
      const agentResponse: ChatMessage = {
        type: 'agent',
        message: `"${searchQuery}"와 관련된 논문을 검색해드리겠습니다!`,
        time: new Date().toLocaleTimeString()
      };
      setChatMessages(prev => [...prev, agentResponse]);
      
      // 검색어에 따른 맞춤형 추천 논문 생성
      const relatedRecommendations = generateRecommendations(searchQuery);
      setIsLoading(true);
      setRecommendations([]);
      
      const startTime = Date.now();
      
      setTimeout(() => {
        setRecommendations(relatedRecommendations);
        setResponseTime(Date.now() - startTime);
        setIsLoading(false);
      }, 2000);
    }, 500);
  };

  const generateRecommendations = (query) => {
    const lowerQuery = query.toLowerCase();
    
    // 북마크 기반 추천 생성
    const generateBookmarkBasedRecs = () => {
      if (bookmarkedPapers.length === 0) return [];
      
      const recentBookmark = bookmarkedPapers[0];
      return [
        {
          id: 'bookmark-1',
          type: 'paper',
          title: `Similar to "${recentBookmark.title}": Advanced Research Methods`,
          description: `${recentBookmark.title}와 유사한 연구 방법론을 다룬 최신 논문입니다.`,
          score: 0.92,
          level: '가장 추천',
          reason: `김연구님이 북마크하신 "${recentBookmark.title}" 논문과 유사한 주제를 다루는 연구입니다.`,
          detailedReason: {
            semanticSimilarity: 0.92,
            keywordMatch: 0.88,
            citationRelevance: 0.90,
            recencyScore: 0.94,
            explanation: `북마크하신 "${recentBookmark.title}"와 92%의 의미적 유사도를 보이며, 동일한 연구 방법론을 채택하고 있습니다. 관련 키워드 매칭률 88%로 연구 확장에 도움이 됩니다.`
          },
          url: 'https://scienceon.kisti.re.kr/paper/similar001',
          journal: recentBookmark.journal || 'Research Journal',
          authors: ['Related Author, A.', 'Related Author, B.'],
          year: 2024,
          citationCount: 156,
          keywords: recentBookmark.keywords?.slice(0, 3) || ['research', 'analysis']
        }
      ];
    };
    
    // 기후변화 관련
    if (lowerQuery.includes('기후') || lowerQuery.includes('climate') || lowerQuery.includes('환경')) {
      return [
        {
          id: 1,
          type: 'paper',
          title: 'Deep Learning Approaches for Climate Change Analysis',
          description: '딥러닝을 활용한 기후변화 패턴 분석에 대한 혁신적인 방법론을 제시합니다. 위성 데이터와 머신러닝을 결합하여 기후 예측 정확도를 30% 향상시켰습니다.',
          score: 0.94,
          level: '가장 추천',
          reason: '검색하신 기후변화 주제와 완벽하게 일치하며, 최신 딥러닝 기법을 적용한 실용적인 연구입니다. 특히 한국의 기후 데이터도 포함되어 있어 국내 연구에 직접 활용 가능합니다.',
          detailedReason: {
            semanticSimilarity: 0.94,
            keywordMatch: 0.91,
            citationRelevance: 0.92,
            recencyScore: 0.88,
            explanation: '입력하신 "기후변화" 키워드와 94%의 의미적 유사도를 달성했으며, 키워드 매칭률 91%로 매우 높은 관련성을 보입니다. 위성 데이터 활용 방법론이 귀하의 연구와 직접적으로 연결되며, 최근 1년간 127회 인용으로 학계의 높은 주목을 받고 있습니다.'
          },
          url: 'https://scienceon.kisti.re.kr/paper/12345',
          journal: 'Nature Climate Change',
          authors: ['Smith, J.', 'Kim, H.S.'],
          year: 2023,
          citationCount: 127,
          keywords: ['deep learning', 'climate change', 'satellite data', 'prediction']
        },
        {
          id: 2,
          type: 'dataset',
          title: 'Global Climate Monitoring Dataset 2024',
          description: '전 세계 기후 모니터링 데이터셋으로 온도, 강수량, 습도 등 포괄적인 기후 정보를 제공합니다.',
          score: 0.91,
          level: '가장 추천',
          reason: '기후변화 연구에 필수적인 고품질 데이터셋입니다. 실시간으로 업데이트되며 API를 통해 쉽게 접근할 수 있어 연구 효율성을 크게 높일 수 있습니다.',
          detailedReason: {
            semanticSimilarity: 0.91,
            keywordMatch: 0.89,
            citationRelevance: 0.88,
            recencyScore: 0.96,
            explanation: '귀하의 검색어와 91%의 의미 일치도를 보이며, 키워드 매칭 89%로 연구 목적에 최적화된 데이터입니다. 2024년 최신 버전으로 실시간 API 제공(96% 최신성 점수)되어 즉시 연구에 활용 가능합니다. 127GB 규모의 포괄적 데이터로 장기 연구에 적합합니다.'
          },
          url: 'https://dataon.kisti.re.kr/dataset/67890',
          publisher: 'World Meteorological Organization',
          year: 2024,
          dataSize: '127GB',
          format: 'NetCDF, CSV, API',
          keywords: ['climate', 'meteorology', 'global', 'real-time']
        },
        {
          id: 3,
          type: 'paper',
          title: 'Machine Learning for Environmental Impact Assessment',
          description: '환경 영향 평가에 머신러닝을 적용한 새로운 프레임워크를 제안합니다.',
          score: 0.87,
          level: '추천',
          reason: '환경과 기후 분야의 교차점에서 머신러닝 활용법을 제시합니다. 실제 프로젝트 적용 사례가 풍부하여 실무에 도움이 됩니다.',
          detailedReason: {
            semanticSimilarity: 0.87,
            keywordMatch: 0.85,
            citationRelevance: 0.84,
            recencyScore: 0.92,
            explanation: '귀하의 연구와 87%의 의미적 연관성을 가지며, 키워드 매칭 85%로 보완적 연구 자료로 활용 가능합니다. 환경 영향 평가에 대한 실무 적용 사례가 풍부하여 실질적 연구 방법론을 제공하며, 2024년 최신 연구로 최근 트렌드를 반영합니다.'
          },
          url: 'https://scienceon.kisti.re.kr/paper/33333',
          journal: 'Environmental Science & Technology',
          authors: ['Lee, M.J.', 'Park, S.H.'],
          year: 2024,
          citationCount: 89,
          keywords: ['machine learning', 'environmental assessment', 'sustainability']
        }
      ];
    }
    
    // AI/머신러닝 관련
    if (lowerQuery.includes('ai') || lowerQuery.includes('인공지능') || lowerQuery.includes('machine learning') || lowerQuery.includes('머신러닝')) {
      return [
        {
          id: 1,
          type: 'paper',
          title: 'Transformer Architecture for Scientific Research Applications',
          description: '과학 연구에 특화된 트랜스포머 아키텍처의 새로운 설계 방법론을 제시합니다.',
          score: 0.96,
          level: '가장 추천',
          reason: 'AI 연구의 최신 트렌드인 트랜스포머 모델을 과학 분야에 특화시킨 혁신적인 연구입니다. 코드와 사전 훈련된 모델이 공개되어 있어 즉시 활용 가능합니다.',
          url: 'https://scienceon.kisti.re.kr/paper/ai001',
          journal: 'Nature Machine Intelligence',
          authors: ['Chen, L.', 'Kim, J.W.', 'Singh, A.'],
          year: 2024,
          citationCount: 203,
          keywords: ['transformer', 'deep learning', 'scientific computing', 'NLP']
        },
        {
          id: 2,
          type: 'paper',
          title: 'Explainable AI for Medical Diagnosis: A Comprehensive Survey',
          description: '의료 진단 분야에서 설명 가능한 AI의 현황과 미래 전망에 대한 종합적인 리뷰입니다.',
          score: 0.93,
          level: '가장 추천',
          reason: '설명 가능한 AI는 현재 가장 주목받는 연구 분야입니다. 의료 분야 적용 사례를 통해 다른 도메인으로의 확장 가능성도 높습니다.',
          url: 'https://scienceon.kisti.re.kr/paper/ai002',
          journal: 'IEEE Transactions on Medical Imaging',
          authors: ['Wang, H.', 'Johnson, M.'],
          year: 2024,
          citationCount: 156,
          keywords: ['explainable AI', 'medical diagnosis', 'interpretability', 'healthcare']
        },
        {
          id: 3,
          type: 'dataset',
          title: 'Large-Scale AI Training Dataset Collection',
          description: '대규모 AI 모델 훈련을 위한 다양한 도메인의 고품질 데이터셋 모음입니다.',
          score: 0.89,
          level: '추천',
          reason: 'AI 연구에 필수적인 대규모 훈련 데이터를 제공합니다. 다양한 도메인의 데이터가 포함되어 있어 멀티 태스크 학습에 적합합니다.',
          url: 'https://dataon.kisti.re.kr/dataset/ai001',
          publisher: 'AI Research Consortium',
          year: 2024,
          dataSize: '2.5TB',
          format: 'HDF5, JSON, Parquet',
          keywords: ['large-scale', 'multi-domain', 'training data', 'deep learning']
        }
      ];
    }
    
    // 바이오/의료 관련
    if (lowerQuery.includes('바이오') || lowerQuery.includes('bio') || lowerQuery.includes('의료') || lowerQuery.includes('medical') || lowerQuery.includes('헬스케어')) {
      return [
        {
          id: 1,
          type: 'paper',
          title: 'CRISPR-Based Gene Editing: Recent Advances and Future Prospects',
          description: 'CRISPR 기반 유전자 편집 기술의 최근 발전사항과 미래 전망에 대한 포괄적인 분석입니다.',
          score: 0.95,
          level: '가장 추천',
          reason: '바이오 분야의 혁신적인 기술인 CRISPR에 대한 최신 연구 동향을 정리한 권위 있는 리뷰 논문입니다. 실제 임상 적용 사례와 윤리적 고려사항까지 다룹니다.',
          url: 'https://scienceon.kisti.re.kr/paper/bio001',
          journal: 'Nature Biotechnology',
          authors: ['Zhang, F.', 'Park, K.S.', 'Martinez, C.'],
          year: 2024,
          citationCount: 289,
          keywords: ['CRISPR', 'gene editing', 'biotechnology', 'therapeutics']
        },
        {
          id: 2,
          type: 'paper',
          title: 'AI-Powered Drug Discovery: From Molecules to Medicine',
          description: 'AI를 활용한 신약 개발 과정의 혁신적인 접근법과 성공 사례를 소개합니다.',
          score: 0.92,
          level: '가장 추천',
          reason: 'AI와 바이오 기술의 융합 분야로, 신약 개발의 패러다임을 바꾸고 있는 중요한 연구입니다. 실제 제약회사의 사례 연구가 포함되어 실용성이 높습니다.',
          url: 'https://scienceon.kisti.re.kr/paper/bio002',
          journal: 'Nature Reviews Drug Discovery',
          authors: ['Kumar, A.', 'Lee, S.Y.', 'Thompson, R.'],
          year: 2024,
          citationCount: 178,
          keywords: ['drug discovery', 'artificial intelligence', 'molecular design', 'pharmaceuticals']
        },
        {
          id: 3,
          type: 'dataset',
          title: 'Comprehensive Human Genome Variation Database',
          description: '인간 유전체 변이에 대한 포괄적인 데이터베이스로 질병 연구에 활용 가능합니다.',
          score: 0.88,
          level: '추천',
          reason: '유전체 연구의 기초가 되는 중요한 데이터셋입니다. 정기적으로 업데이트되며 다양한 분석 도구와 연동됩니다.',
          url: 'https://dataon.kisti.re.kr/dataset/bio001',
          publisher: 'International Genome Consortium',
          year: 2024,
          dataSize: '890GB',
          format: 'VCF, FASTA, JSON',
          keywords: ['genomics', 'human genetics', 'disease research', 'population genetics']
        }
      ];
    }
    
    // 양자컴퓨팅 관련
    if (lowerQuery.includes('양자') || lowerQuery.includes('quantum')) {
      return [
        {
          id: 1,
          type: 'paper',
          title: 'Quantum Computing Applications in Cryptography and Security',
          description: '양자 컴퓨팅이 암호학과 보안 분야에 미치는 영향과 새로운 보안 패러다임을 제시합니다.',
          score: 0.94,
          level: '가장 추천',
          reason: '양자 컴퓨팅의 실용적 응용 분야 중 가장 주목받는 암호학 분야의 최신 연구입니다. 양자 내성 암호 알고리즘의 구현 방법까지 상세히 다룹니다.',
          url: 'https://scienceon.kisti.re.kr/paper/quantum001',
          journal: 'Physical Review Applied',
          authors: ['Nielsen, M.', 'Chuang, I.', 'Kim, D.H.'],
          year: 2024,
          citationCount: 142,
          keywords: ['quantum computing', 'cryptography', 'quantum security', 'post-quantum']
        },
        {
          id: 2,
          type: 'paper',
          title: 'Quantum Machine Learning: Theory and Practice',
          description: '양자 머신러닝의 이론적 기초와 실제 구현 방법을 다룬 종합적인 가이드입니다.',
          score: 0.90,
          level: '추천',
          reason: '양자 컴퓨팅과 AI의 융합 분야로 미래 기술의 핵심입니다. 수학적 이론뿐만 아니라 실제 양자 하드웨어에서의 구현 방법도 제시합니다.',
          url: 'https://scienceon.kisti.re.kr/paper/quantum002',
          journal: 'Quantum Information Processing',
          authors: ['Preskill, J.', 'Aaronson, S.'],
          year: 2024,
          citationCount: 98,
          keywords: ['quantum machine learning', 'NISQ', 'quantum algorithms', 'variational circuits']
        },
        {
          id: 3,
          type: 'paper',
          title: 'Progress in Quantum Error Correction',
          description: '양자 오류 정정 기술의 최근 진전과 실용적인 양자 컴퓨터 구현을 위한 도전과제를 분석합니다.',
          score: 0.86,
          level: '참고',
          reason: '양자 컴퓨팅의 핵심 기술인 오류 정정에 대한 깊이 있는 연구입니다. 기술적으로 고도화된 내용이지만 양자 컴퓨팅 연구자에게는 필수적입니다.',
          url: 'https://scienceon.kisti.re.kr/paper/quantum003',
          journal: 'Nature Physics',
          authors: ['Gottesman, D.', 'Kitaev, A.'],
          year: 2023,
          citationCount: 203,
          keywords: ['quantum error correction', 'fault tolerance', 'topological qubits', 'quantum codes']
        }
      ];
    }
    
    // 기본 추천 (일반적인 검색어)
    const baseRecs = mockRecommendations.map(rec => ({
      ...rec,
      reason: `"${query}" 검색어와 관련된 ${rec.type === 'paper' ? '논문' : '데이터셋'}입니다. ${rec.reason}`
    }));
    
    // 북마크 기반 추천을 추가
    const bookmarkRecs = generateBookmarkBasedRecs();
    return [...bookmarkRecs, ...baseRecs];
  };

  // 페이지네이션 로직
  const filteredRecommendations = recommendations.filter(rec => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'paper') return rec.type === 'paper';
    if (activeFilter === 'dataset') return rec.type === 'dataset';
    return true;
  });

  const totalPages = Math.max(5, Math.ceil(filteredRecommendations.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRecommendations = filteredRecommendations.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getLevelColor = (level) => {
    switch (level) {
      case '가장 추천': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case '추천': return 'bg-blue-100 text-blue-800 border-blue-200';
      case '참고': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <Header 
        responseTime={responseTime}
        showMetrics={showMetrics}
        onToggleMetrics={() => setShowMetrics(!showMetrics)}
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Performance Metrics */}
        {showMetrics && (
          <div className="bg-white rounded-xl shadow-lg border p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">시스템 성능 및 특징</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 p-4 rounded-lg shadow-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Clock size={16} className="text-emerald-200" />
                  <span className="font-medium text-white">응답 시간</span>
                </div>
                <div className="text-2xl font-bold text-white">5초 미만</div>
                <div className="text-sm text-emerald-100">중저사양 H/W 최적화</div>
              </div>
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-4 rounded-lg shadow-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Target size={16} className="text-blue-200" />
                  <span className="font-medium text-white">추천 정확도</span>
                </div>
                <div className="text-2xl font-bold text-white">90% 이상</div>
                <div className="text-sm text-blue-100">의미적 연관성 기반</div>
              </div>
              <div className="bg-gradient-to-br from-slate-700 to-slate-800 p-4 rounded-lg shadow-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Brain size={16} className="text-slate-200" />
                  <span className="font-medium text-white">LLM 모델</span>
                </div>
                <div className="text-lg font-bold text-white">소규모</div>
                <div className="text-sm text-slate-100">Qwen3-14B 기반</div>
              </div>
              <div className="bg-gradient-to-br from-orange-600 to-orange-700 p-4 rounded-lg shadow-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Star size={16} className="text-orange-200" />
                  <span className="font-medium text-white">추천 결과</span>
                </div>
                <div className="text-2xl font-bold text-white">3-5건</div>
                <div className="text-sm text-orange-100">논문 + 데이터셋</div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <div className="xl:col-span-3 space-y-6">
            {/* Empty State */}
            {recommendations.length === 0 && !isLoading && (
              <div className="bg-gradient-to-br from-slate-800 to-blue-800 rounded-xl shadow-xl border border-slate-600 p-4 text-center">
                <Brain size={24} className="text-slate-400 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-white mb-1">하단에서 논문·연구데이터 정보를 입력해주세요</h3>
                <p className="text-slate-300 text-xs">AI 채팅창이나 실시간 검색어를 클릭하여 추천을 받아보세요.</p>
              </div>
            )}

            {/* Results Section */}
            {recommendations.length > 0 && !isLoading && (
              <div className="bg-gradient-to-br from-slate-800 to-blue-800 rounded-xl shadow-xl border border-slate-600 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white">추천 결과</h3>
                    <p className="text-sm text-slate-300 mt-1">
                      총 {recommendations.length}건의 연관 자료를 발견했습니다.
                      {responseTime && ` (처리 시간: ${(responseTime / 1000).toFixed(1)}초)`}
                    </p>
                  </div>
                  <div className="flex space-x-1 bg-slate-700 p-1 rounded-lg">
                    {[
                      { id: 'all', label: '전체', count: recommendations.length },
                      { id: 'paper', label: '논문', count: recommendations.filter(r => r.type === 'paper').length },
                      { id: 'dataset', label: '데이터셋', count: recommendations.filter(r => r.type === 'dataset').length }
                    ].map(filter => (
                      <button
                        key={filter.id}
                        onClick={() => setActiveFilter(filter.id)}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                          activeFilter === filter.id
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'text-slate-300 hover:text-white hover:bg-slate-600'
                        }`}
                      >
                        {filter.label} ({filter.count})
                      </button>
                    ))}
                  </div>
                </div>

                 <div className="space-y-4">
                  {paginatedRecommendations.map((rec, index) => (
                    <div key={rec.id} className="bg-slate-700 border border-slate-600 rounded-lg hover:shadow-xl hover:border-slate-500 transition-all">
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-start space-x-4 flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-xl font-bold text-slate-400">#{index + 1}</span>
                              <div className={`p-2 rounded-lg ${rec.type === 'paper' ? 'bg-emerald-600' : 'bg-blue-600'}`}>
                                {rec.type === 'paper' ? <FileText size={18} className="text-white" /> : <Database size={18} className="text-white" />}
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h4 className="font-semibold text-white text-lg">{rec.title}</h4>
                                <button
                                  onClick={() => toggleBookmark(rec)}
                                  className="p-1 hover:scale-110 transition-transform"
                                  aria-label="북마크"
                                >
                                  <Star
                                    size={20}
                                    className={bookmarkedIds.has(`${rec.title}-${rec.year}`) ? 'fill-yellow-400 text-yellow-400' : 'text-slate-400'}
                                  />
                                </button>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getLevelColor(rec.level)}`}>
                                  {rec.level}
                                </span>
                              </div>
                              <div className="flex items-center space-x-4 text-sm text-slate-300 mb-3">
                                {rec.type === 'paper' ? (
                                  <>
                                    <span>{rec.journal}</span>
                                    <span>•</span>
                                    <span>{rec.authors?.join(', ')}</span>
                                    <span>•</span>
                                    <span>{rec.year}</span>
                                    <span>•</span>
                                    <span>인용 {rec.citationCount}회</span>
                                  </>
                                ) : (
                                  <>
                                    <span>{rec.publisher}</span>
                                    <span>•</span>
                                    <span>{rec.year}</span>
                                    <span>•</span>
                                    <span>{rec.dataSize}</span>
                                    <span>•</span>
                                    <span>{rec.format}</span>
                                  </>
                                )}
                                <span className="ml-auto font-mono bg-slate-600 text-blue-300 px-2 py-1 rounded text-xs font-semibold">
                                  {rec.score.toFixed(3)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => setExpandedCard(expandedCard === rec.id ? null : rec.id)}
                            className="p-1 text-slate-400 hover:text-white ml-4"
                          >
                            {expandedCard === rec.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                          </button>
                        </div>

                        <p className="text-slate-300 mb-4">{rec.description}</p>

                        {/* 추천 사유 섹션 - 항상 표시 */}
                        <div className="mb-4 p-4 bg-slate-600 rounded-lg border-l-4 border-blue-400">
                          <h5 className="font-medium text-blue-300 mb-3 flex items-center">
                            <Target size={16} className="mr-2" />
                            추천 사유
                          </h5>
                          
                          {/* 수치적 지표 */}
                          {rec.detailedReason && (
                            <div className="mb-3 grid grid-cols-2 gap-2">
                              <div className="bg-slate-700 p-2 rounded">
                                <p className="text-xs text-slate-400">의미적 유사도</p>
                                <p className="text-lg font-bold text-blue-300">{(rec.detailedReason.semanticSimilarity * 100).toFixed(1)}%</p>
                              </div>
                              <div className="bg-slate-700 p-2 rounded">
                                <p className="text-xs text-slate-400">키워드 매칭률</p>
                                <p className="text-lg font-bold text-emerald-300">{(rec.detailedReason.keywordMatch * 100).toFixed(1)}%</p>
                              </div>
                              <div className="bg-slate-700 p-2 rounded">
                                <p className="text-xs text-slate-400">인용 관련성</p>
                                <p className="text-lg font-bold text-purple-300">{(rec.detailedReason.citationRelevance * 100).toFixed(1)}%</p>
                              </div>
                              <div className="bg-slate-700 p-2 rounded">
                                <p className="text-xs text-slate-400">최신성 점수</p>
                                <p className="text-lg font-bold text-orange-300">{(rec.detailedReason.recencyScore * 100).toFixed(1)}%</p>
                              </div>
                            </div>
                          )}
                          
                          {/* 상세 설명 */}
                          <p className="text-slate-200 text-sm leading-relaxed">
                            {rec.detailedReason?.explanation || rec.reason}
                          </p>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex flex-wrap gap-2">
                            {rec.keywords.map((keyword, idx) => (
                              <span key={idx} className="px-2 py-1 bg-blue-600 text-blue-100 rounded text-xs">
                                {keyword}
                              </span>
                            ))}
                          </div>
                          <a
                            href={rec.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-1 text-blue-400 hover:text-blue-300 text-sm font-medium"
                          >
                            <span>상세 보기</span>
                            <ExternalLink size={14} />
                          </a>
                        </div>

                        {expandedCard === rec.id && (
                          <div className="mt-6 pt-4 border-t border-slate-600">
                            <h5 className="font-medium text-white mb-3">상세 정보</h5>
                            <div className="space-y-2 text-sm text-slate-300">
                              <p><span className="font-medium">발행일:</span> {rec.year}</p>
                              {rec.type === 'paper' && <p><span className="font-medium">인용 횟수:</span> {rec.citationCount}회</p>}
                              {rec.type === 'dataset' && <p><span className="font-medium">데이터 크기:</span> {rec.dataSize}</p>}
                              <p><span className="font-medium">키워드:</span> {rec.keywords.join(', ')}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* 페이지네이션 */}
                <div className="flex items-center justify-center gap-2 mt-8 pt-6 border-t border-slate-600">
                  <button
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-600 rounded"
                  >
                    &lt;
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-4 py-2 rounded ${
                        currentPage === page
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-600 rounded"
                  >
                    &gt;
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel */}
          <div className="xl:col-span-1 space-y-6">
            {/* 오늘의 논문 - 메인 화면에만 표시 */}
            {!hasSearched && (
              <div className="bg-white rounded-xl shadow-xl border">
                <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-t-xl">
                  <div className="flex items-center space-x-2">
                    <div className="text-yellow-300 fill-current">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    </div>
                    <h3 className="font-semibold text-white">오늘의 논문</h3>
                  </div>
                  <p className="text-xs text-emerald-100 mt-1">김연구님을 위한 추천</p>
                </div>
              
              <div className="p-4">
                <div className="flex space-x-3">
                  <div className="w-1/4 bg-white rounded-lg flex-shrink-0 border-2 border-gray-200 shadow-sm p-2 flex flex-col justify-center items-center" style={{aspectRatio: '1/1.414'}}>
                    <div className="text-center">
                      <div className="text-xs font-bold text-gray-800 leading-tight mb-1" style={{fontFamily: 'Georgia, serif'}}>
                        Machine Learning for Climate Science
                      </div>
                      <div className="text-xs text-gray-600 mb-2" style={{fontFamily: 'Georgia, serif'}}>
                        Advances and Applications
                      </div>
                      <div className="text-xs text-gray-500 font-medium" style={{fontFamily: 'Georgia, serif'}}>
                        Nature Climate Change
                      </div>
                      <div className="text-xs text-gray-400" style={{fontFamily: 'Georgia, serif'}}>
                        2024
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 text-sm leading-tight mb-1">
                      Machine Learning for Climate Science: Advances and Applications
                    </h4>
                    <div className="text-xs text-gray-600 mb-2" style={{fontFamily: 'Arial, sans-serif'}}>
                      <p>Dr. Sarah Chen, Prof. Michael Johnson</p>
                      <p>Nature Climate Change • 2024</p>
                    </div>
                    
                    <p className="text-xs text-gray-700 mb-3 leading-relaxed">
                      기후 과학 분야에서 머신러닝 적용 사례와 최신 연구 동향을 종합적으로 다룬 리뷰 논문입니다.
                    </p>
                    
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-3">
                      <div className="space-y-1.5">
                        <div className="flex items-start space-x-1">
                          <div className="w-1 h-1 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0"></div>
                          <p className="text-xs text-emerald-800 leading-relaxed">
                            <span className="font-medium">연구 적합성:</span> 기후변화와 AI 분야의 최신 방법론과 실무 사례를 제공합니다.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <a 
                      href="#" 
                      className="inline-flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      <span>논문 보기</span>
                      <ExternalLink size={10} />
                    </a>
                  </div>
                </div>
              </div>
            </div>
            )}

            {/* 실시간 논문 트렌드 - 메인 화면에만 표시 */}
            {!hasSearched && (
            <div className="bg-white rounded-xl shadow-xl border sticky top-6">
              <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-slate-700 to-slate-900 rounded-t-xl">
                <div className="flex items-center space-x-2">
                  <TrendingUp size={20} className="text-slate-100" />
                  <h3 className="font-semibold text-white">실시간 논문 트렌드</h3>
                </div>
                <p className="text-xs text-slate-200 mt-1">HOT 논문 TOP 5</p>
              </div>
              
              <div className="p-3">
                {trendingPapers.slice(0, 3).map((paper) => {
                  const rankChange = paper.prevRank - paper.rank;
                  return (
                  <div 
                    key={paper.id} 
                    className="p-3 rounded-lg mb-2 last:mb-0 hover:bg-gray-50 transition-all duration-500"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                          paper.rank === 1 ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-md transform scale-110' :
                          paper.rank === 2 ? 'bg-gradient-to-r from-gray-300 to-gray-400 text-white' :
                          'bg-gradient-to-r from-yellow-600 to-yellow-700 text-white'
                        }`}>
                          {paper.rank}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-800 truncate leading-tight">{paper.title}</p>
                            {paper.trend === 'hot' && (
                              <span className="text-xl animate-pulse">🔥</span>
                            )}
                            {rankChange !== 0 && (
                              <span className={`text-xs font-bold ${rankChange > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {rankChange > 0 ? `+${rankChange}` : rankChange}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 truncate">{paper.author}</p>
                        </div>
                      </div>
                      
                      <div className="ml-2">
                        {paper.trend === 'up' && (
                          <ArrowUp size={20} className="text-emerald-500" />
                        )}
                        {paper.trend === 'down' && (
                          <ArrowDown size={20} className="text-red-500" />
                        )}
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
              
              <div className="p-3 bg-gray-50 rounded-b-xl">
                <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat Modal */}
      <ChatModal
        isOpen={isChatOpen}
        onToggle={() => setIsChatOpen(!isChatOpen)}
        chatMessages={chatMessages}
        chatInput={chatInput}
        onInputChange={setChatInput}
        onSubmit={handleChatSubmit}
      />
    </div>
  );
};

export default ResearchRecommendationAgent;
