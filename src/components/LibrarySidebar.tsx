import React from 'react';
import { BookOpen, ChevronDown, ChevronRight, FolderOpen, FileText } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

interface Bookmark {
  id: string;
  title: string;
  keywords: string[];
}

interface Category {
  name: string;
  subcategories: string[];
  papers: Bookmark[];
}

interface LibrarySidebarProps {
  bookmarks: Bookmark[];
  onCategoryClick: (category: string) => void;
}

export function LibrarySidebar({ bookmarks, onCategoryClick }: LibrarySidebarProps) {
  const { open } = useSidebar();
  const [expandedCategories, setExpandedCategories] = React.useState<Set<string>>(new Set());

  // 키워드를 대주제로 그룹화
  const mainCategories: Record<string, string[]> = {
    'AI & 머신러닝': ['deep learning', 'machine learning', 'neural networks', 'transformer', 'BERT', 'GAN', 'CNN', 'ResNet', 'AlexNet'],
    '컴퓨터 비전': ['computer vision', 'image recognition', 'object detection', 'ImageNet', 'YOLO', 'segmentation'],
    '자연어 처리': ['NLP', 'language models', 'attention mechanism', 'translation', 'sentiment analysis'],
    '강화학습': ['reinforcement learning', 'AlphaGo', 'MCTS', 'policy gradient', 'Q-learning'],
    '최적화': ['optimization', 'Adam', 'gradient descent', 'batch normalization', 'dropout', 'regularization'],
    '생명과학': ['genomics', 'genetics', 'bioinformatics', 'protein', 'CRISPR', 'gene editing', 'biotechnology'],
    '기후 & 환경': ['climate', 'climate change', 'earth observation', 'remote sensing', 'satellite'],
    '의료 & 헬스케어': ['medical imaging', 'radiology', 'healthcare AI', 'diagnosis', 'treatment'],
    '데이터 분석': ['time series', 'forecasting', 'prediction', 'statistics', 'data mining'],
    '기타': []
  };

  // 북마크를 카테고리별로 분류
  const categorizedBookmarks: Record<string, Bookmark[]> = {};
  Object.keys(mainCategories).forEach(cat => {
    categorizedBookmarks[cat] = [];
  });

  bookmarks.forEach(bookmark => {
    let assigned = false;
    if (bookmark.keywords && bookmark.keywords.length > 0) {
      for (const [mainCat, keywords] of Object.entries(mainCategories)) {
        if (keywords.some(kw => bookmark.keywords.some(bkw => 
          bkw.toLowerCase().includes(kw.toLowerCase()) || kw.toLowerCase().includes(bkw.toLowerCase())
        ))) {
          categorizedBookmarks[mainCat].push(bookmark);
          assigned = true;
          break;
        }
      }
    }
    if (!assigned) {
      categorizedBookmarks['기타'].push(bookmark);
    }
  });

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  return (
    <Sidebar className={open ? "w-72" : "w-16"} collapsible="icon">
      <SidebarContent className="bg-card">
        <SidebarGroup>
          <SidebarGroupLabel className="text-base font-bold flex items-center gap-2 text-foreground px-4 py-3">
            {open && (
              <>
                <BookOpen className="w-5 h-5" />
                <span>논문 카테고리</span>
              </>
            )}
            {!open && <BookOpen className="w-5 h-5 mx-auto" />}
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {Object.entries(categorizedBookmarks)
                .filter(([_, papers]) => papers.length > 0)
                .map(([category, papers]) => (
                  <SidebarMenuItem key={category}>
                    <div className="flex flex-col">
                      <SidebarMenuButton
                        onClick={() => {
                          toggleCategory(category);
                          onCategoryClick(category);
                        }}
                        className="w-full justify-between hover:bg-accent"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FolderOpen className="w-4 h-4 flex-shrink-0 text-primary" />
                          {open && (
                            <span className="font-medium truncate">{category}</span>
                          )}
                        </div>
                        {open && (
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                              {papers.length}
                            </span>
                            {expandedCategories.has(category) ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </div>
                        )}
                      </SidebarMenuButton>

                      {open && expandedCategories.has(category) && (
                        <div className="ml-6 mt-1 space-y-1">
                          {papers.slice(0, 5).map(paper => (
                            <div
                              key={paper.id}
                              className="text-xs text-muted-foreground py-1.5 px-2 hover:bg-accent rounded-md cursor-pointer flex items-start gap-2"
                            >
                              <FileText className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              <span className="line-clamp-2 leading-tight">{paper.title}</span>
                            </div>
                          ))}
                          {papers.length > 5 && (
                            <div className="text-xs text-muted-foreground py-1 px-2">
                              +{papers.length - 5}개 더보기
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
