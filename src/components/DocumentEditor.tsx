import { useState, useEffect, useCallback, useRef } from "react";
import { Id } from "../../convex/_generated/dataModel";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { 
  MDXEditor, 
  headingsPlugin, 
  listsPlugin,
  quotePlugin, 
  markdownShortcutPlugin, 
  toolbarPlugin, 
  UndoRedo, 
  BoldItalicUnderlineToggles,
  BlockTypeSelect, 
  ListsToggle, 
  CreateLink,
  InsertThematicBreak,
  InsertCodeBlock,
  InsertTable,
  CodeToggle,
  tablePlugin,
  thematicBreakPlugin,
  codeBlockPlugin,
  codeMirrorPlugin,
  linkPlugin,
  linkDialogPlugin,
  Separator,
  frontmatterPlugin,
  directivesPlugin,
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';
import { Tldraw, track, useEditor } from 'tldraw';
import 'tldraw/tldraw.css';

const SafeTldraw = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    const originalBeforeUnload = window.onbeforeunload;
    
    // Override the beforeunload event to prevent warnings
    window.onbeforeunload = null;
    
    const originalAddEventListener = window.addEventListener;
    window.addEventListener = function(
      type: string, 
      listener: EventListenerOrEventListenerObject, 
      options?: boolean | AddEventListenerOptions
    ) {
      if (type === 'beforeunload') {
        return;
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
    
    return () => {
      window.onbeforeunload = originalBeforeUnload;
      window.addEventListener = originalAddEventListener;
    };
  }, []);
  
  return <>{children}</>;
};

const DocumentDrawingEditor = track(({ documentId, drawingData }: { documentId: Id<"documents">, drawingData?: string }) => {
  const editor = useEditor();
  const updateDrawing = useMutation(api.documents.updateDrawing);
  const debounceTimerRef = useRef<number | null>(null);
  const initialLoadRef = useRef<boolean>(false);
  const snapshotRef = useRef<string | null>(null);

  useEffect(() => {
    if (editor && drawingData && !initialLoadRef.current) {
      try {
        console.log('Loading drawing data');
        const snapshot = JSON.parse(drawingData);
        editor.store.loadSnapshot(snapshot);
        initialLoadRef.current = true;
      } catch (error) {
        console.error('Failed to load drawing:', error);
      }
    }
  }, [editor, drawingData]);

  const saveDrawing = useCallback(() => {
    if (!editor) return;
    
    try {
      const snapshot = JSON.stringify(editor.store.getSnapshot());
      
      if (snapshot !== snapshotRef.current) {
        console.log('Saving drawing', documentId);
        updateDrawing({ 
          id: documentId,
          drawing: snapshot
        });
        snapshotRef.current = snapshot;
      }
    } catch (error) {
      console.error('Failed to save drawing:', error);
    }
  }, [editor, documentId, updateDrawing]);

  useEffect(() => {
    if (!editor) return;
    
    const handleChange = () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
      
      debounceTimerRef.current = window.setTimeout(() => {
        saveDrawing();
        debounceTimerRef.current = null;
      }, 300);
    };
    
    const handleBlur = () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      saveDrawing();
    };
    
    editor.on('change', handleChange);
    window.addEventListener('blur', handleBlur);
    
    return () => {
      editor.off('change', handleChange);
      window.removeEventListener('blur', handleBlur);
      
      saveDrawing();
      
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, [editor, saveDrawing]);

  useEffect(() => {
    if (!editor) return;
    
    const intervalId = window.setInterval(() => {
      saveDrawing();
    }, 3000);
    
    return () => {
      window.clearInterval(intervalId);
    };
  }, [editor, saveDrawing]);

  return null;
});

interface DocumentEditorProps {
  documentId: Id<"documents">;
}

export const DocumentEditor = ({ documentId }: DocumentEditorProps) => {
  const document = useQuery(api.documents.get, { id: documentId });
  const updateDocument = useMutation(api.documents.update);
  const [title, setTitle] = useState("");
  const [showDrawing, setShowDrawing] = useState(false);
  
  useEffect(() => {
    if (document) {
      setTitle(document.title);
    }
  }, [document]);
  
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };
  
  const handleTitleBlur = () => {
    if (document && title !== document.title) {
      updateDocument({ id: documentId, title });
    }
  };
  
  const handleContentChange = (content: string) => {
    updateDocument({ id: documentId, content });
  };
  
  if (!document) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }
  
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4 items-center">
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          onBlur={handleTitleBlur}
          className="flex-1 px-2 py-1 text-3xl font-bold rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Untitled"
        />
        <button
          onClick={() => setShowDrawing(!showDrawing)}
          className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200"
        >
          {showDrawing ? "Hide Drawing" : "Show Drawing"}
        </button>
      </div>
      
      {showDrawing && (
        <div className="rounded-lg border" style={{ height: '400px' }}>
          <SafeTldraw>
            <Tldraw>
              <DocumentDrawingEditor documentId={documentId} drawingData={document.drawing} />
            </Tldraw>
          </SafeTldraw>
        </div>
      )}
      
      <div className="p-4 rounded-lg border">
        <MDXEditor
          markdown={document.content ?? ""}
          onChange={handleContentChange}
          contentEditableClassName="prose prose-slate max-w-none"
          plugins={[
            headingsPlugin(),
            listsPlugin(),
            quotePlugin(),
            markdownShortcutPlugin(),
            tablePlugin(),
            thematicBreakPlugin(),
            codeBlockPlugin({ defaultCodeBlockLanguage: 'js' }),
            codeMirrorPlugin({ 
              codeBlockLanguages: { 
                js: 'JavaScript',
                ts: 'TypeScript',
                tsx: 'TSX',
                css: 'CSS',
                html: 'HTML',
                python: 'Python'
              }
            }),
            linkPlugin(),
            linkDialogPlugin(),
            frontmatterPlugin(),
            directivesPlugin(),
            toolbarPlugin({
              toolbarContents: () => (
                <>
                  <UndoRedo />
                  <Separator />
                  <BlockTypeSelect />
                  <Separator />
                  <BoldItalicUnderlineToggles />
                  <CodeToggle />
                  <Separator />
                  <ListsToggle />
                  <Separator />
                  <CreateLink />
                  <Separator />
                  <InsertTable />
                  <InsertCodeBlock />
                  <InsertThematicBreak />
                </>
              )
            })
          ]}
        />
      </div>
    </div>
  );
};
