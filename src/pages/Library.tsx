import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
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

    // 중앙 루트 노드
    newNodes.push({
      id: 'root',
      data: { label: '내 라이브러리' },
      position: { x: 400, y: 50 },
      style: {
        background: '#3b82f6',
        color: 'white',
        border: '2px solid #1e40af',
        borderRadius: '12px',
        padding: '16px 24px',
        fontSize: '18px',
        fontWeight: 'bold',
        width: 200,
      },
    });

    // 키워드별로 북마크 그룹화
    const keywordGroups = new Map<string, Bookmark[]>();
    bookmarks.forEach(bookmark => {
      if (bookmark.keywords && bookmark.keywords.length > 0) {
        bookmark.keywords.forEach(keyword => {
          if (!keywordGroups.has(keyword)) {
            keywordGroups.set(keyword, []);
          }
          keywordGroups.get(keyword)!.push(bookmark);
        });
      } else {
        // 키워드가 없는 경우 "기타"로 분류
        if (!keywordGroups.has('기타')) {
          keywordGroups.set('기타', []);
        }
        keywordGroups.get('기타')!.push(bookmark);
      }
    });

    // 키워드 노드와 북마크 노드 생성
    const keywordArray = Array.from(keywordGroups.keys());
    const angleStep = (2 * Math.PI) / keywordArray.length;
    const radius = 300;

    keywordArray.forEach((keyword, index) => {
      const angle = index * angleStep;
      const x = 500 + radius * Math.cos(angle);
      const y = 250 + radius * Math.sin(angle);

      // 키워드(대분류) 노드
      const keywordNodeId = `keyword-${keyword}`;
      newNodes.push({
        id: keywordNodeId,
        data: { label: keyword },
        position: { x, y },
        style: {
          background: '#10b981',
          color: 'white',
          border: '2px solid #059669',
          borderRadius: '10px',
          padding: '12px 20px',
          fontSize: '15px',
          fontWeight: '600',
          minWidth: 120,
        },
      });

      // 루트에서 키워드로 엣지
      newEdges.push({
        id: `edge-root-${keywordNodeId}`,
        source: 'root',
        target: keywordNodeId,
        animated: true,
        style: { stroke: '#3b82f6', strokeWidth: 2 },
      });

      // 각 키워드의 북마크 노드들
      const papers = keywordGroups.get(keyword) || [];
      papers.forEach((paper, paperIndex) => {
        const paperAngle = angle + (paperIndex - papers.length / 2) * 0.3;
        const paperRadius = radius + 200;
        const paperX = 500 + paperRadius * Math.cos(paperAngle);
        const paperY = 250 + paperRadius * Math.sin(paperAngle);

        const paperNodeId = `paper-${paper.id}`;
        newNodes.push({
          id: paperNodeId,
          data: {
            label: (
              <div className="text-left">
                <div className="font-semibold text-xs mb-1 line-clamp-2">{paper.title}</div>
                <div className="text-xs opacity-80">{paper.year}</div>
              </div>
            ),
          },
          position: { x: paperX, y: paperY },
          style: {
            background: 'white',
            border: '2px solid #e5e7eb',
            borderRadius: '8px',
            padding: '10px',
            fontSize: '12px',
            width: 180,
            cursor: 'pointer',
          },
        });

        // 키워드에서 논문으로 엣지
        newEdges.push({
          id: `edge-${keywordNodeId}-${paperNodeId}`,
          source: keywordNodeId,
          target: paperNodeId,
          style: { stroke: '#10b981', strokeWidth: 1.5 },
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
    <div className="min-h-screen bg-background">
      <Header responseTime={null} showMetrics={false} onToggleMetrics={() => {}} />
      
      <div className="h-[calc(100vh-80px)]">
        <div className="absolute top-24 left-6 z-10 bg-card rounded-xl border border-border p-4 shadow-lg">
          <div className="flex items-center gap-4 mb-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">내 라이브러리</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {bookmarks.length}개의 북마크
              </p>
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
                if (node.id === 'root') return '#3b82f6';
                if (node.id.startsWith('keyword')) return '#10b981';
                return '#e5e7eb';
              }}
              style={{ background: '#f9fafb' }}
            />
            <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
          </ReactFlow>
        )}
      </div>
    </div>
  );
};

export default Library;
