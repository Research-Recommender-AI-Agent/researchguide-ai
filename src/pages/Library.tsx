import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';

interface Bookmark {
  id: string;
  title: string;
  authors: string[];
  year: number;
  journal: string;
  url: string;
  category_id: string | null;
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
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLDivElement>(null);

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
    } catch (error: any) {
      toast.error('데이터를 불러오는데 실패했습니다.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryBookmarks = (categoryId: string) => {
    return bookmarks.filter((b) => b.category_id === categoryId);
  };

  const getChildCategories = (parentId: string | null) => {
    return categories.filter((c) => c.parent_id === parentId);
  };

  const renderCategory = (category: Category, level: number = 0) => {
    const childCategories = getChildCategories(category.id);
    const categoryBookmarks = getCategoryBookmarks(category.id);

    return (
      <div
        key={category.id}
        className="mb-6"
        style={{ marginLeft: `${level * 40}px` }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-4 h-4 rounded-full bg-primary"></div>
          <h3 className="text-lg font-semibold text-foreground">{category.name}</h3>
          <span className="text-sm text-muted-foreground">
            ({categoryBookmarks.length}개)
          </span>
        </div>

        {categoryBookmarks.length > 0 && (
          <div className="ml-7 space-y-2 mb-4">
            {categoryBookmarks.map((bookmark) => (
              <div
                key={bookmark.id}
                className="bg-card border border-border rounded-lg p-3 hover:shadow-md transition-shadow"
              >
                <a
                  href={bookmark.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-foreground hover:text-primary"
                >
                  {bookmark.title}
                </a>
                <p className="text-xs text-muted-foreground mt-1">
                  {bookmark.authors?.join(', ')} ({bookmark.year})
                </p>
              </div>
            ))}
          </div>
        )}

        {childCategories.map((child) => renderCategory(child, level + 1))}
      </div>
    );
  };

  const uncategorizedBookmarks = bookmarks.filter((b) => !b.category_id);
  const rootCategories = getChildCategories(null);

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
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">내 라이브러리</h1>
              <p className="text-muted-foreground mt-1">
                북마크한 논문들을 주제별로 정리했습니다
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-8" ref={canvasRef}>
          {rootCategories.length === 0 && uncategorizedBookmarks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                아직 북마크한 논문이 없습니다.
              </p>
              <Button onClick={() => navigate('/')}>논문 찾아보기</Button>
            </div>
          ) : (
            <>
              {rootCategories.map((category) => renderCategory(category))}

              {uncategorizedBookmarks.length > 0 && (
                <div className="mt-8 pt-8 border-t border-border">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-4 h-4 rounded-full bg-muted"></div>
                    <h3 className="text-lg font-semibold text-foreground">미분류</h3>
                    <span className="text-sm text-muted-foreground">
                      ({uncategorizedBookmarks.length}개)
                    </span>
                  </div>
                  <div className="ml-7 space-y-2">
                    {uncategorizedBookmarks.map((bookmark) => (
                      <div
                        key={bookmark.id}
                        className="bg-card border border-border rounded-lg p-3 hover:shadow-md transition-shadow"
                      >
                        <a
                          href={bookmark.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-foreground hover:text-primary"
                        >
                          {bookmark.title}
                        </a>
                        <p className="text-xs text-muted-foreground mt-1">
                          {bookmark.authors?.join(', ')} ({bookmark.year})
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Library;
