import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { LibrarySidebar } from '@/components/LibrarySidebar';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';

interface Bookmark {
  id: string;
  title: string;
  authors: string[];
  year: number;
  journal: string;
  url: string;
  category_id: string | null;
  keywords: string[];
}

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  position_x: number;
  position_y: number;
}

const Library = () => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
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
    loadData(session.user.id);
  };

  const loadData = async (userId: string) => {
    try {
      const [bookmarksRes, categoriesRes] = await Promise.all([
        supabase.from('bookmarks').select('*').eq('user_id', userId),
        supabase.from('bookmark_categories').select('*').eq('user_id', userId),
      ]);

      if (bookmarksRes.error) throw bookmarksRes.error;
      if (categoriesRes.error) throw categoriesRes.error;

      setBookmarks(bookmarksRes.data || []);
      setCategories(categoriesRes.data || []);
      
      // 마인드맵 노드와 엣지 생성
      createMindMap(bookmarksRes.data || [], categoriesRes.data || []);
    } catch (error: any) {
      toast.error('데이터를 불러오는데 실패했습니다.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const createMindMap = (bookmarks: Bookmark[], categories: Category[]) => {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    // 키워드별로 북마크 그룹화 (한국어 번역 포함)
    const keywordTranslation: Record<string, string> = {
      'climate': '기후',
      'climate change': '기후변화',
      'deep learning': '딥러닝',
      'machine learning': '머신러닝',
      'satellite data': '위성 데이터',
      'AI': '인공지능',
      'quantum computing': '양자 컴퓨팅',
      'biotechnology': '생명공학',
      'CRISPR': '유전자 편집',
      'gene editing': '유전자 편집',
      'neural networks': '신경망',
      'computer vision': '컴퓨터 비전',
      'NLP': '자연어 처리',
      'reinforcement learning': '강화학습',
      'robotics': '로봇공학',
      'transformer': '트랜스포머',
      'attention mechanism': '어텐션 메커니즘',
      'BERT': 'BERT',
      'language models': '언어 모델',
      'ResNet': 'ResNet',
      'GAN': 'GAN',
      'generative models': '생성 모델',
      'adversarial training': '적대적 학습',
      'AlexNet': 'AlexNet',
      'CNN': 'CNN',
      'ImageNet': 'ImageNet',
      'AlphaGo': '알파고',
      'MCTS': '몬테카를로 트리 탐색',
      'Adam': 'Adam 옵티마이저',
      'optimization': '최적화',
      'batch normalization': '배치 정규화',
      'dropout': '드롭아웃',
      'regularization': '정규화',
      'overfitting': '과적합',
      'prediction': '예측',
      'genomics': '유전체학',
      'genetics': '유전학',
      'bioinformatics': '생물정보학',
      'remote sensing': '원격 탐사',
      'earth observation': '지구 관측',
      'medical imaging': '의료 영상',
      'radiology': '방사선학',
      'healthcare AI': '헬스케어 AI',
      'speech recognition': '음성 인식',
      'ASR': '자동 음성 인식',
      'audio processing': '오디오 처리',
      'time series': '시계열',
      'forecasting': '예측',
      'LSTM': 'LSTM',
      'self-supervised': '자기지도 학습',
      'contrastive learning': '대조 학습',
      'edge AI': '엣지 AI',
      'IoT': '사물인터넷',
      'model compression': '모델 압축',
      'meta-learning': '메타학습',
      'few-shot': '퓨샷 학습',
      'MAML': 'MAML',
      'adversarial': '적대적',
      'robustness': '강건성',
      'security': '보안',
      'NeRF': 'NeRF',
      'neural rendering': '신경 렌더링',
      '3D reconstruction': '3D 재구성',
      'continual learning': '지속 학습',
      'lifelong learning': '평생 학습',
      'catastrophic forgetting': '치명적 망각',
    };

    const keywordGroups = new Map<string, Bookmark[]>();
    bookmarks.forEach(bookmark => {
      if (bookmark.keywords && bookmark.keywords.length > 0) {
        bookmark.keywords.forEach(keyword => {
          const translatedKeyword = keywordTranslation[keyword] || keyword;
          if (!keywordGroups.has(translatedKeyword)) {
            keywordGroups.set(translatedKeyword, []);
          }
          keywordGroups.get(translatedKeyword)!.push(bookmark);
        });
      } else {
        if (!keywordGroups.has('기타')) {
          keywordGroups.set('기타', []);
        }
        keywordGroups.get('기타')!.push(bookmark);
      }
    });

    // 키워드가 없으면 빈 마인드맵 표시
    if (keywordGroups.size === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    // 각 키워드를 독립적인 마인드맵의 중심으로 설정 (간결하게)
    const keywordArray = Array.from(keywordGroups.keys()).slice(0, 12); // 최대 12개만 표시
    const mapsPerRow = 4; // 한 행에 4개로 증가
    const mapSpacing = 450; // 간격 축소
    const verticalSpacing = 350; // 수직 간격 축소

    keywordArray.forEach((keyword, keywordIndex) => {
      const row = Math.floor(keywordIndex / mapsPerRow);
      const col = keywordIndex % mapsPerRow;
      const centerX = col * mapSpacing + 200;
      const centerY = row * verticalSpacing + 150;

      // 키워드(중심) 노드 - 더 작고 간결하게
      const keywordNodeId = `keyword-${keyword}`;
      newNodes.push({
        id: keywordNodeId,
        data: { label: keyword },
        position: { x: centerX, y: centerY },
        style: {
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          border: '2px solid #5a67d8',
          borderRadius: '12px',
          padding: '12px 20px',
          fontSize: '16px',
          fontWeight: 'bold',
          minWidth: 120,
          boxShadow: '0 6px 15px rgba(102, 126, 234, 0.25)',
        },
      });

      // 각 키워드의 북마크 노드들을 원형으로 배치 (최대 6개만)
      const papers = (keywordGroups.get(keyword) || []).slice(0, 6);
      const radius = 180; // 반지름 축소
      const angleStep = (2 * Math.PI) / papers.length;

      papers.forEach((paper, paperIndex) => {
        const angle = paperIndex * angleStep - Math.PI / 2;
        const paperX = centerX + radius * Math.cos(angle);
        const paperY = centerY + radius * Math.sin(angle);

        const paperNodeId = `paper-${paper.id}`;
        newNodes.push({
          id: paperNodeId,
          data: {
            label: (
              <div className="text-left">
                <div className="font-semibold text-xs mb-1 line-clamp-2 leading-tight">{paper.title}</div>
                <div className="text-[10px] opacity-75">{paper.year}</div>
              </div>
            ),
          },
          position: { x: paperX, y: paperY },
          style: {
            background: 'white',
            border: '2px solid #cbd5e0',
            borderRadius: '8px',
            padding: '10px',
            fontSize: '12px',
            width: 160,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
            transition: 'all 0.2s ease',
          },
        });

        // 키워드에서 논문으로 엣지 - 더 얇고 간결하게
        newEdges.push({
          id: `edge-${keywordNodeId}-${paperNodeId}`,
          source: keywordNodeId,
          target: paperNodeId,
          animated: false,
          style: { 
            stroke: '#667eea', 
            strokeWidth: 1.5,
          },
        });
      });
    });

    setNodes(newNodes);
    setEdges(newEdges);
  };

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (node.id.startsWith('paper-')) {
      const paperId = node.id.replace('paper-', '');
      const paper = bookmarks.find(b => b.id === paperId);
      if (paper && paper.url) {
        window.open(paper.url, '_blank');
      }
    }
  }, [bookmarks]);

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
    <SidebarProvider>
      <div className="min-h-screen bg-background flex w-full">
        <LibrarySidebar bookmarks={bookmarks} onCategoryClick={setSelectedCategory} />
        
        <div className="flex-1 flex flex-col">
          <Header responseTime={null} showMetrics={false} onToggleMetrics={() => {}} />
          
          <div className="h-[calc(100vh-80px)] relative">
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
              <SidebarTrigger />
              <div className="bg-card rounded-xl border border-border px-4 py-2 shadow-lg">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate('/')}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div>
                    <h1 className="text-xl font-bold text-foreground">내 라이브러리</h1>
                    <p className="text-xs text-muted-foreground">
                      {bookmarks.length}개의 북마크
                      {selectedCategory && ` • ${selectedCategory}`}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {bookmarks.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-muted-foreground mb-4">
                    아직 북마크한 논문이 없습니다.
                  </p>
                  <Button onClick={() => navigate('/')}>논문 찾아보기</Button>
                </div>
              </div>
            ) : (
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={onNodeClick}
                fitView
                attributionPosition="bottom-left"
              >
                <Controls />
                <MiniMap 
                  nodeColor={(node) => {
                    if (node.id.startsWith('keyword')) return '#667eea';
                    return '#e5e7eb';
                  }}
                  style={{ background: '#f9fafb' }}
                />
                <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
              </ReactFlow>
            )}
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Library;
