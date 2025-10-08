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

  // localStorage에서 대화 내용 로드
  useEffect(() => {
    const savedMessages = localStorage.getItem('chatMessages');
    const savedTimestamp = localStorage.getItem('chatMessagesTimestamp');
    
    if (savedMessages && savedTimestamp) {
      const timestamp = parseInt(savedTimestamp);
      const now = Date.now();
      const dayInMs = 24 * 60 * 60 * 1000;
      
      // 24시간 이내 데이터만 로드
      if (now - timestamp < dayInMs) {
        try {
          const messages = JSON.parse(savedMessages);
          setChatMessages(messages);
        } catch (e) {
          console.error('Failed to parse chat messages:', e);
        }
      } else {
        // 24시간 지난 데이터 삭제
        localStorage.removeItem('chatMessages');
        localStorage.removeItem('chatMessagesTimestamp');
      }
    }
  }, []);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { 
      type: 'agent', 
      message: '김연구님 안녕하세요! 궁금한 내용을 설명해주시면 논문이나 데이터를 추천해드릴게요', 
      time: new Date().toLocaleTimeString() 
    }
  ]);

  // 실시간 논문 트렌드 데이터
  const allTrendingPapers = [
    { id: 1, title: 'Attention Is All You Need', author: 'Vaswani et al.', url: 'https://arxiv.org/abs/1706.03762' },
    { id: 2, title: 'Deep Residual Learning for Image Recognition', author: 'He, K. et al.', url: 'https://arxiv.org/abs/1512.03385' },
    { id: 3, title: 'BERT: Pre-training of Deep Bidirectional Transformers', author: 'Devlin, J. et al.', url: 'https://arxiv.org/abs/1810.04805' },
    { id: 4, title: 'Generative Adversarial Networks', author: 'Goodfellow, I. et al.', url: 'https://arxiv.org/abs/1406.2661' },
    { id: 5, title: 'ImageNet Classification with Deep Convolutional Neural Networks', author: 'Krizhevsky, A. et al.', url: 'https://proceedings.neurips.cc/paper/2012/file/c399862d3b9d6b76c8436e924a68c45b-Paper.pdf' },
    { id: 6, title: 'Mastering the Game of Go with Deep Neural Networks', author: 'Silver, D. et al.', url: 'https://www.nature.com/articles/nature16961' },
    { id: 7, title: 'Adam: A Method for Stochastic Optimization', author: 'Kingma, D.P. et al.', url: 'https://arxiv.org/abs/1412.6980' },
    { id: 8, title: 'Batch Normalization: Accelerating Deep Network Training', author: 'Ioffe, S. et al.', url: 'https://arxiv.org/abs/1502.03167' },
  ];

  const generateTrendingPapers = () => {
    const shuffled = [...allTrendingPapers].sort(() => Math.random() - 0.5).slice(0, 5);
    
    // 하나만 하강, 나머지는 상승
    const downIndex = Math.floor(Math.random() * 4) + 1; // 1~4 중 하나 (0번은 hot)
    
    return shuffled.map((paper, index) => {
      const rank = index + 1;
      
      // 첫 번째는 항상 hot
      if (index === 0) {
        return {
          ...paper,
          rank,
          prevRank: rank + 2,
          rankChange: 2 * (Math.floor(Math.random() * 300) + 100),
          trend: 'hot' as const
        };
      }
      
      // 선택된 인덱스만 하강, 나머지는 상승
      const isDown = index === downIndex;
      
      if (isDown) {
        // 하강: prevRank가 더 높음 (작은 숫자)
        const prevRank = Math.max(1, rank - Math.floor(Math.random() * 2) - 1);
        const rankChange = rank - prevRank; // 양수 (순위 하락)
        return {
          ...paper,
          rank,
          prevRank,
          rankChange: rankChange * (Math.floor(Math.random() * 300) + 100),
          trend: 'down' as const
        };
      } else {
        // 상승: prevRank가 더 낮음 (큰 숫자)
        const prevRank = Math.min(8, rank + Math.floor(Math.random() * 2) + 1);
        const rankChange = prevRank - rank; // 양수 (순위 상승)
        return {
          ...paper,
          rank,
          prevRank,
          rankChange: rankChange * (Math.floor(Math.random() * 300) + 100),
          trend: 'up' as const
        };
      }
    });
  };

  const [trendingPapers, setTrendingPapers] = React.useState(generateTrendingPapers());

  // 오늘의 논문 데이터
  const allTodayPapers = [
    {
      title: 'Attention Is All You Need',
      authors: 'Vaswani, A. et al.',
      journal: 'NeurIPS',
      year: 2017,
      description: 'Transformer 아키텍처를 제안한 획기적인 논문으로, 현대 NLP의 기초가 되었습니다.',
      reason: 'AI 분야의 최신 방법론과 실무 사례를 제공합니다.',
      url: 'https://arxiv.org/abs/1706.03762'
    },
    {
      title: 'Deep Residual Learning for Image Recognition',
      authors: 'He, K. et al.',
      journal: 'CVPR',
      year: 2016,
      description: '깊은 신경망 학습을 가능하게 한 ResNet 아키텍처를 소개합니다.',
      reason: '컴퓨터 비전 분야의 혁신적 발전을 보여줍니다.',
      url: 'https://arxiv.org/abs/1512.03385'
    },
    {
      title: 'BERT: Pre-training of Deep Bidirectional Transformers',
      authors: 'Devlin, J. et al.',
      journal: 'NAACL',
      year: 2019,
      description: 'NLP 태스크에서 새로운 기준을 제시한 사전학습 모델입니다.',
      reason: '언어 모델의 최신 기법과 응용 사례를 다룹니다.',
      url: 'https://arxiv.org/abs/1810.04805'
    },
  ];

  const getTodayPaper = () => {
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    return allTodayPapers[dayOfYear % allTodayPapers.length];
  };

  const [todayPaper] = useState(getTodayPaper());

  // 재미있는 논문 데이터
  const allFunPapers = [
    {
      title: 'Attention Is All You Need',
      authors: 'Vaswani, A. et al.',
      year: 2017,
      journal: 'NeurIPS',
      url: 'https://arxiv.org/abs/1706.03762'
    },
    {
      title: 'ImageNet Classification with Deep Convolutional Neural Networks',
      authors: 'Krizhevsky, A. et al.',
      year: 2012,
      journal: 'NeurIPS',
      url: 'https://papers.nips.cc/paper/2012/hash/c399862d3b9d6b76c8436e924a68c45b-Abstract.html'
    },
    {
      title: 'Generative Adversarial Networks',
      authors: 'Goodfellow, I. et al.',
      year: 2014,
      journal: 'NeurIPS',
      url: 'https://arxiv.org/abs/1406.2661'
    },
    {
      title: 'Deep Residual Learning for Image Recognition',
      authors: 'He, K. et al.',
      year: 2016,
      journal: 'CVPR',
      url: 'https://arxiv.org/abs/1512.03385'
    },
    {
      title: 'BERT: Pre-training of Deep Bidirectional Transformers',
      authors: 'Devlin, J. et al.',
      year: 2019,
      journal: 'NAACL',
      url: 'https://arxiv.org/abs/1810.04805'
    },
    {
      title: 'Mastering the Game of Go with Deep Neural Networks',
      authors: 'Silver, D. et al.',
      year: 2016,
      journal: 'Nature',
      url: 'https://www.nature.com/articles/nature16961'
    }
  ];

  const getFunPapers = () => {
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    const startIndex = dayOfYear % allFunPapers.length;
    const papers = [];
    for (let i = 0; i < 6; i++) {
      papers.push(allFunPapers[(startIndex + i) % allFunPapers.length]);
    }
    return papers;
  };

  const [funPapers] = useState(getFunPapers());

  // 5분마다 실시간 논문 트렌드 업데이트
  useEffect(() => {
    const interval = setInterval(() => {
      setTrendingPapers(generateTrendingPapers());
    }, 5 * 60 * 1000); // 5분

    return () => clearInterval(interval);
  }, []);

  const mockRecommendations = [
    // 논문 20개
    {
      id: 1,
      type: 'paper',
      title: 'Attention Is All You Need',
      description: 'This paper introduces the Transformer architecture, which has revolutionized natural language processing.',
      score: 0.94,
      level: '가장 추천',
      reason: '입력된 연구데이터와 높은 의미적 연관성을 보입니다.',
      detailedReason: {
        semanticSimilarity: 0.94,
        keywordMatch: 0.89,
        citationRelevance: 0.92,
        recencyScore: 0.88,
        explanation: '김연구님의 연구 데이터와 94%의 의미적 유사도를 보이며, 핵심 키워드 매칭률 89%를 기록했습니다.'
      },
      url: 'https://arxiv.org/abs/1706.03762',
      journal: 'NeurIPS',
      authors: ['Vaswani, A.', 'Shazeer, N.'],
      year: 2017,
      citationCount: 127543,
      keywords: ['transformer', 'attention mechanism', 'neural networks']
    },
    {
      id: 2,
      type: 'paper',
      title: 'BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding',
      description: 'BERT obtains new state-of-the-art results on eleven natural language processing tasks.',
      score: 0.93,
      level: '가장 추천',
      reason: '최신 AI 기술과 과학 연구의 융합을 제시합니다.',
      detailedReason: {
        semanticSimilarity: 0.93,
        keywordMatch: 0.90,
        citationRelevance: 0.91,
        recencyScore: 0.96,
        explanation: '최신 트랜스포머 아키텍처를 과학 컴퓨팅에 적용한 혁신적 연구입니다.'
      },
      url: 'https://arxiv.org/abs/1810.04805',
      journal: 'NAACL',
      authors: ['Devlin, J.', 'Chang, M.W.'],
      year: 2019,
      citationCount: 98234,
      keywords: ['BERT', 'language models', 'NLP']
    },
    {
      id: 3,
      type: 'paper',
      title: 'Deep Residual Learning for Image Recognition',
      description: 'Residual networks address the degradation problem in very deep networks.',
      score: 0.91,
      level: '가장 추천',
      reason: '딥러닝 아키텍처의 혁신적 발전을 보여줍니다.',
      detailedReason: {
        semanticSimilarity: 0.91,
        keywordMatch: 0.88,
        citationRelevance: 0.90,
        recencyScore: 0.92,
        explanation: 'ResNet은 컴퓨터 비전의 이론과 실제를 모두 다룬 포괄적 연구입니다.'
      },
      url: 'https://arxiv.org/abs/1512.03385',
      journal: 'CVPR',
      authors: ['He, K.', 'Zhang, X.'],
      year: 2016,
      citationCount: 156789,
      keywords: ['ResNet', 'computer vision', 'deep learning']
    },
    {
      id: 4,
      type: 'paper',
      title: 'Generative Adversarial Networks',
      description: 'GANs are a class of machine learning frameworks for training generative models.',
      score: 0.90,
      level: '추천',
      reason: '생성 모델의 혁신적 접근법을 제시합니다.',
      detailedReason: {
        semanticSimilarity: 0.90,
        keywordMatch: 0.87,
        citationRelevance: 0.89,
        recencyScore: 0.94,
        explanation: 'GAN은 생성 AI의 기초가 되는 획기적인 연구입니다.'
      },
      url: 'https://arxiv.org/abs/1406.2661',
      journal: 'NeurIPS',
      authors: ['Goodfellow, I.', 'Pouget-Abadie, J.'],
      year: 2014,
      citationCount: 89312,
      keywords: ['GAN', 'generative models', 'adversarial training']
    },
    {
      id: 5,
      type: 'paper',
      title: 'ImageNet Classification with Deep Convolutional Neural Networks',
      description: 'AlexNet achieved breakthrough results on ImageNet classification challenge.',
      score: 0.89,
      level: '추천',
      reason: '딥러닝 혁명의 시작을 알린 논문입니다.',
      detailedReason: {
        semanticSimilarity: 0.89,
        keywordMatch: 0.86,
        citationRelevance: 0.88,
        recencyScore: 0.90,
        explanation: 'AlexNet은 현대 딥러닝의 토대를 마련한 중요한 연구입니다.'
      },
      url: 'https://proceedings.neurips.cc/paper/2012/file/c399862d3b9d6b76c8436e924a68c45b-Paper.pdf',
      journal: 'NeurIPS',
      authors: ['Krizhevsky, A.', 'Sutskever, I.'],
      year: 2012,
      citationCount: 134156,
      keywords: ['AlexNet', 'CNN', 'ImageNet']
    },
    {
      id: 6,
      type: 'paper',
      title: 'Mastering the Game of Go with Deep Neural Networks and Tree Search',
      description: 'AlphaGo combines deep neural networks with Monte Carlo tree search.',
      score: 0.88,
      level: '추천',
      reason: '강화학습과 탐색 알고리즘의 결합을 보여줍니다.',
      detailedReason: {
        semanticSimilarity: 0.88,
        keywordMatch: 0.85,
        citationRelevance: 0.87,
        recencyScore: 0.91,
        explanation: 'AlphaGo는 AI가 인간 수준을 넘어선 역사적 연구입니다.'
      },
      url: 'https://www.nature.com/articles/nature16961',
      journal: 'Nature',
      authors: ['Silver, D.', 'Huang, A.'],
      year: 2016,
      citationCount: 45201,
      keywords: ['AlphaGo', 'reinforcement learning', 'MCTS']
    },
    {
      id: 7,
      type: 'paper',
      title: 'Adam: A Method for Stochastic Optimization',
      description: 'Adam optimizer is widely used for training deep learning models.',
      score: 0.87,
      level: '추천',
      reason: '최적화 알고리즘의 실용적 발전을 제시합니다.',
      detailedReason: {
        semanticSimilarity: 0.87,
        keywordMatch: 0.84,
        citationRelevance: 0.86,
        recencyScore: 0.89,
        explanation: 'Adam은 실제 딥러닝 학습에 필수적인 최적화 방법입니다.'
      },
      url: 'https://arxiv.org/abs/1412.6980',
      journal: 'ICLR',
      authors: ['Kingma, D.P.', 'Ba, J.'],
      year: 2015,
      citationCount: 178567,
      keywords: ['Adam', 'optimization', 'stochastic gradient descent']
    },
    {
      id: 8,
      type: 'paper',
      title: 'Batch Normalization: Accelerating Deep Network Training',
      description: 'Batch normalization reduces internal covariate shift in neural networks.',
      score: 0.86,
      level: '참고',
      reason: '딥러닝 학습 안정화의 핵심 기술입니다.',
      detailedReason: {
        semanticSimilarity: 0.86,
        keywordMatch: 0.83,
        citationRelevance: 0.85,
        recencyScore: 0.88,
        explanation: 'Batch normalization은 현대 신경망 학습의 표준 기법입니다.'
      },
      url: 'https://arxiv.org/abs/1502.03167',
      journal: 'ICML',
      authors: ['Ioffe, S.', 'Szegedy, C.'],
      year: 2015,
      citationCount: 89267,
      keywords: ['batch normalization', 'training acceleration', 'neural networks']
    },
    {
      id: 9,
      type: 'paper',
      title: 'Dropout: A Simple Way to Prevent Neural Networks from Overfitting',
      description: 'Dropout is a regularization technique for reducing overfitting in neural networks.',
      score: 0.85,
      level: '참고',
      reason: '과적합 방지의 효과적인 방법론입니다.',
      detailedReason: {
        semanticSimilarity: 0.85,
        keywordMatch: 0.82,
        citationRelevance: 0.84,
        recencyScore: 0.87,
        explanation: 'Dropout은 간단하면서도 효과적인 정규화 기법입니다.'
      },
      url: 'https://jmlr.org/papers/v15/srivastava14a.html',
      journal: 'JMLR',
      authors: ['Srivastava, N.', 'Hinton, G.'],
      year: 2014,
      citationCount: 67342,
      keywords: ['dropout', 'regularization', 'overfitting']
    },
    {
      id: 10,
      type: 'paper',
      title: 'U-Net: Convolutional Networks for Biomedical Image Segmentation',
      description: 'U-Net architecture is designed for precise image segmentation with limited training data.',
      score: 0.84,
      level: '참고',
      reason: '의료 영상 분석의 핵심 아키텍처입니다.',
      detailedReason: {
        semanticSimilarity: 0.84,
        keywordMatch: 0.81,
        citationRelevance: 0.83,
        recencyScore: 0.86,
        explanation: 'U-Net은 의료 영상 세그멘테이션에서 높은 성능을 보입니다.'
      },
      url: 'https://arxiv.org/abs/1505.04597',
      journal: 'MICCAI',
      authors: ['Ronneberger, O.', 'Fischer, P.'],
      year: 2015,
      citationCount: 78234,
      keywords: ['U-Net', 'image segmentation', 'biomedical imaging']
    },
    {
      id: 11,
      type: 'paper',
      title: 'Large Language Models: Capabilities and Limitations',
      description: 'Analysis of modern LLMs including GPT and BERT variants.',
      score: 0.92,
      level: '가장 추천',
      reason: 'LLM의 현재와 미래를 포괄적으로 분석합니다.',
      detailedReason: {
        semanticSimilarity: 0.92,
        keywordMatch: 0.89,
        citationRelevance: 0.90,
        recencyScore: 0.95,
        explanation: '최신 LLM 기술의 강점과 한계를 균형있게 제시합니다.'
      },
      url: 'https://arxiv.org/abs/2303.18223',
      journal: 'arXiv',
      authors: ['Brown, T.', 'Mann, B.'],
      year: 2024,
      citationCount: 412,
      keywords: ['LLM', 'GPT', 'language models']
    },
    {
      id: 12,
      type: 'paper',
      title: 'Diffusion Models for Generative AI',
      description: 'State-of-the-art diffusion models for image and video generation.',
      score: 0.90,
      level: '추천',
      reason: '생성 AI의 최신 기술을 상세히 다룹니다.',
      detailedReason: {
        semanticSimilarity: 0.90,
        keywordMatch: 0.87,
        citationRelevance: 0.89,
        recencyScore: 0.93,
        explanation: 'Stable Diffusion을 포함한 최신 확산 모델을 설명합니다.'
      },
      url: 'https://arxiv.org/abs/2006.11239',
      journal: 'NeurIPS',
      authors: ['Ho, J.', 'Jain, A.'],
      year: 2024,
      citationCount: 523,
      keywords: ['diffusion models', 'generative AI', 'image synthesis']
    },
    {
      id: 13,
      type: 'paper',
      title: 'Multimodal Learning: Vision and Language',
      description: 'Integration of visual and linguistic information in AI systems.',
      score: 0.89,
      level: '추천',
      reason: '멀티모달 AI의 핵심 개념과 구현을 제공합니다.',
      detailedReason: {
        semanticSimilarity: 0.89,
        keywordMatch: 0.86,
        citationRelevance: 0.88,
        recencyScore: 0.91,
        explanation: 'CLIP와 같은 최신 멀티모달 모델의 원리를 설명합니다.'
      },
      url: 'https://arxiv.org/abs/2103.00020',
      journal: 'ICML',
      authors: ['Radford, A.', 'Kim, J.W.'],
      year: 2024,
      citationCount: 378,
      keywords: ['multimodal', 'vision-language', 'CLIP']
    },
    {
      id: 14,
      type: 'paper',
      title: 'Self-Supervised Learning in Computer Vision',
      description: 'Learning visual representations without labeled data.',
      score: 0.88,
      level: '추천',
      reason: '레이블 없는 학습의 혁신적 접근법을 제시합니다.',
      detailedReason: {
        semanticSimilarity: 0.88,
        keywordMatch: 0.85,
        citationRelevance: 0.87,
        recencyScore: 0.90,
        explanation: 'SimCLR, MoCo 등 최신 자기지도 학습 기법을 다룹니다.'
      },
      url: 'https://arxiv.org/abs/2002.05709',
      journal: 'CVPR',
      authors: ['Chen, T.', 'Kornblith, S.'],
      year: 2023,
      citationCount: 445,
      keywords: ['self-supervised', 'contrastive learning', 'computer vision']
    },
    {
      id: 15,
      type: 'paper',
      title: 'Neural Networks for Time Series Forecasting',
      description: 'Deep learning approaches for temporal data prediction.',
      score: 0.87,
      level: '추천',
      reason: '시계열 예측의 최신 딥러닝 기법을 소개합니다.',
      detailedReason: {
        semanticSimilarity: 0.87,
        keywordMatch: 0.84,
        citationRelevance: 0.86,
        recencyScore: 0.89,
        explanation: 'LSTM, Transformer 기반 시계열 모델을 비교 분석합니다.'
      },
      url: 'https://arxiv.org/abs/1912.09363',
      journal: 'Journal of Forecasting',
      authors: ['Lim, B.', 'Zohren, S.'],
      year: 2023,
      citationCount: 198,
      keywords: ['time series', 'forecasting', 'LSTM']
    },
    {
      id: 16,
      type: 'paper',
      title: 'Edge AI: Machine Learning on IoT Devices',
      description: 'Deploying AI models on resource-constrained edge devices.',
      score: 0.86,
      level: '참고',
      reason: 'IoT 환경에서의 AI 구현 방법을 다룹니다.',
      detailedReason: {
        semanticSimilarity: 0.86,
        keywordMatch: 0.83,
        citationRelevance: 0.85,
        recencyScore: 0.88,
        explanation: '모델 경량화와 최적화 기법을 실용적으로 제시합니다.'
      },
      url: 'https://arxiv.org/abs/1908.00709',
      journal: 'IEEE Internet of Things Journal',
      authors: ['Zhou, Z.', 'Chen, X.'],
      year: 2023,
      citationCount: 167,
      keywords: ['edge AI', 'IoT', 'model compression']
    },
    {
      id: 17,
      type: 'paper',
      title: 'Meta-Learning: Learning to Learn',
      description: 'Algorithms that improve learning efficiency through meta-knowledge.',
      score: 0.85,
      level: '참고',
      reason: '효율적인 학습 방법론의 핵심을 제공합니다.',
      detailedReason: {
        semanticSimilarity: 0.85,
        keywordMatch: 0.82,
        citationRelevance: 0.84,
        recencyScore: 0.87,
        explanation: 'Few-shot learning과 MAML 등 메타학습 기법을 설명합니다.'
      },
      url: 'https://arxiv.org/abs/1703.03400',
      journal: 'ICML',
      authors: ['Finn, C.', 'Abbeel, P.'],
      year: 2023,
      citationCount: 389,
      keywords: ['meta-learning', 'few-shot', 'MAML']
    },
    {
      id: 18,
      type: 'paper',
      title: 'Adversarial Robustness in Deep Learning',
      description: 'Defending neural networks against adversarial attacks.',
      score: 0.84,
      level: '참고',
      reason: 'AI 보안의 중요한 측면을 다룹니다.',
      detailedReason: {
        semanticSimilarity: 0.84,
        keywordMatch: 0.81,
        citationRelevance: 0.83,
        recencyScore: 0.86,
        explanation: '적대적 공격과 방어 메커니즘을 체계적으로 분석합니다.'
      },
      url: 'https://arxiv.org/abs/1706.06083',
      journal: 'IEEE S&P',
      authors: ['Madry, A.', 'Makelov, A.'],
      year: 2023,
      citationCount: 512,
      keywords: ['adversarial', 'robustness', 'security']
    },
    {
      id: 19,
      type: 'paper',
      title: 'Neural Rendering and NeRF',
      description: 'Novel view synthesis using neural radiance fields.',
      score: 0.91,
      level: '가장 추천',
      reason: '3D 재구성의 혁신적 기술을 소개합니다.',
      detailedReason: {
        semanticSimilarity: 0.91,
        keywordMatch: 0.88,
        citationRelevance: 0.90,
        recencyScore: 0.94,
        explanation: 'NeRF를 활용한 고품질 3D 렌더링 기법을 제공합니다.'
      },
      url: 'https://arxiv.org/abs/2003.08934',
      journal: 'ECCV',
      authors: ['Mildenhall, B.', 'Srinivasan, P.P.'],
      year: 2024,
      citationCount: 678,
      keywords: ['NeRF', 'neural rendering', '3D reconstruction']
    },
    {
      id: 20,
      type: 'paper',
      title: 'Continual Learning: Lifelong AI Systems',
      description: 'Learning new tasks without forgetting previous knowledge.',
      score: 0.87,
      level: '추천',
      reason: '지속적 학습의 핵심 문제를 해결합니다.',
      detailedReason: {
        semanticSimilarity: 0.87,
        keywordMatch: 0.84,
        citationRelevance: 0.86,
        recencyScore: 0.89,
        explanation: 'Catastrophic forgetting을 방지하는 다양한 기법을 제시합니다.'
      },
      url: 'https://arxiv.org/abs/1904.07734',
      journal: 'Neural Networks',
      authors: ['Parisi, G.I.', 'Kemker, R.'],
      year: 2023,
      citationCount: 234,
      keywords: ['continual learning', 'lifelong learning', 'catastrophic forgetting']
    },
    
    // 데이터셋 20개
    {
      id: 101,
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
        explanation: '김연구님의 연구 주제와 91%의 의미적 연관성을 가진 최신 데이터셋입니다.'
      },
      url: 'https://www.ncdc.noaa.gov/data-access',
      publisher: 'World Meteorological Organization',
      year: 2024,
      dataSize: '127GB',
      format: 'NetCDF, CSV',
      keywords: ['climate', 'meteorology', 'global']
    },
    {
      id: 102,
      type: 'dataset',
      title: 'ImageNet Large Scale Visual Recognition',
      description: 'Massive image dataset for object recognition and classification.',
      score: 0.93,
      level: '가장 추천',
      reason: '컴퓨터 비전 연구의 표준 벤치마크입니다.',
      detailedReason: {
        semanticSimilarity: 0.93,
        keywordMatch: 0.90,
        citationRelevance: 0.92,
        recencyScore: 0.88,
        explanation: '1400만 장 이상의 레이블된 이미지로 구성된 대규모 데이터셋입니다.'
      },
      url: 'https://www.image-net.org/',
      publisher: 'Stanford University',
      year: 2023,
      dataSize: '155GB',
      format: 'JPEG, XML',
      keywords: ['computer vision', 'object recognition', 'deep learning']
    },
    {
      id: 103,
      type: 'dataset',
      title: 'Common Crawl Web Archive',
      description: 'Petabyte-scale web crawl data for NLP research.',
      score: 0.90,
      level: '추천',
      reason: '대규모 텍스트 데이터 분석에 필수적입니다.',
      detailedReason: {
        semanticSimilarity: 0.90,
        keywordMatch: 0.87,
        citationRelevance: 0.88,
        recencyScore: 0.94,
        explanation: '매월 업데이트되는 페타바이트급 웹 크롤 데이터입니다.'
      },
      url: 'https://commoncrawl.org/',
      publisher: 'Common Crawl Foundation',
      year: 2024,
      dataSize: '250TB',
      format: 'WARC, WET, WAT',
      keywords: ['NLP', 'web crawl', 'text mining']
    },
    {
      id: 104,
      type: 'dataset',
      title: 'Human Genome Variation Database',
      description: 'Comprehensive database of human genetic variations.',
      score: 0.89,
      level: '추천',
      reason: '유전체 연구의 기초 데이터를 제공합니다.',
      detailedReason: {
        semanticSimilarity: 0.89,
        keywordMatch: 0.86,
        citationRelevance: 0.87,
        recencyScore: 0.91,
        explanation: '인간 유전체 변이에 대한 포괄적 정보를 담고 있습니다.'
      },
      url: 'https://www.ncbi.nlm.nih.gov/clinvar/',
      publisher: 'NCBI',
      year: 2024,
      dataSize: '890GB',
      format: 'VCF, JSON',
      keywords: ['genomics', 'genetics', 'bioinformatics']
    },
    {
      id: 105,
      type: 'dataset',
      title: 'Satellite Imagery for Earth Observation',
      description: 'High-resolution satellite images for environmental monitoring.',
      score: 0.88,
      level: '추천',
      reason: '환경 연구의 핵심 데이터 소스입니다.',
      detailedReason: {
        semanticSimilarity: 0.88,
        keywordMatch: 0.85,
        citationRelevance: 0.86,
        recencyScore: 0.92,
        explanation: 'Sentinel-2와 Landsat 위성의 고해상도 영상 데이터입니다.'
      },
      url: 'https://earthdata.nasa.gov/',
      publisher: 'NASA Earth Science',
      year: 2024,
      dataSize: '2.1TB',
      format: 'GeoTIFF, HDF',
      keywords: ['satellite', 'remote sensing', 'earth observation']
    },
    {
      id: 106,
      type: 'dataset',
      title: 'Medical Imaging Dataset Collection',
      description: 'Diverse medical imaging data including CT, MRI, and X-rays.',
      score: 0.92,
      level: '가장 추천',
      reason: '의료 AI 연구의 필수 데이터셋입니다.',
      detailedReason: {
        semanticSimilarity: 0.92,
        keywordMatch: 0.89,
        citationRelevance: 0.90,
        recencyScore: 0.93,
        explanation: '다양한 의료 영상 모달리티의 레이블된 데이터를 제공합니다.'
      },
      url: 'https://www.cancerimagingarchive.net/',
      publisher: 'NIH',
      year: 2024,
      dataSize: '750GB',
      format: 'DICOM, NIfTI',
      keywords: ['medical imaging', 'radiology', 'healthcare AI']
    },
    {
      id: 107,
      type: 'dataset',
      title: 'Speech Recognition Audio Corpus',
      description: 'Large-scale multilingual speech dataset for ASR.',
      score: 0.87,
      level: '추천',
      reason: '음성 인식 모델 훈련에 최적화되어 있습니다.',
      detailedReason: {
        semanticSimilarity: 0.87,
        keywordMatch: 0.84,
        citationRelevance: 0.85,
        recencyScore: 0.90,
        explanation: '50개 이상 언어의 음성 데이터를 포함합니다.'
      },
      url: 'https://commonvoice.mozilla.org/',
      publisher: 'Mozilla Foundation',
      year: 2024,
      dataSize: '450GB',
      format: 'MP3, WAV',
      keywords: ['speech recognition', 'ASR', 'audio processing']
    },
    {
      id: 108,
      type: 'dataset',
      title: 'Financial Market Time Series Data',
      description: 'Historical stock prices and trading volumes.',
      score: 0.86,
      level: '참고',
      reason: '금융 예측 모델 개발에 활용됩니다.',
      detailedReason: {
        semanticSimilarity: 0.86,
        keywordMatch: 0.83,
        citationRelevance: 0.84,
        recencyScore: 0.89,
        explanation: '20년 이상의 글로벌 금융 시장 데이터를 제공합니다.'
      },
      url: 'https://www.kaggle.com/datasets/borismarjanovic/price-volume-data-for-all-us-stocks-etfs',
      publisher: 'Kaggle',
      year: 2023,
      dataSize: '35GB',
      format: 'CSV, JSON',
      keywords: ['finance', 'time series', 'stock market']
    },
    {
      id: 109,
      type: 'dataset',
      title: 'Social Media Sentiment Analysis Dataset',
      description: 'Labeled tweets and posts for sentiment classification.',
      score: 0.85,
      level: '참고',
      reason: 'NLP 감성 분석 연구에 적합합니다.',
      detailedReason: {
        semanticSimilarity: 0.85,
        keywordMatch: 0.82,
        citationRelevance: 0.83,
        recencyScore: 0.88,
        explanation: '100만 개 이상의 레이블된 소셜 미디어 포스트를 포함합니다.'
      },
      url: 'http://help.sentiment140.com/',
      publisher: 'Stanford University',
      year: 2023,
      dataSize: '18GB',
      format: 'CSV, JSON',
      keywords: ['sentiment analysis', 'NLP', 'social media']
    },
    {
      id: 110,
      type: 'dataset',
      title: 'Autonomous Driving Dataset',
      description: 'LiDAR and camera data for self-driving car research.',
      score: 0.90,
      level: '추천',
      reason: '자율주행 알고리즘 개발의 핵심 데이터입니다.',
      detailedReason: {
        semanticSimilarity: 0.90,
        keywordMatch: 0.87,
        citationRelevance: 0.88,
        recencyScore: 0.92,
        explanation: 'Waymo와 nuScenes의 고품질 센서 데이터를 제공합니다.'
      },
      url: 'https://www.nuscenes.org/',
      publisher: 'Motional',
      year: 2024,
      dataSize: '1.2TB',
      format: 'PCD, PNG, JSON',
      keywords: ['autonomous driving', 'LiDAR', 'computer vision']
    },
    {
      id: 111,
      type: 'dataset',
      title: 'Protein Structure Database',
      description: '3D structures of proteins for drug discovery.',
      score: 0.89,
      level: '추천',
      reason: '생명과학 연구의 필수 데이터베이스입니다.',
      detailedReason: {
        semanticSimilarity: 0.89,
        keywordMatch: 0.86,
        citationRelevance: 0.87,
        recencyScore: 0.91,
        explanation: 'AlphaFold 예측을 포함한 단백질 구조 데이터입니다.'
      },
      url: 'https://www.rcsb.org/',
      publisher: 'RCSB PDB',
      year: 2024,
      dataSize: '560GB',
      format: 'PDB, mmCIF',
      keywords: ['protein structure', 'bioinformatics', 'drug discovery']
    },
    {
      id: 112,
      type: 'dataset',
      title: 'Urban Air Quality Monitoring Data',
      description: 'Real-time air pollution measurements from global cities.',
      score: 0.87,
      level: '추천',
      reason: '환경 건강 연구에 중요한 데이터입니다.',
      detailedReason: {
        semanticSimilarity: 0.87,
        keywordMatch: 0.84,
        citationRelevance: 0.85,
        recencyScore: 0.93,
        explanation: '전 세계 주요 도시의 실시간 대기질 데이터를 제공합니다.'
      },
      url: 'https://aqicn.org/data-platform/',
      publisher: 'World Air Quality Index',
      year: 2024,
      dataSize: '92GB',
      format: 'CSV, JSON, API',
      keywords: ['air quality', 'pollution', 'environmental health']
    },
    {
      id: 113,
      type: 'dataset',
      title: 'Video Understanding Benchmark',
      description: 'Annotated videos for action recognition and tracking.',
      score: 0.88,
      level: '추천',
      reason: '비디오 분석 AI 개발에 최적화되어 있습니다.',
      detailedReason: {
        semanticSimilarity: 0.88,
        keywordMatch: 0.85,
        citationRelevance: 0.86,
        recencyScore: 0.90,
        explanation: 'Kinetics와 ActivityNet을 포함한 대규모 비디오 데이터입니다.'
      },
      url: 'http://activity-net.org/',
      publisher: 'MIT-IBM Watson AI Lab',
      year: 2024,
      dataSize: '850GB',
      format: 'MP4, JSON',
      keywords: ['video understanding', 'action recognition', 'computer vision']
    },
    {
      id: 114,
      type: 'dataset',
      title: 'Question Answering Dataset Collection',
      description: 'Diverse QA datasets for NLP model training.',
      score: 0.86,
      level: '참고',
      reason: '대화형 AI 시스템 구축에 활용됩니다.',
      detailedReason: {
        semanticSimilarity: 0.86,
        keywordMatch: 0.83,
        citationRelevance: 0.84,
        recencyScore: 0.89,
        explanation: 'SQuAD, Natural Questions 등 주요 QA 데이터셋을 포함합니다.'
      },
      url: 'https://rajpurkar.github.io/SQuAD-explorer/',
      publisher: 'Stanford NLP Group',
      year: 2023,
      dataSize: '28GB',
      format: 'JSON',
      keywords: ['question answering', 'NLP', 'reading comprehension']
    },
    {
      id: 115,
      type: 'dataset',
      title: 'Robotics Manipulation Dataset',
      description: 'Demonstrations of robot manipulation tasks.',
      score: 0.85,
      level: '참고',
      reason: '로봇 학습 알고리즘 훈련에 사용됩니다.',
      detailedReason: {
        semanticSimilarity: 0.85,
        keywordMatch: 0.82,
        citationRelevance: 0.83,
        recencyScore: 0.88,
        explanation: '다양한 물체 조작 작업의 시연 데이터를 제공합니다.'
      },
      url: 'https://robotics.google.com/datasets/',
      publisher: 'Google Robotics',
      year: 2023,
      dataSize: '380GB',
      format: 'TFRecord, HDF5',
      keywords: ['robotics', 'manipulation', 'imitation learning']
    },
    {
      id: 116,
      type: 'dataset',
      title: 'Earthquake Seismic Waveform Data',
      description: 'Global seismological measurements for earthquake research.',
      score: 0.84,
      level: '참고',
      reason: '지진 예측 및 분석 연구에 활용됩니다.',
      detailedReason: {
        semanticSimilarity: 0.84,
        keywordMatch: 0.81,
        citationRelevance: 0.82,
        recencyScore: 0.87,
        explanation: '전 세계 지진계 네트워크의 파형 데이터입니다.'
      },
      url: 'https://www.iris.edu/hq/',
      publisher: 'IRIS',
      year: 2023,
      dataSize: '1.8TB',
      format: 'SAC, miniSEED',
      keywords: ['seismology', 'earthquake', 'geophysics']
    },
    {
      id: 117,
      type: 'dataset',
      title: 'E-commerce Product Recommendation Data',
      description: 'User interactions and product catalogs for recommendation systems.',
      score: 0.86,
      level: '참고',
      reason: '추천 시스템 개발의 실무 데이터입니다.',
      detailedReason: {
        semanticSimilarity: 0.86,
        keywordMatch: 0.83,
        citationRelevance: 0.84,
        recencyScore: 0.89,
        explanation: 'Amazon과 같은 대규모 이커머스 플랫폼의 실제 데이터입니다.'
      },
      url: 'https://jmcauley.ucsd.edu/data/amazon/',
      publisher: 'UCSD',
      year: 2023,
      dataSize: '142GB',
      format: 'JSON, CSV',
      keywords: ['recommendation', 'e-commerce', 'collaborative filtering']
    },
    {
      id: 118,
      type: 'dataset',
      title: 'Neural Network Model Zoo',
      description: 'Pre-trained models for transfer learning.',
      score: 0.91,
      level: '가장 추천',
      reason: '전이 학습을 통한 빠른 모델 개발이 가능합니다.',
      detailedReason: {
        semanticSimilarity: 0.91,
        keywordMatch: 0.88,
        citationRelevance: 0.89,
        recencyScore: 0.94,
        explanation: 'ResNet, BERT, GPT 등 최신 사전 훈련 모델을 제공합니다.'
      },
      url: 'https://pytorch.org/hub/',
      publisher: 'PyTorch Community',
      year: 2024,
      dataSize: '580GB',
      format: 'PyTorch, ONNX',
      keywords: ['pre-trained models', 'transfer learning', 'model zoo']
    },
    {
      id: 119,
      type: 'dataset',
      title: 'Cybersecurity Threat Intelligence Feed',
      description: 'Network traffic and malware samples for security research.',
      score: 0.87,
      level: '추천',
      reason: 'AI 기반 보안 시스템 개발에 필수적입니다.',
      detailedReason: {
        semanticSimilarity: 0.87,
        keywordMatch: 0.84,
        citationRelevance: 0.85,
        recencyScore: 0.92,
        explanation: '최신 사이버 위협 정보와 악성코드 샘플을 포함합니다.'
      },
      url: 'https://www.stratosphereips.org/datasets-overview',
      publisher: 'Stratosphere IPS',
      year: 2024,
      dataSize: '215GB',
      format: 'PCAP, JSON',
      keywords: ['cybersecurity', 'malware', 'network security']
    },
    {
      id: 120,
      type: 'dataset',
      title: 'Agricultural Crop Monitoring Dataset',
      description: 'Satellite and drone imagery for precision agriculture.',
      score: 0.85,
      level: '참고',
      reason: '스마트 농업 AI 개발에 활용됩니다.',
      detailedReason: {
        semanticSimilarity: 0.85,
        keywordMatch: 0.82,
        citationRelevance: 0.83,
        recencyScore: 0.90,
        explanation: '작물 건강 모니터링과 수확량 예측을 위한 데이터입니다.'
      },
      url: 'https://www.usgs.gov/cropscape',
      publisher: 'USDA',
      year: 2024,
      dataSize: '425GB',
      format: 'GeoTIFF, Shapefile',
      keywords: ['agriculture', 'crop monitoring', 'remote sensing']
    },
    
    // 추가 논문 15개
    {
      id: 121,
      type: 'paper',
      title: 'Attention Is All You Need: Transformer Architecture',
      description: 'The groundbreaking paper that introduced the Transformer model.',
      score: 0.95,
      level: '가장 추천',
      reason: 'NLP 분야를 혁신시킨 가장 영향력 있는 논문입니다.',
      detailedReason: {
        semanticSimilarity: 0.95,
        keywordMatch: 0.93,
        citationRelevance: 0.96,
        recencyScore: 0.85,
        explanation: '현대 NLP의 기반이 된 트랜스포머 아키텍처를 소개합니다.'
      },
      url: 'https://arxiv.org/abs/1706.03762',
      journal: 'NeurIPS',
      authors: ['Vaswani, A.', 'Shazeer, N.', 'Parmar, N.'],
      year: 2017,
      citationCount: 89234,
      keywords: ['transformer', 'attention mechanism', 'NLP', 'deep learning']
    },
    {
      id: 122,
      type: 'paper',
      title: 'BERT: Pre-training of Deep Bidirectional Transformers',
      description: 'Revolutionary approach to language understanding through pre-training.',
      score: 0.94,
      level: '가장 추천',
      reason: '양방향 언어 모델의 새로운 패러다임을 제시합니다.',
      detailedReason: {
        semanticSimilarity: 0.94,
        keywordMatch: 0.92,
        citationRelevance: 0.95,
        recencyScore: 0.84,
        explanation: 'Transfer learning을 NLP에 성공적으로 적용한 획기적 연구입니다.'
      },
      url: 'https://arxiv.org/abs/1810.04805',
      journal: 'NAACL',
      authors: ['Devlin, J.', 'Chang, M.W.', 'Lee, K.'],
      year: 2019,
      citationCount: 67892,
      keywords: ['BERT', 'pre-training', 'language model', 'NLP']
    },
    {
      id: 123,
      type: 'paper',
      title: 'ResNet: Deep Residual Learning for Image Recognition',
      description: 'Introducing residual connections for training very deep networks.',
      score: 0.93,
      level: '가장 추천',
      reason: '초심층 신경망 훈련의 혁신적 방법론입니다.',
      detailedReason: {
        semanticSimilarity: 0.93,
        keywordMatch: 0.91,
        citationRelevance: 0.94,
        recencyScore: 0.83,
        explanation: 'Residual connections으로 매우 깊은 네트워크 훈련을 가능하게 했습니다.'
      },
      url: 'https://arxiv.org/abs/1512.03385',
      journal: 'CVPR',
      authors: ['He, K.', 'Zhang, X.', 'Ren, S.', 'Sun, J.'],
      year: 2016,
      citationCount: 123456,
      keywords: ['ResNet', 'residual learning', 'computer vision', 'deep learning']
    },
    {
      id: 124,
      type: 'paper',
      title: 'AlphaGo: Mastering the Game of Go with Deep Neural Networks',
      description: 'AI system that defeated world champion Go players.',
      score: 0.92,
      level: '가장 추천',
      reason: '강화학습의 획기적 성과를 보여줍니다.',
      detailedReason: {
        semanticSimilarity: 0.92,
        keywordMatch: 0.90,
        citationRelevance: 0.93,
        recencyScore: 0.82,
        explanation: 'Deep RL과 MCTS를 결합한 혁신적 접근법입니다.'
      },
      url: 'https://www.nature.com/articles/nature16961',
      journal: 'Nature',
      authors: ['Silver, D.', 'Huang, A.', 'Maddison, C.J.'],
      year: 2016,
      citationCount: 23456,
      keywords: ['AlphaGo', 'reinforcement learning', 'Monte Carlo tree search', 'game AI']
    },
    {
      id: 125,
      type: 'paper',
      title: 'Generative Adversarial Networks',
      description: 'Novel framework for generative models through adversarial training.',
      score: 0.94,
      level: '가장 추천',
      reason: '생성 모델의 새로운 시대를 연 기념비적 논문입니다.',
      detailedReason: {
        semanticSimilarity: 0.94,
        keywordMatch: 0.92,
        citationRelevance: 0.95,
        recencyScore: 0.81,
        explanation: 'Generator와 Discriminator의 대립을 통한 학습 방법을 제안합니다.'
      },
      url: 'https://arxiv.org/abs/1406.2661',
      journal: 'NeurIPS',
      authors: ['Goodfellow, I.', 'Pouget-Abadie, J.', 'Mirza, M.'],
      year: 2014,
      citationCount: 45678,
      keywords: ['GAN', 'generative models', 'adversarial training', 'deep learning']
    },
    {
      id: 126,
      type: 'paper',
      title: 'YOLO: You Only Look Once - Real-Time Object Detection',
      description: 'Unified real-time object detection system.',
      score: 0.91,
      level: '가장 추천',
      reason: '실시간 객체 탐지의 표준을 제시합니다.',
      detailedReason: {
        semanticSimilarity: 0.91,
        keywordMatch: 0.89,
        citationRelevance: 0.92,
        recencyScore: 0.86,
        explanation: '단일 네트워크로 빠르고 정확한 객체 탐지를 구현합니다.'
      },
      url: 'https://arxiv.org/abs/1506.02640',
      journal: 'CVPR',
      authors: ['Redmon, J.', 'Divvala, S.', 'Girshick, R.', 'Farhadi, A.'],
      year: 2016,
      citationCount: 34567,
      keywords: ['YOLO', 'object detection', 'real-time', 'computer vision']
    },
    {
      id: 127,
      type: 'paper',
      title: 'U-Net: Convolutional Networks for Biomedical Image Segmentation',
      description: 'Architecture for precise localization in biomedical images.',
      score: 0.90,
      level: '추천',
      reason: '의료 영상 분할의 대표적 네트워크 구조입니다.',
      detailedReason: {
        semanticSimilarity: 0.90,
        keywordMatch: 0.88,
        citationRelevance: 0.91,
        recencyScore: 0.80,
        explanation: 'Encoder-Decoder 구조로 정밀한 세그멘테이션을 가능하게 합니다.'
      },
      url: 'https://arxiv.org/abs/1505.04597',
      journal: 'MICCAI',
      authors: ['Ronneberger, O.', 'Fischer, P.', 'Brox, T.'],
      year: 2015,
      citationCount: 56789,
      keywords: ['U-Net', 'segmentation', 'biomedical imaging', 'deep learning']
    },
    {
      id: 128,
      type: 'paper',
      title: 'EfficientNet: Rethinking Model Scaling',
      description: 'Systematic study of neural network scaling methods.',
      score: 0.89,
      level: '추천',
      reason: '효율적인 모델 스케일링 방법을 제시합니다.',
      detailedReason: {
        semanticSimilarity: 0.89,
        keywordMatch: 0.87,
        citationRelevance: 0.90,
        recencyScore: 0.88,
        explanation: 'Depth, width, resolution을 균형있게 스케일링하는 방법을 제안합니다.'
      },
      url: 'https://arxiv.org/abs/1905.11946',
      journal: 'ICML',
      authors: ['Tan, M.', 'Le, Q.V.'],
      year: 2019,
      citationCount: 12345,
      keywords: ['EfficientNet', 'model scaling', 'neural architecture', 'efficiency']
    },
    {
      id: 129,
      type: 'paper',
      title: 'GPT-3: Language Models are Few-Shot Learners',
      description: 'Demonstration of few-shot learning capabilities in large language models.',
      score: 0.96,
      level: '가장 추천',
      reason: 'LLM의 능력을 극적으로 보여준 획기적 연구입니다.',
      detailedReason: {
        semanticSimilarity: 0.96,
        keywordMatch: 0.94,
        citationRelevance: 0.97,
        recencyScore: 0.89,
        explanation: '175B 파라미터 모델의 놀라운 few-shot 능력을 입증했습니다.'
      },
      url: 'https://arxiv.org/abs/2005.14165',
      journal: 'NeurIPS',
      authors: ['Brown, T.B.', 'Mann, B.', 'Ryder, N.'],
      year: 2020,
      citationCount: 23456,
      keywords: ['GPT-3', 'few-shot learning', 'large language model', 'NLP']
    },
    {
      id: 130,
      type: 'paper',
      title: 'Dropout: A Simple Way to Prevent Neural Networks from Overfitting',
      description: 'Regularization technique that has become standard in deep learning.',
      score: 0.88,
      level: '추천',
      reason: '과적합 방지의 간단하면서도 효과적인 방법입니다.',
      detailedReason: {
        semanticSimilarity: 0.88,
        keywordMatch: 0.86,
        citationRelevance: 0.89,
        recencyScore: 0.78,
        explanation: '학습 중 랜덤하게 뉴런을 제거하여 과적합을 방지합니다.'
      },
      url: 'https://jmlr.org/papers/v15/srivastava14a.html',
      journal: 'JMLR',
      authors: ['Srivastava, N.', 'Hinton, G.', 'Krizhevsky, A.'],
      year: 2014,
      citationCount: 45678,
      keywords: ['dropout', 'regularization', 'overfitting', 'deep learning']
    },
    {
      id: 131,
      type: 'paper',
      title: 'Batch Normalization: Accelerating Deep Network Training',
      description: 'Technique to reduce internal covariate shift in neural networks.',
      score: 0.89,
      level: '추천',
      reason: '딥러닝 훈련을 안정화하고 가속화합니다.',
      detailedReason: {
        semanticSimilarity: 0.89,
        keywordMatch: 0.87,
        citationRelevance: 0.90,
        recencyScore: 0.79,
        explanation: '각 레이어의 입력을 정규화하여 학습 속도를 크게 향상시킵니다.'
      },
      url: 'https://arxiv.org/abs/1502.03167',
      journal: 'ICML',
      authors: ['Ioffe, S.', 'Szegedy, C.'],
      year: 2015,
      citationCount: 78901,
      keywords: ['batch normalization', 'training acceleration', 'deep learning']
    },
    {
      id: 132,
      type: 'paper',
      title: 'MobileNet: Efficient Convolutional Neural Networks',
      description: 'Efficient architectures for mobile and embedded vision applications.',
      score: 0.87,
      level: '추천',
      reason: '모바일 디바이스에 최적화된 효율적 네트워크입니다.',
      detailedReason: {
        semanticSimilarity: 0.87,
        keywordMatch: 0.85,
        citationRelevance: 0.88,
        recencyScore: 0.85,
        explanation: 'Depthwise separable convolution으로 파라미터 수를 대폭 감소시켰습니다.'
      },
      url: 'https://arxiv.org/abs/1704.04861',
      journal: 'arXiv',
      authors: ['Howard, A.G.', 'Zhu, M.', 'Chen, B.'],
      year: 2017,
      citationCount: 23456,
      keywords: ['MobileNet', 'efficient networks', 'mobile AI', 'computer vision']
    },
    {
      id: 133,
      type: 'paper',
      title: 'Word2Vec: Efficient Estimation of Word Representations',
      description: 'Learning high-quality word vectors from large amounts of text.',
      score: 0.90,
      level: '추천',
      reason: 'NLP의 기초가 되는 단어 임베딩 방법입니다.',
      detailedReason: {
        semanticSimilarity: 0.90,
        keywordMatch: 0.88,
        citationRelevance: 0.91,
        recencyScore: 0.75,
        explanation: 'Skip-gram과 CBOW 모델로 의미있는 단어 벡터를 학습합니다.'
      },
      url: 'https://arxiv.org/abs/1301.3781',
      journal: 'ICLR Workshop',
      authors: ['Mikolov, T.', 'Chen, K.', 'Corrado, G.', 'Dean, J.'],
      year: 2013,
      citationCount: 89012,
      keywords: ['Word2Vec', 'word embeddings', 'NLP', 'representation learning']
    },
    {
      id: 134,
      type: 'paper',
      title: 'CLIP: Learning Transferable Visual Models From Natural Language',
      description: 'Connecting vision and language through contrastive learning.',
      score: 0.93,
      level: '가장 추천',
      reason: '비전과 언어를 연결하는 혁신적 접근법입니다.',
      detailedReason: {
        semanticSimilarity: 0.93,
        keywordMatch: 0.91,
        citationRelevance: 0.94,
        recencyScore: 0.91,
        explanation: '대규모 이미지-텍스트 쌍으로 강력한 멀티모달 모델을 학습합니다.'
      },
      url: 'https://arxiv.org/abs/2103.00020',
      journal: 'ICML',
      authors: ['Radford, A.', 'Kim, J.W.', 'Hallacy, C.'],
      year: 2021,
      citationCount: 12345,
      keywords: ['CLIP', 'multimodal', 'vision-language', 'contrastive learning']
    },
    {
      id: 135,
      type: 'paper',
      title: 'Stable Diffusion: High-Resolution Image Synthesis',
      description: 'Latent diffusion models for high-quality image generation.',
      score: 0.92,
      level: '가장 추천',
      reason: '고품질 이미지 생성의 최신 기술입니다.',
      detailedReason: {
        semanticSimilarity: 0.92,
        keywordMatch: 0.90,
        citationRelevance: 0.93,
        recencyScore: 0.96,
        explanation: 'Latent space에서 효율적으로 고해상도 이미지를 생성합니다.'
      },
      url: 'https://arxiv.org/abs/2112.10752',
      journal: 'CVPR',
      authors: ['Rombach, R.', 'Blattmann, A.', 'Lorenz, D.'],
      year: 2022,
      citationCount: 8901,
      keywords: ['diffusion models', 'image synthesis', 'generative AI', 'latent diffusion']
    },

    // 추가 데이터셋 15개
    {
      id: 136,
      type: 'dataset',
      title: 'COCO: Common Objects in Context',
      description: 'Large-scale object detection, segmentation, and captioning dataset.',
      score: 0.94,
      level: '가장 추천',
      reason: '컴퓨터 비전의 표준 벤치마크 데이터셋입니다.',
      detailedReason: {
        semanticSimilarity: 0.94,
        keywordMatch: 0.92,
        citationRelevance: 0.95,
        recencyScore: 0.82,
        explanation: '33만 장 이상의 이미지와 250만 개의 인스턴스 레이블을 포함합니다.'
      },
      url: 'https://cocodataset.org/',
      publisher: 'Microsoft Research',
      year: 2014,
      dataSize: '25GB',
      format: 'JPEG, JSON',
      keywords: ['object detection', 'segmentation', 'image captioning', 'benchmark']
    },
    {
      id: 137,
      type: 'dataset',
      title: 'Wikipedia Dump: Complete Text Data',
      description: 'Full text of Wikipedia in multiple languages.',
      score: 0.90,
      level: '추천',
      reason: 'NLP 연구의 대표적인 텍스트 코퍼스입니다.',
      detailedReason: {
        semanticSimilarity: 0.90,
        keywordMatch: 0.88,
        citationRelevance: 0.89,
        recencyScore: 0.95,
        explanation: '300개 이상 언어의 위키피디아 전체 텍스트를 제공합니다.'
      },
      url: 'https://dumps.wikimedia.org/',
      publisher: 'Wikimedia Foundation',
      year: 2024,
      dataSize: '20TB',
      format: 'XML, SQL',
      keywords: ['Wikipedia', 'text corpus', 'NLP', 'knowledge base']
    },
    {
      id: 138,
      type: 'dataset',
      title: 'Kaggle Datasets Collection',
      description: 'Community-driven collection of diverse datasets.',
      score: 0.88,
      level: '추천',
      reason: '다양한 분야의 실무 데이터를 제공합니다.',
      detailedReason: {
        semanticSimilarity: 0.88,
        keywordMatch: 0.86,
        citationRelevance: 0.87,
        recencyScore: 0.93,
        explanation: '100만 개 이상의 데이터셋으로 실전 경험을 쌓을 수 있습니다.'
      },
      url: 'https://www.kaggle.com/datasets',
      publisher: 'Kaggle',
      year: 2024,
      dataSize: 'Variable',
      format: 'Various',
      keywords: ['machine learning', 'data science', 'competitions', 'diverse datasets']
    },
    {
      id: 139,
      type: 'dataset',
      title: 'OpenStreetMap: Global Map Data',
      description: 'Collaborative mapping data of the entire world.',
      score: 0.87,
      level: '추천',
      reason: '위치 기반 연구의 필수 데이터입니다.',
      detailedReason: {
        semanticSimilarity: 0.87,
        keywordMatch: 0.85,
        citationRelevance: 0.86,
        recencyScore: 0.94,
        explanation: '전 세계 도로, 건물, 지형 정보를 포함한 오픈 소스 지도 데이터입니다.'
      },
      url: 'https://www.openstreetmap.org/',
      publisher: 'OpenStreetMap Foundation',
      year: 2024,
      dataSize: '1.5TB',
      format: 'XML, PBF',
      keywords: ['maps', 'GIS', 'location data', 'open source']
    },
    {
      id: 140,
      type: 'dataset',
      title: 'Million Song Dataset',
      description: 'Audio features and metadata for a million songs.',
      score: 0.85,
      level: '참고',
      reason: '음악 정보 검색 연구의 대표 데이터셋입니다.',
      detailedReason: {
        semanticSimilarity: 0.85,
        keywordMatch: 0.83,
        citationRelevance: 0.84,
        recencyScore: 0.80,
        explanation: '100만 곡의 오디오 특징과 메타데이터를 제공합니다.'
      },
      url: 'http://millionsongdataset.com/',
      publisher: 'Columbia University',
      year: 2011,
      dataSize: '280GB',
      format: 'HDF5',
      keywords: ['music', 'audio analysis', 'recommendation', 'information retrieval']
    },
    {
      id: 141,
      type: 'dataset',
      title: 'MS MARCO: Machine Reading Comprehension',
      description: 'Large-scale dataset for question answering and passage ranking.',
      score: 0.91,
      level: '가장 추천',
      reason: '정보 검색과 QA 연구의 표준 데이터셋입니다.',
      detailedReason: {
        semanticSimilarity: 0.91,
        keywordMatch: 0.89,
        citationRelevance: 0.90,
        recencyScore: 0.88,
        explanation: '실제 Bing 검색 쿼리 기반의 100만 개 이상 질문-답변 쌍을 포함합니다.'
      },
      url: 'https://microsoft.github.io/msmarco/',
      publisher: 'Microsoft AI',
      year: 2016,
      dataSize: '150GB',
      format: 'JSON, TSV',
      keywords: ['question answering', 'information retrieval', 'NLP', 'reading comprehension']
    },
    {
      id: 142,
      type: 'dataset',
      title: 'Cityscapes: Semantic Urban Scene Understanding',
      description: 'Large-scale dataset for semantic segmentation of urban street scenes.',
      score: 0.89,
      level: '추천',
      reason: '자율주행과 도시 장면 이해 연구에 필수적입니다.',
      detailedReason: {
        semanticSimilarity: 0.89,
        keywordMatch: 0.87,
        citationRelevance: 0.88,
        recencyScore: 0.84,
        explanation: '50개 도시의 정밀한 픽셀 단위 레이블이 있는 고해상도 이미지를 제공합니다.'
      },
      url: 'https://www.cityscapes-dataset.com/',
      publisher: 'Daimler AG',
      year: 2016,
      dataSize: '11GB',
      format: 'PNG, JSON',
      keywords: ['semantic segmentation', 'autonomous driving', 'urban scenes', 'computer vision']
    },
    {
      id: 143,
      type: 'dataset',
      title: 'MIMIC-III: Medical Information Mart',
      description: 'De-identified health data from ICU patients.',
      score: 0.92,
      level: '가장 추천',
      reason: '의료 AI 연구의 대표적 공개 데이터셋입니다.',
      detailedReason: {
        semanticSimilarity: 0.92,
        keywordMatch: 0.90,
        citationRelevance: 0.91,
        recencyScore: 0.86,
        explanation: '4만 명 이상 중환자의 비식별화된 의료 기록을 포함합니다.'
      },
      url: 'https://mimic.mit.edu/',
      publisher: 'MIT',
      year: 2016,
      dataSize: '47GB',
      format: 'CSV, SQL',
      keywords: ['healthcare', 'medical records', 'ICU', 'clinical data']
    },
    {
      id: 144,
      type: 'dataset',
      title: 'Kitti Vision Benchmark',
      description: 'Autonomous driving benchmark with stereo, optical flow, visual odometry.',
      score: 0.90,
      level: '추천',
      reason: '자율주행 알고리즘 평가의 표준 벤치마크입니다.',
      detailedReason: {
        semanticSimilarity: 0.90,
        keywordMatch: 0.88,
        citationRelevance: 0.89,
        recencyScore: 0.83,
        explanation: '실제 주행 환경의 다양한 컴퓨터 비전 작업을 위한 데이터를 제공합니다.'
      },
      url: 'http://www.cvlibs.net/datasets/kitti/',
      publisher: 'Karlsruhe Institute of Technology',
      year: 2012,
      dataSize: '175GB',
      format: 'PNG, Velodyne, Oxts',
      keywords: ['autonomous driving', 'stereo vision', 'object detection', 'benchmark']
    },
    {
      id: 145,
      type: 'dataset',
      title: 'Twitter Sentiment Analysis Dataset',
      description: 'Large collection of tweets with sentiment labels.',
      score: 0.86,
      level: '참고',
      reason: '소셜 미디어 감성 분석 연구에 유용합니다.',
      detailedReason: {
        semanticSimilarity: 0.86,
        keywordMatch: 0.84,
        citationRelevance: 0.85,
        recencyScore: 0.87,
        explanation: '160만 개의 레이블된 트윗으로 감성 분류 모델을 훈련할 수 있습니다.'
      },
      url: 'http://help.sentiment140.com/for-students',
      publisher: 'Stanford University',
      year: 2009,
      dataSize: '77MB',
      format: 'CSV',
      keywords: ['sentiment analysis', 'Twitter', 'social media', 'NLP']
    },
    {
      id: 146,
      type: 'dataset',
      title: 'Flickr30k: Image-Caption Pairs',
      description: 'Images paired with human-written descriptive captions.',
      score: 0.88,
      level: '추천',
      reason: '이미지 캡셔닝 연구의 표준 데이터셋입니다.',
      detailedReason: {
        semanticSimilarity: 0.88,
        keywordMatch: 0.86,
        citationRelevance: 0.87,
        recencyScore: 0.81,
        explanation: '31,783개 이미지와 각 5개의 캡션으로 총 158,915개 캡션을 포함합니다.'
      },
      url: 'http://shannon.cs.illinois.edu/DenotationGraph/',
      publisher: 'University of Illinois',
      year: 2014,
      dataSize: '18GB',
      format: 'JPEG, TXT',
      keywords: ['image captioning', 'vision-language', 'multimodal', 'computer vision']
    },
    {
      id: 147,
      type: 'dataset',
      title: 'UCI Machine Learning Repository',
      description: 'Collection of databases, domain theories, and data generators.',
      score: 0.87,
      level: '추천',
      reason: '교육과 연구를 위한 다양한 ML 데이터셋을 제공합니다.',
      detailedReason: {
        semanticSimilarity: 0.87,
        keywordMatch: 0.85,
        citationRelevance: 0.86,
        recencyScore: 0.90,
        explanation: '600개 이상의 다양한 분야 데이터셋으로 ML 알고리즘을 테스트할 수 있습니다.'
      },
      url: 'https://archive.ics.uci.edu/ml/',
      publisher: 'UC Irvine',
      year: 2024,
      dataSize: 'Variable',
      format: 'Various',
      keywords: ['machine learning', 'classification', 'regression', 'benchmark']
    },
    {
      id: 148,
      type: 'dataset',
      title: 'LAION-5B: Large-Scale Vision-Language Dataset',
      description: 'Massive dataset of image-text pairs from the internet.',
      score: 0.93,
      level: '가장 추천',
      reason: '대규모 멀티모달 모델 학습의 핵심 데이터셋입니다.',
      detailedReason: {
        semanticSimilarity: 0.93,
        keywordMatch: 0.91,
        citationRelevance: 0.92,
        recencyScore: 0.95,
        explanation: '58억 개의 CLIP 필터링된 이미지-텍스트 쌍을 제공합니다.'
      },
      url: 'https://laion.ai/blog/laion-5b/',
      publisher: 'LAION',
      year: 2022,
      dataSize: '240TB',
      format: 'Parquet',
      keywords: ['vision-language', 'CLIP', 'large-scale', 'multimodal']
    },
    {
      id: 149,
      type: 'dataset',
      title: 'Yelp Open Dataset',
      description: 'Business, review, and user data from Yelp.',
      score: 0.85,
      level: '참고',
      reason: '추천 시스템과 NLP 연구에 활용됩니다.',
      detailedReason: {
        semanticSimilarity: 0.85,
        keywordMatch: 0.83,
        citationRelevance: 0.84,
        recencyScore: 0.89,
        explanation: '수백만 개의 리뷰와 비즈니스 정보로 실제 추천 시스템을 구축할 수 있습니다.'
      },
      url: 'https://www.yelp.com/dataset',
      publisher: 'Yelp Inc.',
      year: 2024,
      dataSize: '10GB',
      format: 'JSON',
      keywords: ['recommendation', 'NLP', 'sentiment analysis', 'reviews']
    },
    {
      id: 150,
      type: 'dataset',
      title: 'Open Images: Annotated Image Dataset',
      description: 'Large-scale dataset with image-level labels and object bounding boxes.',
      score: 0.91,
      level: '가장 추천',
      reason: '대규모 객체 인식 연구의 필수 데이터셋입니다.',
      detailedReason: {
        semanticSimilarity: 0.91,
        keywordMatch: 0.89,
        citationRelevance: 0.90,
        recencyScore: 0.92,
        explanation: '900만 장의 이미지와 1,600만 개의 바운딩 박스를 포함합니다.'
      },
      url: 'https://storage.googleapis.com/openimages/web/index.html',
      publisher: 'Google AI',
      year: 2018,
      dataSize: '500GB',
      format: 'JPEG, CSV',
      keywords: ['object detection', 'image classification', 'computer vision', 'large-scale']
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setTrendingPapers(generateTrendingPapers());
    }, 5 * 60 * 1000); // 5분

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

  const handleChatSubmit = async () => {
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
    setIsLoading(true);
    setRecommendations([]);
    
    const agentResponse: ChatMessage = {
      type: 'agent',
      message: `"${searchQuery}"와 관련된 논문을 검색해드리겠습니다!`,
      time: new Date().toLocaleTimeString()
    };
    setChatMessages(prev => [...prev, agentResponse]);
    
    try {
      const startTime = Date.now();
      
      const { data, error } = await supabase.functions.invoke('recommend-papers', {
        body: { query: searchQuery }
      });
      
      if (error) {
        console.error('Error calling recommend-papers:', error);
        toast.error('추천 결과를 불러오는데 실패했습니다.');
        setIsLoading(false);
        return;
      }
      
      if (data && data.recommendations) {
        setRecommendations(data.recommendations);
        setResponseTime(Date.now() - startTime);
      }
    } catch (error) {
      console.error('Error in handleChatSubmit:', error);
      toast.error('추천 결과를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
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
            explanation: '입력하신 "기후변화" 키워드와 94%의 의미적 유사도를 달성했으며, 키워드 매칭률 91%로 매우 높은 관련성을 보입니다. 위성 데이터 활용 방법론이 김연구님의 연구와 직접적으로 연결되며, 최근 1년간 127회 인용으로 학계의 높은 주목을 받고 있습니다.'
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
            explanation: '김연구님의 검색어와 91%의 의미 일치도를 보이며, 키워드 매칭 89%로 연구 목적에 최적화된 데이터입니다. 2024년 최신 버전으로 실시간 API 제공(96% 최신성 점수)되어 즉시 연구에 활용 가능합니다. 127GB 규모의 포괄적 데이터로 장기 연구에 적합합니다.'
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
            explanation: '김연구님의 연구와 87%의 의미적 연관성을 가지며, 키워드 매칭 85%로 보완적 연구 자료로 활용 가능합니다. 환경 영향 평가에 대한 실무 적용 사례가 풍부하여 실질적 연구 방법론을 제공하며, 2024년 최신 연구로 최근 트렌드를 반영합니다.'
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
                            <div className="flex items-start gap-2 mb-2">
                              <a 
                                href={rec.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 min-w-0"
                              >
                                <h4 className="font-semibold text-white text-lg hover:text-blue-400 transition-colors break-words">{rec.title}</h4>
                              </a>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap ${
                                  rec.type === 'paper' ? 'bg-emerald-500 text-white' : 'bg-purple-500 text-white'
                                }`}>
                                  {rec.type === 'paper' ? '논문' : '데이터셋'}
                                </span>
                                <button
                                  onClick={() => toggleBookmark(rec)}
                                  className="p-1 hover:scale-110 transition-transform flex-shrink-0"
                                  aria-label="북마크"
                                >
                                  <Star
                                    size={20}
                                    className={bookmarkedIds.has(`${rec.title}-${rec.year}`) ? 'fill-yellow-400 text-yellow-400' : 'text-slate-400'}
                                  />
                                </button>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${getLevelColor(rec.level)}`}>
                                  {rec.level}
                                </span>
                              </div>
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

          {/* Right Panel - 왼쪽/오른쪽 분할 */}
          <div className="xl:col-span-1">
            {!hasSearched && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 오늘의 논문 - 왼쪽 */}
                <div className="bg-white rounded-xl shadow-xl border">
                <div className="p-3 border-b border-gray-200 bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-t-xl">
                  <div className="flex items-center space-x-2">
                    <div className="text-yellow-300 fill-current">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    </div>
                    <h3 className="font-semibold text-white text-sm">오늘의 논문</h3>
                  </div>
                  <p className="text-xs text-emerald-100 mt-0.5">김연구님을 위한 추천</p>
                </div>
              
              <div className="p-4">
                <div className="flex space-x-4">
                  <a 
                    href={todayPaper.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-64 bg-white rounded-lg flex-shrink-0 border-2 border-gray-200 shadow-sm p-4 flex flex-col justify-center items-center hover:border-blue-400 transition-colors" 
                    style={{aspectRatio: '1/1.414'}}
                  >
                    <div className="text-center">
                      <div className="text-[13px] font-bold text-gray-800 leading-tight mb-2" style={{fontFamily: 'Georgia, serif'}}>
                        {todayPaper.title.split(':')[0]}
                      </div>
                      <div className="text-[11px] text-gray-600 mb-2" style={{fontFamily: 'Georgia, serif'}}>
                        {todayPaper.title.includes(':') ? todayPaper.title.split(':')[1] : ''}
                      </div>
                      <div className="text-[10px] text-gray-500 font-medium mb-1" style={{fontFamily: 'Georgia, serif'}}>
                        {todayPaper.journal}
                      </div>
                      <div className="text-[9px] text-gray-400" style={{fontFamily: 'Georgia, serif'}}>
                        {todayPaper.year}
                      </div>
                    </div>
                  </a>
                  
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div>
                      <a 
                        href={todayPaper.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block group"
                      >
                        <h4 className="font-bold text-gray-900 text-base leading-tight mb-3 group-hover:text-blue-600 transition-colors">
                          {todayPaper.title}
                        </h4>
                      </a>
                      <div className="text-xs text-gray-600 mb-3" style={{fontFamily: 'Arial, sans-serif'}}>
                        <p>{todayPaper.authors}</p>
                        <p>{todayPaper.journal} • {todayPaper.year}</p>
                      </div>
                      
                      <p className="text-xs text-gray-700 mb-3 leading-relaxed">
                        {todayPaper.description}
                      </p>
                    </div>
                    
                    <div>
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-3">
                        <div className="flex items-start space-x-2">
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0"></div>
                          <p className="text-xs text-emerald-800 leading-relaxed">
                            <span className="font-medium">연구 적합성:</span> {todayPaper.reason}
                          </p>
                        </div>
                      </div>
                      
                      <a 
                        href={todayPaper.url} 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        <span>논문 보기</span>
                        <ExternalLink size={11} />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 실시간 논문 트렌드 - 오른쪽 */}
            <div className="bg-white rounded-xl shadow-xl border">
              <div className="p-3 border-b border-gray-200 bg-gradient-to-r from-slate-700 to-slate-900 rounded-t-xl">
                <div className="flex items-center space-x-2">
                  <TrendingUp size={18} className="text-slate-100" />
                  <h3 className="font-semibold text-white text-sm">실시간 논문 트렌드</h3>
                </div>
                <p className="text-xs text-slate-200 mt-0.5">HOT 논문 TOP 5</p>
              </div>
              
              <div className="p-2">
                {trendingPapers.slice(0, 5).map((paper) => {
                  const rankChange = paper.prevRank - paper.rank;
                  return (
                  <div 
                    key={paper.id} 
                    className="p-2 rounded-lg mb-1.5 last:mb-0 hover:bg-gray-50 transition-all duration-500"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-2 flex-1">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                          paper.rank === 1 ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-md transform scale-110' :
                          paper.rank === 2 ? 'bg-gradient-to-r from-gray-300 to-gray-400 text-white' :
                          'bg-gradient-to-r from-yellow-600 to-yellow-700 text-white'
                        }`}>
                          {paper.rank}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5 overflow-hidden">
                            <a 
                              href={paper.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-bold text-gray-900 hover:text-blue-600 leading-tight transition-colors flex-1 truncate"
                              title={paper.title}
                            >
                              {paper.title.length > 45 ? `${paper.title.substring(0, 45)}...` : paper.title}
                            </a>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {paper.trend === 'hot' && (
                                <span className="text-2xl animate-pulse">🔥</span>
                              )}
                              {paper.trend === 'up' && (
                                <ArrowUp size={20} className="text-emerald-500 font-bold" />
                              )}
                              {paper.trend === 'down' && (
                                <ArrowDown size={20} className="text-red-500 font-bold" />
                              )}
                              {paper.trend === 'hot' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-300 whitespace-nowrap">
                                  NEW
                                </span>
                              )}
                              {paper.rankChange > 0 && paper.trend === 'up' && (
                                <span className="text-lg font-black whitespace-nowrap text-emerald-600">
                                  +{paper.rankChange}
                                </span>
                              )}
                              {paper.rankChange > 0 && paper.trend === 'down' && (
                                <span className="text-lg font-black whitespace-nowrap text-red-600">
                                  -{paper.rankChange}
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-[10px] text-gray-500 truncate">{paper.author}</p>
                        </div>
                      </div>
                      
                      <div className="ml-2">
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
              
              <div className="p-2 bg-gray-50 rounded-b-xl">
                <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                </div>
               </div>
             </div>
              </div>
            )}
          </div>
        </div>
        
        {/* 재미있는 논문 추천 롤링 배너 */}
        {!hasSearched && (
          <div className="mt-8 bg-gradient-to-r from-sky-50 via-blue-50 to-cyan-50 rounded-xl shadow-xl border border-sky-200 overflow-hidden">
            <div className="p-4 border-b border-sky-200/50 bg-white/50">
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-gray-800">재미있는 논문 추천</h3>
              </div>
              <p className="text-xs text-gray-600 mt-1">특이하고 재미있는 주제의 연구들</p>
            </div>
            
            <div className="relative overflow-hidden py-6 bg-white/20">
              <div className="flex animate-scroll-left whitespace-nowrap">
                {funPapers.concat(funPapers).map((paper, index) => (
                  <a
                    key={index}
                    href={paper.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mx-4 bg-white rounded-lg p-4 shadow-md hover:shadow-xl transition-all hover:scale-105 w-80 flex-shrink-0"
                  >
                    <div className="space-y-2">
                      <h4 className="font-bold text-gray-900 text-base leading-tight line-clamp-2" style={{fontFamily: 'Georgia, serif'}}>
                        {paper.title}
                      </h4>
                      <p className="text-sm text-gray-600" style={{fontFamily: 'Georgia, serif'}}>
                        {paper.authors}
                      </p>
                      <p className="text-sm text-gray-500 font-medium" style={{fontFamily: 'Georgia, serif'}}>
                        {paper.journal} • {paper.year}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}
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
